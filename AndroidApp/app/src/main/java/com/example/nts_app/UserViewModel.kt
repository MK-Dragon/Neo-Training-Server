package com.example.nts_app

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.nts_app.network.LoginRequest
import com.example.nts_app.network.RetrofitClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


class UserViewModel : ViewModel() {
    // Shared State
    var currentUser by mutableStateOf<User?>(null)
        private set

    var isWaitingFor2FA by mutableStateOf(false)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf("")

    private val api = RetrofitClient.apiService

    fun setUserData(username: String, userId: Int = 0, email: String = "", role: String = "Student") {
        currentUser = User(
            username = username,
            userId = userId,
            email = email,
            userRole = role
        )
    }

    fun handleLogin(username: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = ""
            try {
                val response = api.login(LoginRequest(username, password))
                if (response.isSuccessful) {
                    val data = response.body()
                    setUserData(username = data?.username ?: username)
                    isWaitingFor2FA = true
                    startPolling(data?.requestId ?: "", onSuccess)
                } else {
                    errorMessage = "Login Failed: ${response.code()}"
                }
            } catch (e: Exception) {
                errorMessage = "Server Error: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    private fun startPolling(requestId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            while (isWaitingFor2FA) {
                delay(3000)
                try {
                    val res = api.check2FA(requestId)
                    if (res.isSuccessful && res.body()?.verified == true) {
                        val token = res.body()?.token ?: ""

                        RetrofitClient.setToken(token)
                        currentUser?.updateToken(token)

                        // Fetch the full profile before completing login
                        fetchUserProfile(currentUser?.username ?: "")

                        isWaitingFor2FA = false
                        onSuccess()
                        break
                    }
                } catch (e: Exception) {
                    // Fail silently and retry polling
                }
            }
        }
    }

    private fun fetchUserProfile(username: String) {
        viewModelScope.launch {
            try {
                val response = api.getUserProfile(username)
                if (response.isSuccessful) {
                    val profileData = response.body()

                    if (profileData != null) {
                        val currentToken = currentUser?.getToken() ?: ""

                        // We map AppUser (from API) into our local User (session)
                        currentUser = User(
                            username = profileData.username,
                            userId = profileData.id,
                            email = profileData.email,
                            userRole = profileData.role,
                            token = currentToken
                        )
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Failed to load profile: ${e.message}"
            }
        }
    }
}