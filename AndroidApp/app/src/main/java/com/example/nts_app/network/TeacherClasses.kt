package com.example.nts_app.network

import com.google.gson.annotations.SerializedName

data class UserSimple(
    val userId: Int,
    val username: String
)

data class TeacherModuleHistoryDTO(
    val moduleId: Int,
    val moduleName: String,
    val courseId: Int,
    val courseName: String,
    val hoursTaught: Int
)