package com.example.nts_app.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.nts_app.UserViewModel
import androidx.compose.material3.HorizontalDivider as Divider
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*

@Composable
fun HomeScreen(viewModel: UserViewModel, onNavigate: (String) -> Unit) {
    val user = viewModel.currentUser
    val context = LocalContext.current

    // Use a timestamp just like your React code: ?t=${Date.now()}
    val imgTimestamp = remember { System.currentTimeMillis() }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // --- Header Section ---
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data("https://192.168.0.214:7089/api/DownloadUpload/profile-image/${user?.userId}?t=$imgTimestamp")
                    .crossfade(true)
                    .build(),
                contentDescription = "Profile Picture",
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = user?.username ?: "User",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    // ROLE BADGE
                    Badge(containerColor = MaterialTheme.colorScheme.secondaryContainer) {
                        Text(user?.userRole ?: "Role", modifier = Modifier.padding(4.dp))
                    }
                }
                Text("Welcome back,", style = MaterialTheme.typography.bodyLarge)
            }

            IconButton(onClick = {
                viewModel.logout()
                onNavigate("login")
            }) {
                Icon(Icons.Default.ExitToApp, "Logout", tint = MaterialTheme.colorScheme.error)
            }
        }

        Divider(modifier = Modifier.padding(vertical = 8.dp))

        // --- All 4 Dashboard Buttons ---
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f)
        ) {
            item { DashboardButton("View Courses", Icons.Default.MenuBook) { onNavigate("view_courses") } }
            item { DashboardButton("View Teachers", Icons.Default.Person) { onNavigate("view_teachers") } }
            item { DashboardButton("View Students", Icons.Default.Groups) { onNavigate("view_students") } }
            item { DashboardButton("Room Availability", Icons.Default.MeetingRoom) { onNavigate("room_availability") } }
        }

        // --- DEBUG INFO PANEL ---
        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("Developer Debug Info:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
                Text("User ID: ${user?.userId}", style = MaterialTheme.typography.bodySmall)
                Text("Email: ${user?.email}", style = MaterialTheme.typography.bodySmall)
                Text("Role: ${user?.userRole}", style = MaterialTheme.typography.bodySmall)
                Text("Token Length: ${user?.getToken()?.length ?: 0} chars", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun DashboardButton(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(110.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(title, textAlign = TextAlign.Center, style = MaterialTheme.typography.labelLarge)
        }
    }
}