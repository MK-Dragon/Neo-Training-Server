package com.example.nts_app.network

data class Course(
    val id: Int,
    val name: String,
    val durationInHours: Int,
    val level: String,
    val isDeleted: Int
)