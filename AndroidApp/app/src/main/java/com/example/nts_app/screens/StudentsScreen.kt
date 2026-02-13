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
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.nts_app.R
import com.example.nts_app.network.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsScreen(onBack: () -> Unit) {
    var stats by remember { mutableStateOf<OngoingStatsDTO?>(null) }
    var turmas by remember { mutableStateOf<List<TurmaDTO>>(emptyList()) }
    var expandedTurmaId by remember { mutableStateOf<Int?>(null) }
    val studentsMap = remember { mutableStateMapOf<Int, List<StudentInTurmaDTO>?>() }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            stats = RetrofitClient.apiService.getOngoingStats()
            turmas = RetrofitClient.apiService.getOngoingTurmas()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Student Management") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) }
                }
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

            Text(
                text = "Ongoing Turmas List",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(turmas) { turma ->
                    TurmaExpandableItem(
                        turma = turma,
                        isExpanded = expandedTurmaId == turma.turmaId,
                        students = studentsMap[turma.turmaId],
                        onClick = {
                            if (expandedTurmaId == turma.turmaId) {
                                expandedTurmaId = null
                            } else {
                                expandedTurmaId = turma.turmaId
                                if (studentsMap[turma.turmaId] == null) {
                                    scope.launch {
                                        try {
                                            val list = RetrofitClient.apiService.getStudentsByTurma(turma.turmaId)
                                            studentsMap[turma.turmaId] = list
                                        } catch (e: Exception) {
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
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.secondary) //  contrast
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
fun TurmaExpandableItem(
    turma: TurmaDTO,
    isExpanded: Boolean,
    students: List<StudentInTurmaDTO>?,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            ListItem(
                headlineContent = { Text(turma.turmaName, fontWeight = FontWeight.Bold) },
                supportingContent = { Text(turma.courseName) },
                trailingContent = {
                    Icon(if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null)
                },
                colors = ListItemDefaults.colors(containerColor = Color.Transparent)
            )

            AnimatedVisibility(visible = isExpanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                        .padding(bottom = 8.dp)
                ) {
                    when {
                        students == null -> {
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            }
                        }
                        students.isEmpty() -> {
                            Text(
                                "No students enrolled.",
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                        else -> {
                            students.forEach { student ->
                                ListItem(
                                    headlineContent = { Text(student.username, fontWeight = FontWeight.SemiBold) },
                                    supportingContent = { Text(student.email) },
                                    leadingContent = {
                                        AsyncImage(
                                            model = ImageRequest.Builder(LocalContext.current)
                                                .data(RetrofitClient.getProfileImageUrl(student.userId)) // NO HARDCODED IP!
                                                .crossfade(true)
                                                .build(),
                                            placeholder = painterResource(R.drawable.user),
                                            error = painterResource(R.drawable.user),
                                            contentDescription = null,
                                            modifier = Modifier
                                                .size(40.dp)
                                                .clip(CircleShape)
                                                .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), CircleShape),
                                            contentScale = ContentScale.Crop
                                        )
                                    },
                                    colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}