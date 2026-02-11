package com.example.nts_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.nts_app.screens.HomeScreen
import com.example.nts_app.screens.LoginScreen
import com.example.nts_app.screens.CoursesScreen
import com.example.nts_app.network.RetrofitClient
import coil.ImageLoader
import coil.Coil

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val imageLoader = coil.ImageLoader.Builder(this)
            .okHttpClient { com.example.nts_app.network.RetrofitClient.okHttpClient }
            .build()
        coil.Coil.setImageLoader(imageLoader)

        setContent {
            val navController = rememberNavController()
            // Shared ViewModel instance for the whole app
            val userViewModel: UserViewModel = viewModel()



            NavHost(navController = navController, startDestination = "login") {

                composable("login") {
                    LoginScreen(
                        viewModel = userViewModel,
                        onLoginSuccess = {
                            navController.navigate("home") {
                                // Clear the backstack so user can't "Go Back" to login
                                popUpTo("login") { inclusive = true }
                            }
                        }
                    )
                }

                composable("home") {
                    HomeScreen(
                        viewModel = userViewModel,
                        // Fix: Pass a lambda that uses the navController
                        onNavigate = { route ->
                            navController.navigate(route)
                        }
                    )
                }

                composable("view_courses") {
                    CoursesScreen(onBack = { navController.popBackStack() })
                }

                // Placeholder routes for your dashboard buttons
                //composable("view_courses") { /* TODO: Create CourseScreen */ }
                composable("view_teachers") { /* TODO: Create TeacherScreen */ }
                composable("view_students") { /* TODO: Create StudentScreen */ }
                composable("room_availability") { /* TODO: Create RoomScreen */ }
            }
        }
    }
}