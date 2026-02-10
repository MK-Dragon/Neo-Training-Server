package com.example.nts_app

data class User(
    val username: String,
    val userId: Int,
    val email: String,
    val userRole: String = "Student", // Adding the = "Student" makes it optional!
    private var token: String = ""
) {
    fun updateToken(newToken: String) {
        token = newToken
    }

    fun getToken(): String {
        return token
    }
}