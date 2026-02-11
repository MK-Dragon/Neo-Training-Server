package com.example.nts_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

// Pages
import com.example.nts_app.screens.HomeScreen
import com.example.nts_app.screens.LoginScreen
import com.example.nts_app.screens.CoursesScreen
import com.example.nts_app.screens.TeachersScreen
import com.example.nts_app.screens.StudentsScreen
import com.example.nts_app.screens.RoomsScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val imageLoader = coil.ImageLoader.Builder(this)
            .okHttpClient { com.example.nts_app.network.RetrofitClient.okHttpClient }
            .build()
        coil.Coil.setImageLoader(imageLoader)

        setContent {
            val navController = rememberNavController()
            val userViewModel: UserViewModel = viewModel()

            // Observe the current route to decide if we show the navbar
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = navBackStackEntry?.destination

            Scaffold(
                bottomBar = {
                    // Only show Navbar if we are NOT on the login screen
                    if (currentDestination?.route != "login") {
                        BottomNavigationBar(navController)
                    }
                }
            ) { innerPadding ->
                // The innerPadding is vital! It pushes the content above the navbar.
                NavHost(
                    navController = navController,
                    startDestination = "login",
                    modifier = Modifier.padding(innerPadding)
                ) {
                    composable("login") {
                        LoginScreen(
                            viewModel = userViewModel,
                            onLoginSuccess = {
                                navController.navigate("home") {
                                    popUpTo("login") { inclusive = true }
                                }
                            }
                        )
                    }

                    composable("home") {
                        HomeScreen(
                            viewModel = userViewModel,
                            onNavigate = { route -> navController.navigate(route) }
                        )
                    }

                    composable("view_courses") {
                        CoursesScreen(onBack = { navController.popBackStack() })
                    }

                    composable("view_teachers") {
                        TeachersScreen(onBack = { navController.popBackStack() })
                    }

                    composable("view_students") {
                        StudentsScreen(onBack = { navController.popBackStack() })
                    }

                    composable("room_availability") {
                        RoomsScreen(onBack = { navController.popBackStack() })
                    }

                    composable("profile") { /* We can build this next! */ }
                }
            }
        }
    }
}

@Composable
fun BottomNavigationBar(navController: androidx.navigation.NavHostController) {
    val items = listOf(
        NavigationItem("home", "Home", Icons.Default.Home),
        NavigationItem("room_availability", "Class Rooms", Icons.Default.MeetingRoom),
        NavigationItem("profile", "Profile", Icons.Default.Settings)
    )

    NavigationBar {
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentDestination = navBackStackEntry?.destination

        items.forEach { item ->
            NavigationBarItem(
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
                selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                onClick = {
                    navController.navigate(item.route) {
                        // Pop up to the start destination of the graph to
                        // avoid building up a large stack of destinations
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        // Avoid multiple copies of the same destination when
                        // reselecting the same item
                        launchSingleTop = true
                        // Restore state when reselecting a previously selected item
                        restoreState = true
                    }
                }
            )
        }
    }
}

data class NavigationItem(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)