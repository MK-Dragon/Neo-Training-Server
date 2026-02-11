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

data class OngoingStatsDTO(
    val totalOngoingCourses: Int,
    val totalActiveStudents: Int
)

data class StudentInTurmaDTO(
    val userId: Int,
    val username: String,
    val email: String,
    val birthDate: String?,
    val userIsDeleted: Int,
    val enrollmentIsDeleted: Int
)