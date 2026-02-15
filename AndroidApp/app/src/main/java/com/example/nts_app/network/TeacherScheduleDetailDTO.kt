package com.example.nts_app.network

import com.google.gson.annotations.SerializedName

data class TeacherScheduleDetailDTO(
    val dateTime: String,
    val turmaId: Int,
    val turmaName: String,
    val moduleId: Int,
    val moduleName: String,
    val totalDuration: Int,
    val hoursCompleted: Int,
    val salaId: Int,
    val salaNome: String,
    val hasPc: Int,
    val hasOficina: Int
)