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
import com.example.nts_app.network.TeacherScheduleDetailDTO
import com.example.nts_app.network.TurmaDTO
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters


class ScheduleViewModel : ViewModel() {
    private val api get() = RetrofitClient.apiService // Use 'get()' to ensure updated IP

    var activeTurmas by mutableStateOf<List<TurmaDTO>>(emptyList())
    var selectedTurmaId by mutableStateOf<Int?>(null)
    var scheduleData by mutableStateOf<List<ScheduleDTO>>(emptyList())
    var teacherScheduleData by mutableStateOf<List<TeacherScheduleDetailDTO>>(emptyList())
    var isLoading by mutableStateOf(false)

    var currentWeekStart by mutableStateOf<LocalDate>(
        LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    )

    // Modify this to be called from the Screen with user info
    fun initFetch(userRole: String?, userId: Int?) {
        if (activeTurmas.isNotEmpty()) return // Already loaded

        viewModelScope.launch {
            try {
                if (userRole == "Student" && userId != null) {
                    val response = api.getStudentEnrollments(userId)
                    if (response.isSuccessful) {
                        // Map StudentEnrollmentDTO to TurmaDTO if the fields match
                        activeTurmas = response.body()?.map {
                            TurmaDTO(
                                turmaId = it.turmaId,
                                turmaName = it.turmaName,
                                courseId = it.courseId,
                                courseName = it.courseName,
                                isDeleted = it.isDeleted,
                                dateStart = it.dateStart,
                                dateEnd = it.dateEnd
                            )
                        } ?: emptyList()
                    }
                } else {
                    // Admin or other roles see everything
                    activeTurmas = api.getOngoingTurmas()
                }
            } catch (e: Exception) {
                Log.e("API", "Turmas fail: ${e.message}")
            }
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



    fun fetchTeacherSchedule(teacherId: Int) {
        viewModelScope.launch {
            isLoading = true
            try {
                // Sync the progress in the DB first
                val syncResponse = api.updatePastProgress()
                if (!syncResponse.isSuccessful) {
                    Log.e("API", "Sync progress failed: ${syncResponse.errorBody()?.string()}")
                }

                // Get the dates and fetch the data
                val start = currentWeekStart.atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                val end = currentWeekStart.plusDays(7).atTime(23, 59, 59).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)

                val response = api.getTeacherSchedule(teacherId, start, end)
                if (response.isSuccessful) {
                    teacherScheduleData = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e("API", "Teacher schedule chain failed: ${e.message}")
            } finally {
                isLoading = false
            }
        }
    }
}