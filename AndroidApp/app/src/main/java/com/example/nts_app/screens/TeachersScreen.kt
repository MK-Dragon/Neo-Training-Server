package com.example.nts_app.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.nts_app.network.RetrofitClient
import com.example.nts_app.network.TeacherModuleHistoryDTO
import com.example.nts_app.network.UserSimple
import com.example.nts_app.network.AppUser // Your detailed User class from API

enum class SortOrder {
    ASCENDING, DESCENDING
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeachersScreen(onBack: () -> Unit) {
    var teachers by remember { mutableStateOf<List<UserSimple>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var sortOrder by remember { mutableStateOf(SortOrder.ASCENDING) }
    var showSortMenu by remember { mutableStateOf(false) }

    // Detail State
    val sheetState = rememberModalBottomSheetState()
    var showSheet by remember { mutableStateOf(false) }
    var selectedTeacher by remember { mutableStateOf<UserSimple?>(null) }
    var detailedUser by remember { mutableStateOf<AppUser?>(null) }
    var history by remember { mutableStateOf<List<TeacherModuleHistoryDTO>>(emptyList()) }
    var isLoadingDetails by remember { mutableStateOf(false) }

    val sortedTeachers = remember(teachers, sortOrder) {
        if (sortOrder == SortOrder.ASCENDING) teachers.sortedBy { it.username.lowercase() }
        else teachers.sortedByDescending { it.username.lowercase() }
    }

    // Load initial list
    LaunchedEffect(Unit) {
        try {
            teachers = RetrofitClient.apiService.getTeachers()
        } catch (e: Exception) { e.printStackTrace() }
        finally { isLoading = false }
    }

    // Load Teacher Details (Email + History) when one is selected
    LaunchedEffect(selectedTeacher) {
        selectedTeacher?.let { teacher ->
            isLoadingDetails = true
            detailedUser = null // Reset previous
            try {
                // 1. Get detailed profile for the email
                val profileRes = RetrofitClient.apiService.getUserProfile(teacher.username)
                if (profileRes.isSuccessful) {
                    detailedUser = profileRes.body()
                }
                // 2. Get history
                history = RetrofitClient.apiService.getTeacherHistory(teacher.userId)
            } catch (e: Exception) { e.printStackTrace() }
            finally { isLoadingDetails = false }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Teachers") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { showSortMenu = true }) { Icon(Icons.Default.SortByAlpha, null) }
                    DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                        DropdownMenuItem(
                            text = { Text("A to Z") },
                            onClick = { sortOrder = SortOrder.ASCENDING; showSortMenu = false }
                        )
                        DropdownMenuItem(
                            text = { Text("Z to A") },
                            onClick = { sortOrder = SortOrder.DESCENDING; showSortMenu = false }
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
                items(sortedTeachers) { teacher ->
                    ListItem(
                        headlineContent = { Text(teacher.username, fontWeight = FontWeight.Bold) },
                        supportingContent = { Text("Teacher ID: ${teacher.userId}") },
                        leadingContent = {
                            // Show teacher's profile image in the list
                            AsyncImage(
                                model = "https://192.168.0.214:7089/api/DownloadUpload/profile-image/${teacher.userId}",
                                contentDescription = null,
                                modifier = Modifier.size(45.dp).clip(CircleShape).border(1.dp, MaterialTheme.colorScheme.outline, CircleShape),
                                contentScale = ContentScale.Crop,
                                error = painterResource(id = android.R.drawable.ic_menu_gallery)
                            )
                        },
                        trailingContent = { Icon(Icons.Default.ChevronRight, null) },
                        modifier = Modifier.clickable {
                            selectedTeacher = teacher
                            showSheet = true
                        }
                    )
                    HorizontalDivider()
                }
            }
        }

        if (showSheet) {
            ModalBottomSheet(onDismissRequest = { showSheet = false }, sheetState = sheetState) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp).padding(bottom = 32.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = "https://192.168.0.214:7089/api/DownloadUpload/profile-image/${selectedTeacher?.userId}",
                            contentDescription = null,
                            modifier = Modifier.size(80.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(text = selectedTeacher?.username ?: "", style = MaterialTheme.typography.headlineSmall)

                            if (isLoadingDetails) {
                                LinearProgressIndicator(modifier = Modifier.width(100.dp))
                            } else {
                                // HERE IS THE EMAIL FROM THE DETAILED CLASS
                                Text(
                                    text = detailedUser?.email ?: "No email available",
                                    color = MaterialTheme.colorScheme.primary,
                                    style = MaterialTheme.typography.bodyLarge
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Teaching History", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (isLoadingDetails) {
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(history) { item ->
                                Card(modifier = Modifier.fillMaxWidth()) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(item.moduleName, fontWeight = FontWeight.Bold)
                                        Text("Course: ${item.courseName}", style = MaterialTheme.typography.bodySmall)
                                        Text("${item.hoursTaught} Hours", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
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