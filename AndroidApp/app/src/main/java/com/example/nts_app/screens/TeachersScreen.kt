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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.nts_app.network.RetrofitClient
import com.example.nts_app.network.TeacherModuleHistoryDTO
import com.example.nts_app.network.UserSimple
import com.example.nts_app.network.AppUser // Your detailed User class from API
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.OutlinedTextField

import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalContext
import coil.request.ImageRequest
import com.example.nts_app.R // Replace with your actual project package name

enum class SortOrder {
    ASCENDING, DESCENDING
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeachersScreen(onBack: () -> Unit) {
    var teachers by remember { mutableStateOf<List<UserSimple>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") } // Search State
    var sortOrder by remember { mutableStateOf(SortOrder.ASCENDING) }
    var showSortMenu by remember { mutableStateOf(false) }

    // Detail State
    val sheetState = rememberModalBottomSheetState()
    var showSheet by remember { mutableStateOf(false) }
    var selectedTeacher by remember { mutableStateOf<UserSimple?>(null) }
    var detailedUser by remember { mutableStateOf<AppUser?>(null) }
    var history by remember { mutableStateOf<List<TeacherModuleHistoryDTO>>(emptyList()) }
    var isLoadingDetails by remember { mutableStateOf(false) }

    // Filter AND Sort Logic
    val filteredTeachers = remember(teachers, sortOrder, searchQuery) {
        val filtered = if (searchQuery.isEmpty()) {
            teachers
        } else {
            teachers.filter { it.username.contains(searchQuery, ignoreCase = true) }
        }

        if (sortOrder == SortOrder.ASCENDING) filtered.sortedBy { it.username.lowercase() }
        else filtered.sortedByDescending { it.username.lowercase() }
    }

    LaunchedEffect(Unit) {
        try {
            teachers = RetrofitClient.apiService.getTeachers()
        } catch (e: Exception) { e.printStackTrace() }
        finally { isLoading = false }
    }

    // Detail fetching effect remains the same...
    LaunchedEffect(selectedTeacher) {
        selectedTeacher?.let { teacher ->
            isLoadingDetails = true
            detailedUser = null
            try {
                val profileRes = RetrofitClient.apiService.getUserProfile(teacher.username)
                if (profileRes.isSuccessful) detailedUser = profileRes.body()
                history = RetrofitClient.apiService.getTeacherHistory(teacher.userId)
            } catch (e: Exception) { e.printStackTrace() }
            finally { isLoadingDetails = false }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Faculty") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { showSortMenu = true }) { Icon(Icons.Default.SortByAlpha, null) }
                    DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                        DropdownMenuItem(text = { Text("A to Z") }, onClick = { sortOrder = SortOrder.ASCENDING; showSortMenu = false })
                        DropdownMenuItem(text = { Text("Z to A") }, onClick = { sortOrder = SortOrder.DESCENDING; showSortMenu = false })
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // --- TOP STAT SECTION ---
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                // Changed label and took full width since Departments is gone
                StatCard("Active Teachers", "${teachers.size}", Icons.Default.Person, Modifier.fillMaxWidth())
            }

            // --- SEARCH BAR ---
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                placeholder = { Text("Search by name...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null) }
                    }
                },
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(filteredTeachers) { teacher ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable {
                            selectedTeacher = teacher
                            showSheet = true
                        },
                        elevation = CardDefaults.cardElevation(2.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        ListItem(
                            headlineContent = { Text(teacher.username, fontWeight = FontWeight.Bold) },
                            supportingContent = { Text("ID: ${teacher.userId}") },
                            leadingContent = {
                                // In the LazyColumn items
                                AsyncImage(
                                    model = "https://192.168.0.214:7089/api/DownloadUpload/profile-image/${selectedTeacher?.userId}",
                                    placeholder = painterResource(R.drawable.user),
                                    error = painterResource(R.drawable.user),
                                    contentDescription = null,
                                    modifier = Modifier
                                        .size(85.dp)
                                        .clip(CircleShape)
                                        .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape),
                                    contentScale = ContentScale.Crop
                                )
                            },
                            trailingContent = { Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.primary) },
                            colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                        )
                    }
                }

                if (!isLoading && filteredTeachers.isEmpty()) {
                    item {
                        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text("No teachers found matching '$searchQuery'", color = Color.Gray)
                        }
                    }
                }
            }
        }

        if (showSheet) {
            ModalBottomSheet(onDismissRequest = { showSheet = false }, sheetState = sheetState) {
                TeacherDetailContent(selectedTeacher, detailedUser, history, isLoadingDetails)
            }
        }
    }
}

@Composable
fun TeacherDetailContent(
    selectedTeacher: UserSimple?,
    detailedUser: AppUser?,
    history: List<TeacherModuleHistoryDTO>,
    isLoadingDetails: Boolean
) {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp).padding(bottom = 32.dp)) {
        // --- Profile Header ---
        Row(verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = "https://192.168.0.214:7089/api/DownloadUpload/profile-image/${selectedTeacher?.userId}",
                contentDescription = null,
                modifier = Modifier
                    .size(85.dp)
                    .clip(CircleShape)
                    .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(20.dp))
            Column {
                Text(
                    text = selectedTeacher?.username ?: "Unknown",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )

                if (isLoadingDetails) {
                    LinearProgressIndicator(modifier = Modifier.width(100.dp).padding(top = 8.dp))
                } else {
                    Text(
                        text = detailedUser?.email ?: "No email available",
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Spacer(modifier = Modifier.height(24.dp))

        // --- History Section ---
        Text(
            text = "Teaching History",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.secondary
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoadingDetails) {
            Box(Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (history.isEmpty()) {
            Text("No history recorded for this teacher.", color = Color.Gray, modifier = Modifier.padding(vertical = 16.dp))
        } else {
            // Using a simple Column here because it's already inside a BottomSheet
            history.forEach { item ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.moduleName, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Badge(containerColor = MaterialTheme.colorScheme.secondaryContainer) {
                                Text("${item.hoursTaught}h", color = MaterialTheme.colorScheme.onSecondaryContainer)
                            }
                        }
                        Text(
                            text = "Course: ${item.courseName}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}