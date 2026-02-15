package com.example.nts_app.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.nts_app.ScheduleViewModel
import com.example.nts_app.UserViewModel
import com.example.nts_app.network.TeacherScheduleDetailDTO
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherScheduleScreen(
    viewModel: ScheduleViewModel = viewModel(),
    userViewModel: UserViewModel,
    onNavigateBack: () -> Unit
) {
    val user = userViewModel.currentUser
    val scheduleData = viewModel.teacherScheduleData
    val isLoading = viewModel.isLoading

    // Auto-fetch teacher schedule using User ID
    LaunchedEffect(user, viewModel.currentWeekStart) {
        user?.userId?.let { id ->
            viewModel.fetchTeacherSchedule(id)
        }
    }

    val weekDays = (0..6).map { viewModel.currentWeekStart.plusDays(it.toLong()) }
    val hours = (8..22)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Teaching Schedule") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // --- Week Navigation (No Turma Selector here) ---
            Card(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { viewModel.changeWeek(-1) }) { Icon(Icons.Default.ChevronLeft, null) }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Weekly View", style = MaterialTheme.typography.labelMedium)
                        Text(
                            text = "Week of ${viewModel.currentWeekStart.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))}",
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(onClick = { viewModel.changeWeek(1) }) { Icon(Icons.Default.ChevronRight, null) }
                }
            }

            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                // --- The Schedule Grid ---
                Box(modifier = Modifier.fillMaxSize().horizontalScroll(rememberScrollState())) {
                    Column {
                        // Days Header
                        Row(modifier = Modifier.padding(start = 65.dp)) {
                            weekDays.forEach { day ->
                                Column(
                                    modifier = Modifier.width(150.dp).padding(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(day.dayOfWeek.name.take(3), fontWeight = FontWeight.Black, fontSize = 14.sp)
                                    Text(day.format(DateTimeFormatter.ofPattern("dd/MM")), fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                        }

                        // Grid Body
                        Box(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                            Row {
                                // Time column
                                Column(modifier = Modifier.width(65.dp)) {
                                    hours.forEach { hour ->
                                        Box(Modifier.height(110.dp).padding(top = 8.dp), contentAlignment = Alignment.TopCenter) {
                                            Text("${hour.toString().padStart(2, '0')}:00", style = MaterialTheme.typography.labelSmall)
                                        }
                                    }
                                }

                                // Data columns
                                weekDays.forEach { day ->
                                    Column(modifier = Modifier.width(150.dp)) {
                                        hours.forEach { hour ->
                                            val slotTime = day.atTime(hour, 0)
                                            val session = scheduleData.find {
                                                val apiTime = LocalDateTime.parse(it.dateTime)
                                                apiTime.toLocalDate() == slotTime.toLocalDate() && apiTime.hour == slotTime.hour
                                            }
                                            TeacherScheduleCell(session)
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
}

@Composable
fun TeacherScheduleCell(session: TeacherScheduleDetailDTO?) {
    Box(
        modifier = Modifier
            .height(110.dp) // Increased height for progress bar
            .fillMaxWidth()
            .padding(2.dp)
            .border(0.5.dp, Color.LightGray.copy(alpha = 0.3f))
            .background(
                if (session != null) MaterialTheme.colorScheme.surfaceVariant
                else Color.Transparent,
                shape = RoundedCornerShape(4.dp)
            )
    ) {
        if (session != null) {
            Column(modifier = Modifier.padding(8.dp)) {
                Text(session.moduleName, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                Text(session.turmaName, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary)

                Spacer(Modifier.height(4.dp))

                // Module Progress
                val progress = if (session.totalDuration > 0)
                    session.hoursCompleted.toFloat() / session.totalDuration.toFloat() else 0f

                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    trackColor = Color.LightGray.copy(alpha = 0.5f)
                )

                Spacer(Modifier.weight(1f))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.MeetingRoom, null, modifier = Modifier.size(12.dp))
                    Text(session.salaNome, fontSize = 10.sp, modifier = Modifier.padding(start = 2.dp))

                    Spacer(Modifier.weight(1f))

                    // Equipment tags
                    if (session.hasPc == 1) Icon(Icons.Default.Computer, "PC", modifier = Modifier.size(14.dp), tint = Color(0xFF1976D2))
                    if (session.hasOficina == 1) Icon(Icons.Default.Build, "Workshop", modifier = Modifier.size(14.dp), tint = Color(0xFFD32F2F))
                }
            }
        }
    }
}