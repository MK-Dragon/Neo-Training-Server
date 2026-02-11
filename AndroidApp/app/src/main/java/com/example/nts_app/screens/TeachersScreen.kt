package com.example.nts_app.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.nts_app.network.RetrofitClient
import com.example.nts_app.network.TeacherModuleHistoryDTO
import com.example.nts_app.network.UserSimple

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeachersScreen(onBack: () -> Unit) {
    var teachers by remember { mutableStateOf<List<UserSimple>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // State for Modal
    val sheetState = rememberModalBottomSheetState()
    var showSheet by remember { mutableStateOf(false) }
    var selectedTeacher by remember { mutableStateOf<UserSimple?>(null) }
    var history by remember { mutableStateOf<List<TeacherModuleHistoryDTO>>(emptyList()) }
    var isLoadingHistory by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            teachers = RetrofitClient.apiService.getTeachers()
        } catch (e: Exception) { /* Log Error */ }
        finally { isLoading = false }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Teachers List") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") }
                }
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
                items(teachers) { teacher ->
                    ListItem(
                        headlineContent = { Text(teacher.username, fontWeight = FontWeight.Bold) },
                        supportingContent = { Text("ID: ${teacher.userId}") },
                        leadingContent = { Icon(Icons.Default.Person, null, modifier = Modifier.size(40.dp)) },
                        trailingContent = { Icon(Icons.Default.ChevronRight, null) },
                        modifier = Modifier.clickable {
                            selectedTeacher = teacher
                            showSheet = true
                            // Fetch history for this teacher
                            isLoadingHistory = true
                            history = emptyList()
                            // Trigger history fetch in a separate coroutine
                        }
                    )
                    HorizontalDivider()
                }
            }
        }

        // --- Fetch History when a teacher is selected ---
        LaunchedEffect(selectedTeacher) {
            selectedTeacher?.let {
                try {
                    history = RetrofitClient.apiService.getTeacherHistory(it.userId)
                } catch (e: Exception) { history = emptyList() }
                finally { isLoadingHistory = false }
            }
        }

        // --- Modal Bottom Sheet (The "Modal") ---
        if (showSheet) {
            ModalBottomSheet(
                onDismissRequest = { showSheet = false },
                sheetState = sheetState
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp).padding(bottom = 32.dp)) {
                    Text(
                        text = "${selectedTeacher?.username}'s Teaching History",
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    if (isLoadingHistory) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    } else if (history.isEmpty()) {
                        Text("No history found for this teacher.", color = MaterialTheme.colorScheme.secondary)
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(history) { item ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(item.moduleName, fontWeight = FontWeight.Bold)
                                        Text("Course: ${item.courseName}", style = MaterialTheme.typography.bodySmall)
                                        Text("Total: ${item.hoursTaught} Hours", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}