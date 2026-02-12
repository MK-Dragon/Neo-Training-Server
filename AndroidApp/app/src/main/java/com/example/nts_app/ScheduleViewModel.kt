package com.example.nts_app

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.nts_app.network.RetrofitClient
import com.example.nts_app.network.ScheduleDTO
import com.example.nts_app.network.TurmaDTO
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters


class ScheduleViewModel : ViewModel() {
    private val api = RetrofitClient.apiService

    var activeTurmas by mutableStateOf<List<TurmaDTO>>(emptyList())
    var selectedTurmaId by mutableStateOf<Int?>(null)
    var scheduleData by mutableStateOf<List<ScheduleDTO>>(emptyList())
    var isLoading by mutableStateOf(false)

    var currentWeekStart by mutableStateOf<LocalDate>(
        LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    )

    init { fetchTurmas() }

    fun fetchTurmas() {
        viewModelScope.launch {
            try {
                activeTurmas = api.getOngoingTurmas()
            } catch (e: Exception) { Log.e("API", "Turmas fail: ${e.message}") }
        }
    }

    fun fetchSchedule() {
        val tId = selectedTurmaId ?: return
        viewModelScope.launch {
            isLoading = true
            try {
                val start = currentWeekStart.atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                val end = currentWeekStart.plusDays(7).atTime(23, 59, 59).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                scheduleData = api.getSchedulesFilter(start, end, tId)
            } catch (e: Exception) {
                scheduleData = emptyList()
            } finally { isLoading = false }
        }
    }

    fun changeWeek(weeks: Long) {
        currentWeekStart = currentWeekStart.plusWeeks(weeks)
        fetchSchedule()
    }
}