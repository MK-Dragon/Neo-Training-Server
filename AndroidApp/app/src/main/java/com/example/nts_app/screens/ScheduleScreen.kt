package com.example.nts_app.screens

import android.util.Log
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
import com.example.nts_app.network.ScheduleDTO
import com.example.nts_app.network.TurmaDTO
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    viewModel: ScheduleViewModel = viewModel(),
    userViewModel: UserViewModel,
    onNavigateBack: () -> Unit
) {
    val user = userViewModel.currentUser
    val activeTurmas = viewModel.activeTurmas
    val scheduleData = viewModel.scheduleData
    val isLoading = viewModel.isLoading

    // Trigger initial fetch based on user role and ID
    LaunchedEffect(user) {
        if (user != null) {
            viewModel.initFetch(user.userRole, user.userId)
        }
    }

    // Time helpers
    val weekDays = (0..6).map { viewModel.currentWeekStart.plusDays(it.toLong()) }
    val hours = (8..22) // 08:00 to 22:00

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(if (user?.userRole == "Student") "My Classes" else "Manage Schedules")
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // --- Header Controls ---
            Card(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = if (user?.userRole == "Student") "Select your enrolled class" else "Select a class to view",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    TurmaDropdown(
                        turmas = activeTurmas,
                        selectedTurmaId = viewModel.selectedTurmaId,
                        onTurmaSelected = { id ->
                            viewModel.selectedTurmaId = id
                            viewModel.fetchSchedule()
                        }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Week Navigation
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { viewModel.changeWeek(-1) }) {
                            Icon(Icons.Default.ChevronLeft, "Previous Week")
                        }

                        Text(
                            text = "Week of ${viewModel.currentWeekStart.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )

                        IconButton(onClick = { viewModel.changeWeek(1) }) {
                            Icon(Icons.Default.ChevronRight, "Next Week")
                        }
                    }
                }
            }

            // --- Content Area ---
            if (viewModel.selectedTurmaId == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(48.dp))
                        Text("Please select a Turma above", color = Color.Gray, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            } else if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                // --- The Schedule Grid ---
                Box(modifier = Modifier.fillMaxSize().horizontalScroll(rememberScrollState())) {
                    Column {
                        // Days Header Row
                        Row(modifier = Modifier.padding(start = 65.dp)) {
                            weekDays.forEach { day ->
                                Column(
                                    modifier = Modifier.width(140.dp).padding(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(day.dayOfWeek.name.take(3), fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                                    Text(day.format(DateTimeFormatter.ofPattern("dd/MM")), fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                        }

                        // Scrollable Body
                        Box(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                            Row {
                                // Left Time Column
                                Column(modifier = Modifier.width(65.dp)) {
                                    hours.forEach { hour ->
                                        Box(
                                            Modifier.height(90.dp).padding(top = 8.dp),
                                            contentAlignment = Alignment.TopCenter
                                        ) {
                                            Text(
                                                text = "${hour.toString().padStart(2, '0')}:00",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color.Gray
                                            )
                                        }
                                    }
                                }

                                // Day Columns
                                weekDays.forEach { day ->
                                    Column(modifier = Modifier.width(140.dp)) {
                                        hours.forEach { hour ->
                                            val slotTime = day.atTime(hour, 0)
                                            val session = scheduleData.find {
                                                try {
                                                    val apiTime = LocalDateTime.parse(it.dateTime)
                                                    apiTime.toLocalDate() == slotTime.toLocalDate() && apiTime.hour == slotTime.hour
                                                } catch (e: Exception) {
                                                    false
                                                }
                                            }
                                            ScheduleCell(session)
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
fun ScheduleCell(session: ScheduleDTO?) {
    Box(
        modifier = Modifier
            .height(90.dp)
            .fillMaxWidth()
            .padding(2.dp)
            .border(0.5.dp, Color.LightGray.copy(alpha = 0.3f))
            .background(
                if (session != null) MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.9f)
                else Color.Transparent,
                shape = RoundedCornerShape(4.dp)
            )
    ) {
        if (session != null) {
            Column(modifier = Modifier.padding(6.dp)) {
                Text(
                    text = session.moduleName,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    lineHeight = 11.sp,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
                Spacer(Modifier.weight(1f))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, null, modifier = Modifier.size(10.dp), tint = Color.DarkGray)
                    Text(session.teacherName, fontSize = 9.sp, modifier = Modifier.padding(start = 2.dp), color = Color.DarkGray)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.MeetingRoom, null, modifier = Modifier.size(10.dp), tint = Color.DarkGray)
                    Text(session.salaNome, fontSize = 9.sp, modifier = Modifier.padding(start = 2.dp), color = Color.DarkGray)
                }
            }
        }
    }
}

@Composable
fun TurmaDropdown(turmas: List<TurmaDTO>, selectedTurmaId: Int?, onTurmaSelected: (Int) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val selectedName = turmas.find { it.turmaId == selectedTurmaId }?.turmaName ?: "Select Turma"

    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(selectedName, maxLines = 1)
                Icon(Icons.Default.ArrowDropDown, null)
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.9f)
        ) {
            turmas.forEach { t ->
                DropdownMenuItem(
                    text = { Text(t.turmaName) },
                    onClick = {
                        onTurmaSelected(t.turmaId)
                        expanded = false
                    }
                )
            }
        }
    }
}