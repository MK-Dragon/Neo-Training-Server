package com.example.nts_app.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.nts_app.UserViewModel
import com.example.nts_app.SettingsManager
import com.example.nts_app.network.RetrofitClient

/**
 * Helper to validate IP/Hostname format (No spaces, valid chars only)
 */
fun isValidIpOrHostname(input: String): Boolean {
    val trimmed = input.trim()
    if (trimmed.isEmpty() || trimmed.contains(" ")) return false

    // 1. If it looks like an IP (contains only digits and dots)
    if (trimmed.all { it.isDigit() || it == '.' }) {
        val parts = trimmed.split(".")
        if (parts.size != 4) return false
        return parts.all { part ->
            part.isNotEmpty() && part.toIntOrNull()?.let { it in 0..255 } == true
        }
    }

    // 2. If it's a hostname (localhost, etc.)
    val hostRegex = "^[a-zA-Z0-9.-]+$".toRegex()
    return hostRegex.matches(trimmed)
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(viewModel: UserViewModel, onLoginSuccess: () -> Unit) {
    val context = LocalContext.current
    val settingsManager = remember { SettingsManager(context) }

    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    // Server State
    var currentServerName by remember { mutableStateOf(settingsManager.getCurrentServerName()) }
    var showServerModal by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }

    val sheetState = rememberModalBottomSheetState()

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (viewModel.isWaitingFor2FA) {
                Text("Check Your Email", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                CircularProgressIndicator()
                Text("Verification code sent to your inbox", color = Color.Gray)
                Spacer(modifier = Modifier.height(24.dp))
                TextButton(onClick = { viewModel.isWaitingFor2FA = false }) { Text("Back to Login") }
            } else {
                Text(text = "Login", fontSize = 32.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(24.dp))

                if (viewModel.errorMessage.isNotEmpty()) {
                    Text(text = viewModel.errorMessage, color = Color.Red, modifier = Modifier.padding(bottom = 8.dp))
                }

                TextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                TextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (currentServerName != null) {
                            viewModel.handleLogin(username, password, onLoginSuccess)
                        } else {
                            showServerModal = true
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    enabled = !viewModel.isLoading && username.isNotEmpty() && password.isNotEmpty()
                ) {
                    if (viewModel.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Login")
                    }
                }
            }
        }

        // --- SERVER CARD AT BOTTOM ---
        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
                .fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Connection", style = MaterialTheme.typography.labelSmall)
                    Text(
                        text = currentServerName ?: "No server selected",
                        fontWeight = FontWeight.Bold,
                        color = if (currentServerName == null) Color.Red else Color.Unspecified
                    )
                }
                Button(
                    onClick = { showServerModal = true },
                    contentPadding = PaddingValues(horizontal = 12.dp)
                ) {
                    Text("Change", fontSize = 12.sp)
                }
            }
        }
    }

    // --- SERVER SELECTION MODAL ---
    if (showServerModal) {
        ModalBottomSheet(
            onDismissRequest = { showServerModal = false },
            sheetState = sheetState
        ) {
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                Text("Select Server", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))

                val servers = settingsManager.getServers()

                if (servers.isEmpty()) {
                    Text("No servers saved.", color = Color.Gray, modifier = Modifier.padding(vertical = 8.dp))
                }

                servers.forEach { server ->
                    val isCurrent = currentServerName == server.name
                    val isIpValid = isValidIpOrHostname(server.ip)

                    ListItem(
                        headlineContent = { Text(server.name) },
                        supportingContent = { Text(server.ip) },
                        leadingContent = {
                            Icon(
                                Icons.Default.Dns,
                                contentDescription = null,
                                tint = if (isCurrent) Color.Green else Color.Gray
                            )
                        },
                        trailingContent = {
                            if (!isIpValid) {
                                Icon(Icons.Default.Error, "Invalid IP", tint = Color.Red)
                            } else if (isCurrent) {
                                Icon(Icons.Default.Check, "Active", tint = Color.Green)
                            }
                        },
                        modifier = Modifier.clickable {
                            if (isIpValid) {
                                settingsManager.setCurrentServer(server)
                                RetrofitClient.updateBaseUrl(server.ip)
                                currentServerName = server.name
                                showServerModal = false
                            }
                        }
                    )
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                TextButton(
                    onClick = { showAddDialog = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Add New Server")
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    // --- ADD SERVER DIALOG ---
    if (showAddDialog) {
        var newName by remember { mutableStateOf("") }
        var newIp by remember { mutableStateOf("") }
        val isIpValid = isValidIpOrHostname(newIp)

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Server") },
            text = {
                Column {
                    OutlinedTextField(
                        value = newName,
                        onValueChange = { newName = it },
                        label = { Text("Server Name") },
                        singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newIp,
                        onValueChange = { newIp = it.replace(" ", "") }, // Force remove spaces
                        label = { Text("IP Address / Host") },
                        isError = !isIpValid && newIp.isNotEmpty(),
                        supportingText = {
                            if (!isIpValid && newIp.isNotEmpty()) {
                                Text("Invalid format (no spaces)", color = Color.Red)
                            }
                        },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        settingsManager.addServer(newName.trim(), newIp.trim())
                        showAddDialog = false
                    },
                    enabled = newName.isNotBlank() && isIpValid
                ) { Text("Add") }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) { Text("Cancel") }
            }
        )
    }
}