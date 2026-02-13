package com.example.nts_app.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

import okhttp3.MultipartBody
import retrofit2.http.Multipart
import retrofit2.http.Part
import okhttp3.ResponseBody
import retrofit2.http.Streaming


// --- 1. Data Models (Defined first so the Interface can see them) ---

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val username: String,
    val role: String,
    val requestId: String
)

data class TwoFAResponse(
    val verified: Boolean,
    val token: String?
)

/** * Note: If AppUser is in the same folder (com.example.nts_app.network),
 * we don't need an import. If it is in the main folder,
 * use: import com.example.nts_app.AppUser
 */


// --- 2. The API Endpoints ---

interface ApiService {
    // Login
    @POST("api/Api/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/Api/check-2fa-status/{requestId}")
    suspend fun check2FA(@Path("requestId") requestId: String): Response<TwoFAResponse>

    // User INFO
    @GET("api/User/users/{username}")
    suspend fun getUserProfile(@Path("username") username: String): Response<AppUser>


    @Streaming
    @GET("api/DownloadUpload/profile-image/{userId}")
    suspend fun downloadProfileImage(@Path("userId") userId: Int): Response<ResponseBody>

    @Multipart
    @POST("api/DownloadUpload/upload-profile-image/{userId}")
    suspend fun uploadProfileImage(
        @Path("userId") userId: Int,
        @Part file: MultipartBody.Part
    ): Response<Unit>


    @GET("api/Student/student/{id}/enrolled-turmas")
    suspend fun getStudentEnrollments(@Path("id") userId: Int): Response<List<StudentEnrollmentDTO>>

    @GET("api/Statistics/courses-history/{id}")
    suspend fun getTeacherCourses(@Path("id") userId: Int): Response<List<TeacherCourseDTO>>

    @GET("api/Statistics/modules-history/{id}")
    suspend fun getTeacherModules(@Path("id") userId: Int): Response<List<TeacherModuleDTO>>


    // Courses
    @GET("api/Courses/all-courses-summary")
    suspend fun getCourses(): List<Course>


    // Teachers
    @GET("api/Teacher/teachers-list")
    suspend fun getTeachers(): List<UserSimple>

    @GET("api/Statistics/teacher-module-history/{teacherId}")
    suspend fun getTeacherHistory(@Path("teacherId") teacherId: Int): List<TeacherModuleHistoryDTO>


    // Students
    @GET("api/Statistics/ongoing-stats-courses-students")
    suspend fun getOngoingStats(): OngoingStatsDTO

    @GET("api/Turma/ongoing")
    suspend fun getOngoingTurmas(): List<TurmaDTO>

    @GET("api/Turma/list-students/{turmaId}")
    suspend fun getStudentsByTurma(@Path("turmaId") turmaId: Int): List<StudentInTurmaDTO>


    // Salas
    @GET("api/Salas/available-rooms-range")
    suspend fun getAvailableRooms(
        @Query("start") start: String,
        @Query("end") end: String
    ): List<Sala>


    // Schedule
    @GET("api/Shcedule/schedules-filter")
    suspend fun getSchedulesFilter(
        @Query("start") start: String,
        @Query("end") end: String,
        @Query("turmaId") turmaId: Int
    ): List<ScheduleDTO>
}