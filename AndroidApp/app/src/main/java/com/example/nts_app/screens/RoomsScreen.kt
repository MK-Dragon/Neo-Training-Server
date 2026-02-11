package com.example.nts_app.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.nts_app.network.RetrofitClient
import com.example.nts_app.network.Sala
import kotlinx.coroutines.launch
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.*
import android.util.Log

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsScreen(onBack: () -> Unit) {
    // Current State for API calls
    var startDateTime by remember {
        mutableStateOf(LocalDateTime.now().plusHours(1).withMinute(0).withSecond(0))
    }
    var endDateTime by remember { mutableStateOf(startDateTime) }

    // UI Dialog States
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var pickingForStart by remember { mutableStateOf(true) } // To know which variable to update

    var rooms by remember { mutableStateOf<List<Sala>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Filters
    var filterPcs by remember { mutableStateOf(false) }
    var filterWorkshop by remember { mutableStateOf(false) }

    val filteredRooms = rooms.filter { room ->
        (!filterPcs || room.temPcs == 1) && (!filterWorkshop || room.temOficina == 1)
    }

    // --- API Fetch Logic ---
    val fetchRooms = {
        scope.launch {
            isLoading = true
            try {
                // .withNano(0) removes the .978816 part entirely
                val cleanStart = startDateTime.withNano(0)
                val cleanEnd = endDateTime.withNano(0)

                // Now format it: this will result in "2026-02-11T15:00:00"
                val startStr = cleanStart.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                val endStr = cleanEnd.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)

                val result = RetrofitClient.apiService.getAvailableRooms(startStr, endStr)
                rooms = result
            } catch (e: Exception) {
                Log.e("API_ERROR", "Error: ${e.message}")
                rooms = emptyList()
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Room Availability") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // --- DATE & TIME SELECTOR CARD ---
            Card(
                modifier = Modifier.padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

                    // START Selection
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("From:", modifier = Modifier.width(50.dp), style = MaterialTheme.typography.labelLarge)
                        DateTimeChip(
                            dateTime = startDateTime,
                            onDateClick = { pickingForStart = true; showDatePicker = true },
                            onTimeClick = { pickingForStart = true; showTimePicker = true }
                        )
                    }

                    // END Selection
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("To:", modifier = Modifier.width(50.dp), style = MaterialTheme.typography.labelLarge)
                        DateTimeChip(
                            dateTime = endDateTime,
                            onDateClick = { pickingForStart = false; showDatePicker = true },
                            onTimeClick = { pickingForStart = false; showTimePicker = true }
                        )
                    }

                    Button(
                        onClick = {
                            if (endDateTime.isBefore(startDateTime)) {
                            } else {
                                fetchRooms()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Icon(Icons.Default.Search, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Check Availability")
                    }
                }
            }

            // --- FILTER CHIPS ---
            Row(modifier = Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = filterPcs,
                    onClick = { filterPcs = !filterPcs },
                    label = { Text("With PCs") },
                    leadingIcon = if (filterPcs) { { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) } } else null
                )
                FilterChip(
                    selected = filterWorkshop,
                    onClick = { filterWorkshop = !filterWorkshop },
                    label = { Text("Workshop") },
                    leadingIcon = if (filterWorkshop) { { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) } } else null
                )
            }

            // --- RESULTS ---
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredRooms) { room -> RoomCard(room) }
                }
            }
        }

        // --- DIALOGS ---
        if (showDatePicker) {
            val datePickerState = rememberDatePickerState()
            DatePickerDialog(
                onDismissRequest = { showDatePicker = false },
                confirmButton = {
                    TextButton(onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val selectedDate = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()
                            if (pickingForStart) {
                                startDateTime = startDateTime.with(selectedDate)
                            } else {
                                endDateTime = endDateTime.with(selectedDate)
                            }
                        }
                        showDatePicker = false
                    }) { Text("OK") }
                }
            ) { DatePicker(state = datePickerState) }
        }

        if (showTimePicker) {
            val timePickerState = rememberTimePickerState(
                initialHour = if (pickingForStart) startDateTime.hour else endDateTime.hour,
                is24Hour = true
            )
            AlertDialog(
                onDismissRequest = { showTimePicker = false },
                confirmButton = {
                    TextButton(onClick = {
                        // We force minutes to 00 as per your requirements
                        if (pickingForStart) {
                            startDateTime = startDateTime.withHour(timePickerState.hour).withMinute(0)
                        } else {
                            endDateTime = endDateTime.withHour(timePickerState.hour).withMinute(0)
                        }
                        showTimePicker = false
                    }) { Text("Confirm Hour") }
                },
                title = { Text("Select Hour Block") },
                text = { TimePicker(state = timePickerState) }
            )
        }
    }
}

@Composable
fun DateTimeChip(dateTime: LocalDateTime, onDateClick: () -> Unit, onTimeClick: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AssistChip(
            onClick = onDateClick,
            label = { Text(dateTime.format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))) },
            leadingIcon = { Icon(Icons.Default.CalendarToday, null, Modifier.size(18.dp)) }
        )
        AssistChip(
            onClick = onTimeClick,
            label = { Text(dateTime.format(DateTimeFormatter.ofPattern("HH:00"))) },
            leadingIcon = { Icon(Icons.Default.AccessTime, null, Modifier.size(18.dp)) }
        )
    }
}

@Composable
fun RoomCard(room: Sala) {
    Card(elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(room.nome, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (room.temPcs == 1) Icon(Icons.Default.Computer, "PC", tint = Color(0xFF4CAF50))
                if (room.temOficina == 1) Icon(Icons.Default.Build, "Tool", tint = Color(0xFF4CAF50))
            }
        }
    }
}