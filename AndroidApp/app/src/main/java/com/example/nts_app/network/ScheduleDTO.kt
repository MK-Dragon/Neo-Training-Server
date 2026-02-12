package com.example.nts_app.network

data class ScheduleDTO(
    val scheduleId: Int,
    val turmaId: Int,
    val turmaName: String,
    val moduleId: Int,
    val moduleName: String,
    val teacherId: Int,
    val teacherName: String,
    val salaId: Int,
    val salaNome: String,
    val dateTime: String // ISO String from C#
)


