package com.example.nts_app.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.nts_app.network.Course
import com.example.nts_app.network.RetrofitClient
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.material.icons.filled.Book
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.BorderStroke

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoursesScreen(onBack: () -> Unit) {
    var allCourses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var sortCategory by remember { mutableStateOf("Name") }
    var isAscending by remember { mutableStateOf(true) }
    var isLoading by remember { mutableStateOf(true) }

    // Logic for filtering and sorting
    // Define the priority order for levels
    val levelPriority = mapOf(
        "beginner" to 1,
        "intermediate" to 2,
        "advanced" to 3
    )

    val filteredCourses = allCourses.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
                it.level.contains(searchQuery, ignoreCase = true)
    }.let { list ->
        when (sortCategory) {
            "Name" -> if (isAscending) list.sortedBy { it.name } else list.sortedByDescending { it.name }
            "Level" -> {
                val sorted = list.sortedBy { levelPriority[it.level.lowercase()] ?: 99 }
                if (isAscending) sorted else sorted.reversed()
            }
            "Duration" -> if (isAscending) list.sortedBy { it.durationInHours } else list.sortedByDescending { it.durationInHours }
            else -> list
        }
    }

    LaunchedEffect(Unit) {
        try {
            allCourses = RetrofitClient.apiService.getCourses() // ???
        } catch (e: Exception) { /* Handle error */ }
        finally { isLoading = false }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Courses") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // --- Search Bar ---
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                placeholder = { Text("Search by name or level...") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                singleLine = true,
                shape = MaterialTheme.shapes.medium
            )

            // --- Sorting Chips ---
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Name", "Level", "Duration").forEach { tag ->
                    val isSelected = sortCategory == tag
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            if (isSelected) {
                                isAscending = !isAscending // Toggle direction
                            } else {
                                sortCategory = tag
                                isAscending = true // Reset to ascending when switching category
                            }
                        },
                        label = { Text(tag) },
                        trailingIcon = if (isSelected) {
                            {
                                Icon(
                                    imageVector = if (isAscending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        } else null,
                        leadingIcon = if (isSelected) {
                            { Icon(Icons.Default.Check, null, modifier = Modifier.size(18.dp)) }
                        } else null
                    )
                }
            }

            // --- Course List ---
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredCourses) { course ->
                        CourseItem(course)
                    }
                    if (filteredCourses.isEmpty() && !isLoading) {
                        item {
                            Text(
                                "No courses found.",
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CourseItem(course: Course) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Book,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = course.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Row(modifier = Modifier.padding(top = 4.dp)) {
                    // Duration Badge
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.secondaryContainer
                    ) {
                        Text(
                            text = "${course.durationInHours}h",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))

                    // --- DYNAMIC LEVEL BADGE ---
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = getLevelContainerColor(course.level)
                    ) {
                        Text(
                            text = course.level.uppercase(),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = getLevelColor(course.level)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun getLevelColor(level: String): Color {
    return when (level.lowercase()) {
        "beginner" -> Color(0xFF2E7D32)     // Green
        "intermediate" -> Color(0xFFEF6C00) // Orange
        "advanced" -> Color(0xFFC62828)     // Red
        else -> MaterialTheme.colorScheme.secondary // Default
    }
}

@Composable
fun getLevelContainerColor(level: String): Color {
    return when (level.lowercase()) {
        "beginner" -> Color(0xFFE8F5E9)     // Light Green
        "intermediate" -> Color(0xFFFFF3E0) // Light Orange
        "advanced" -> Color(0xFFFFEBEE)     // Light Red
        else -> MaterialTheme.colorScheme.secondaryContainer
    }
}