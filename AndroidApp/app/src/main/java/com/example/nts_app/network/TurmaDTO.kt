package com.example.nts_app.network

data class TurmaDTO(
    val turmaId: Int,
    val turmaName: String,
    val courseId: Int,
    val courseName: String,
    val isDeleted: Int,
    val dateStart: String?,
    val dateEnd: String?
)