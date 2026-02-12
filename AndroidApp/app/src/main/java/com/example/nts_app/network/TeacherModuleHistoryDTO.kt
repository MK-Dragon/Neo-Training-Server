package com.example.nts_app.network

data class TeacherModuleHistoryDTO(
    val moduleId: Int,
    val moduleName: String,
    val courseId: Int,
    val courseName: String,
    val hoursTaught: Int
)