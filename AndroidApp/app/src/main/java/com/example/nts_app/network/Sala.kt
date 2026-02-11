package com.example.nts_app.network

data class Sala(
    val id: Int,
    val nome: String,
    val temPcs: Int,      // 0 = No, 1 = Yes
    val temOficina: Int,  // 0 = No, 1 = Yes
    val isDeleted: Int
)