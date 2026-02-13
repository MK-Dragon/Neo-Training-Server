package com.example.nts_app.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.nts_app.ServerConfig
import com.example.nts_app.SettingsManager
import com.example.nts_app.network.RetrofitClient

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val settingsManager = remember { SettingsManager(context) }

    var servers by remember { mutableStateOf(settingsManager.getServers()) }
    var currentName by remember { mutableStateOf(settingsManager.getCurrentServerName()) }

    var showAddDialog by remember { mutableStateOf(false) }
    var serverToEdit by remember { mutableStateOf<ServerConfig?>(null) }
    var serverToDelete by remember { mutableStateOf<ServerConfig?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Server Management") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, null) }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add")
            }
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
            items(servers) { server ->
                val isActive = currentName == server.name

                ListItem(
                    headlineContent = { Text(server.name, fontWeight = FontWeight.Bold) },
                    supportingContent = { Text(server.ip) },
                    leadingContent = {
                        Icon(
                            imageVector = Icons.Default.Dns,
                            contentDescription = null,
                            tint = if (isActive) MaterialTheme.colorScheme.primary else Color.Gray
                        )
                    },
                    trailingContent = {
                        Row {
                            IconButton(onClick = { serverToEdit = server }) {
                                Icon(Icons.Default.Edit, "Edit", tint = MaterialTheme.colorScheme.primary)
                            }
                            IconButton(onClick = { serverToDelete = server }) {
                                Icon(Icons.Default.Delete, "Delete", tint = Color(0xFFD32F2F))
                            }
                        }
                    },
                    /*modifier = Modifier.clickable {
                        settingsManager.setCurrentServer(server)
                        RetrofitClient.updateBaseUrl(server.ip)
                        currentName = server.name
                    },*/
                    colors = ListItemDefaults.colors(
                        containerColor = if (isActive) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                        else Color.Transparent
                    )
                )
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), thickness = 0.5.dp)
            }
        }
    }

    // --- DIALOGS ---

    if (showAddDialog) {
        ServerFormDialog(
            title = "Add Server",
            onDismiss = { showAddDialog = false },
            onSave = { name, ip ->
                settingsManager.addServer(name, ip)
                servers = settingsManager.getServers()
                showAddDialog = false
            }
        )
    }

    serverToEdit?.let { server ->
        ServerFormDialog(
            title = "Edit Server",
            initialName = server.name,
            initialIp = server.ip,
            onDismiss = { serverToEdit = null },
            onSave = { name, ip ->
                settingsManager.editServer(server.name, name, ip)
                servers = settingsManager.getServers()
                currentName = settingsManager.getCurrentServerName()
                serverToEdit = null
            }
        )
    }

    serverToDelete?.let { server ->
        AlertDialog(
            onDismissRequest = { serverToDelete = null },
            title = { Text("Delete Server") },
            text = { Text("Are you sure you want to delete '${server.name}'?") },
            confirmButton = {
                TextButton(onClick = {
                    settingsManager.deleteServer(server.name)
                    servers = settingsManager.getServers()
                    currentName = settingsManager.getCurrentServerName()
                    serverToDelete = null
                }) { Text("Delete", color = Color.Red) }
            },
            dismissButton = {
                TextButton(onClick = { serverToDelete = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun ServerFormDialog(
    title: String,
    initialName: String = "",
    initialIp: String = "",
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var ip by remember { mutableStateOf(initialIp) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Server Name") })
                OutlinedTextField(value = ip, onValueChange = { ip = it }, label = { Text("IP Address") })
            }
        },
        confirmButton = {
            Button(onClick = { onSave(name, ip) }, enabled = name.isNotBlank() && ip.isNotBlank()) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}