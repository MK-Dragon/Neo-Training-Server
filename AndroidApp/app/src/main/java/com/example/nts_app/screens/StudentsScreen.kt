package com.example.nts_app.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.nts_app.network.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsScreen(onBack: () -> Unit) {
    var stats by remember { mutableStateOf<OngoingStatsDTO?>(null) }
    var turmas by remember { mutableStateOf<List<TurmaDTO>>(emptyList()) }
    var expandedTurmaId by remember { mutableStateOf<Int?>(null) }
    var studentsMap = remember { mutableStateMapOf<Int, List<StudentInTurmaDTO>?>() }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            stats = RetrofitClient.apiService.getOngoingStats()
            turmas = RetrofitClient.apiService.getOngoingTurmas()
        } catch (e: Exception) { /* Handle Error */ }
        finally { isLoading = false }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Student Management") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // --- TOP STATS SECTION ---
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                StatCard("Ongoing Turmas", "${turmas.size}", Icons.Default.Groups, Modifier.weight(1f))
                StatCard("Active Students", "${stats?.totalActiveStudents ?: 0}", Icons.Default.School, Modifier.weight(1f))
            }

            Text("Ongoing Turmas List", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))

            if (isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(16.dp))
            }

            LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(turmas) { turma ->
                    TurmaExpandableItem(
                        turma = turma,
                        isExpanded = expandedTurmaId == turma.turmaId,
                        // Pass the nullable list directly
                        students = studentsMap[turma.turmaId],
                        onClick = {
                            if (expandedTurmaId == turma.turmaId) {
                                expandedTurmaId = null
                            } else {
                                expandedTurmaId = turma.turmaId
                                // Only fetch if we haven't fetched before (null)
                                if (studentsMap[turma.turmaId] == null) {
                                    scope.launch {
                                        try {
                                            val list = RetrofitClient.apiService.getStudentsByTurma(turma.turmaId)
                                            studentsMap[turma.turmaId] = list
                                        } catch (e: Exception) {
                                            // If 404 or error, set as empty list so spinner stops
                                            studentsMap[turma.turmaId] = emptyList()
                                        }
                                    }
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun StatCard(label: String, value: String, icon: ImageVector, modifier: Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.secondary)
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
fun TurmaExpandableItem(
    turma: TurmaDTO,
    isExpanded: Boolean,
    students: List<StudentInTurmaDTO>?, // Now Nullable
    onClick: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth().clickable { onClick() }) {
        Column {
            ListItem(
                headlineContent = { Text(turma.turmaName, fontWeight = FontWeight.Bold) },
                supportingContent = { Text(turma.courseName) },
                trailingContent = { Icon(if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null) }
            )
            AnimatedVisibility(visible = isExpanded) {
                Column(modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant).padding(8.dp)) {
                    when {
                        // State A: Still fetching from API
                        students == null -> {
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            }
                        }
                        // State B: API returned nothing
                        students.isEmpty() -> {
                            Text(
                                "No students enrolled in this turma.",
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                        // State C: Show the data
                        else -> {
                            students.forEach { student ->
                                ListItem(
                                    headlineContent = { Text(student.username) },
                                    supportingContent = { Text(student.email) },
                                    leadingContent = { Icon(Icons.Default.PersonOutline, null) },
                                    colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}