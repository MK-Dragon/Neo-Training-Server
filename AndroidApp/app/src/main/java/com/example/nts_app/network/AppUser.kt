package com.example.nts_app.network

data class AppUser(
    val id: Int,
    val username: String,
    val email: String,
    val role: String,
    val activated: Int,
    val birthDate: String // JSON usually sends this as a string
)