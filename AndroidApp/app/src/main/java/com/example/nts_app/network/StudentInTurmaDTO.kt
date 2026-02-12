package com.example.nts_app.network

data class StudentInTurmaDTO(
    val userId: Int,
    val username: String,
    val email: String,
    val birthDate: String?,
    val userIsDeleted: Int,
    val enrollmentIsDeleted: Int
)