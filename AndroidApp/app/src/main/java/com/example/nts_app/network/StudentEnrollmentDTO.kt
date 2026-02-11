package com.example.nts_app.network

data class StudentEnrollmentDTO(
    val turmaName: String?,
    val courseName: String?,
    val average: Double,
    val status: String
)