package com.example.nts_app.screens

import com.example.nts_app.ScheduleViewModel

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
import com.example.nts_app.network.ScheduleDTO
import com.example.nts_app.network.TurmaDTO
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.time.DayOfWeek
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(viewModel: ScheduleViewModel = viewModel(), onNavigateBack: () -> Unit) {
    val activeTurmas = viewModel.activeTurmas
    val scheduleData = viewModel.scheduleData
    val isLoading = viewModel.isLoading

    // Time helpers
    val weekDays = (0..6).map { viewModel.currentWeekStart.plusDays(it.toLong()) }
    val hours = (8..22) // 08:00 to 22:00

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Turma Schedule") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
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
                    // Turma Selector
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
                        IconButton(onClick = { viewModel.changeWeek(-1) }) { Icon(Icons.Default.ChevronLeft, "Prev") }

                        Text(
                            text = "Week of ${viewModel.currentWeekStart.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))}",
                            fontWeight = FontWeight.Bold
                        )

                        IconButton(onClick = { viewModel.changeWeek(1) }) { Icon(Icons.Default.ChevronRight, "Next") }
                    }
                }
            }

            if (viewModel.selectedTurmaId == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Select a Turma to view schedule", color = Color.Gray)
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
                                    Text(day.format(DateTimeFormatter.ofPattern("dd/MM")), fontSize = 12.sp)
                                }
                            }
                        }

                        // Scrollable Body (Hours + Slots)
                        Box(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                            Row {
                                // Left Time Column (Sticky-ish)
                                Column(modifier = Modifier.width(65.dp)) {
                                    hours.forEach { hour ->
                                        Box(Modifier.height(90.dp).padding(top = 8.dp), contentAlignment = Alignment.TopCenter) {
                                            Text("${hour.toString().padStart(2, '0')}:00", style = MaterialTheme.typography.labelSmall)
                                        }
                                    }
                                }

                                // Day Columns
                                weekDays.forEach { day ->
                                    Column(modifier = Modifier.width(140.dp)) {
                                        hours.forEach { hour ->
                                            val slotTime = day.atTime(hour, 0)
                                            val session = scheduleData.find {
                                                val apiTime = LocalDateTime.parse(it.dateTime)
                                                apiTime.toLocalDate() == slotTime.toLocalDate() && apiTime.hour == slotTime.hour
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
            .border(0.5.dp, Color.LightGray.copy(alpha = 0.5f))
            .background(
                if (session != null) MaterialTheme.colorScheme.secondaryContainer
                else Color.Transparent,
                shape = RoundedCornerShape(4.dp)
            )
    ) {
        if (session != null) {
            Column(modifier = Modifier.padding(6.dp)) {
                Text(session.moduleName, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 2, lineHeight = 12.sp)
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, null, modifier = Modifier.size(10.dp))
                    Text(session.teacherName, fontSize = 9.sp, modifier = Modifier.padding(start = 2.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.MeetingRoom, null, modifier = Modifier.size(10.dp))
                    Text(session.salaNome, fontSize = 9.sp, modifier = Modifier.padding(start = 2.dp))
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
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(selectedName)
            Icon(Icons.Default.ArrowDropDown, null)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
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