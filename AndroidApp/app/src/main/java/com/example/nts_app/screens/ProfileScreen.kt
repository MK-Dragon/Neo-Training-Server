package com.example.nts_app.screens

import android.Manifest
import android.graphics.Bitmap
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.launch
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.nts_app.UserViewModel
import com.example.nts_app.network.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext



private fun bitmapToByteArray(bitmap: Bitmap): ByteArray {
    val stream = ByteArrayOutputStream()
    // Compress to JPEG at 90% quality to keep it small for the server
    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
    return stream.toByteArray()
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(viewModel: UserViewModel, apiService: ApiService, onNavigateBack: () -> Unit) {
    val user = viewModel.currentUser // Uses your com.example.nts_app.User class
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // State for API data
    var studentEnrollments by remember { mutableStateOf<List<StudentEnrollmentDTO>>(emptyList()) }
    var teacherCourses by remember { mutableStateOf<List<TeacherCourseDTO>>(emptyList()) }
    var teacherModules by remember { mutableStateOf<List<TeacherModuleDTO>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var imgTimestamp by remember { mutableStateOf(System.currentTimeMillis()) }
    var showPhotoOptions by remember { mutableStateOf(false) }

    // --- Image & Permission Launchers ---
    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            // Pass 'scope' as the 5th argument
            uploadImage(it, user?.userId, apiService, context, scope) {
                imgTimestamp = System.currentTimeMillis()
            }
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
        if (bitmap != null) {
            // We don't need scope.launch here because performUpload
            // handles the coroutine internally now.
            val byteArray = bitmapToByteArray(bitmap)
            performUpload(byteArray, user?.userId, apiService, context, scope) {
                imgTimestamp = System.currentTimeMillis()
            }
        }
    }

    // In your ProfileScreen composable
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            try {
                // Attempt to launch. If the device has no usable camera,
                // TakePicturePreview can occasionally trigger the crash you saw.
                cameraLauncher.launch()
            } catch (e: Exception) {
                Toast.makeText(context, "Camera could not be started", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(context, "Camera permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    // Fetch History Data logic
    LaunchedEffect(Unit) {
        try {
            if (user?.userRole?.lowercase() == "student") {
                val res = apiService.getStudentEnrollments(user.userId)
                if (res.isSuccessful) studentEnrollments = res.body() ?: emptyList()
            } else if (user?.userRole?.lowercase() == "teacher") {
                val coursesRes = apiService.getTeacherCourses(user.userId)
                val modulesRes = apiService.getTeacherModules(user.userId)
                if (coursesRes.isSuccessful) teacherCourses = coursesRes.body() ?: emptyList()
                if (modulesRes.isSuccessful) teacherModules = modulesRes.body() ?: emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("My Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // --- Profile Photo Section ---
            Box(contentAlignment = Alignment.BottomEnd) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(RetrofitClient.getProfileImageUrl(user?.userId)) // NO HARDCODED IP!
                        .crossfade(true)
                        .build(),
                    contentDescription = "Profile Picture",
                    modifier = Modifier
                        .size(130.dp)
                        .clip(CircleShape)
                        .border(4.dp, MaterialTheme.colorScheme.primary, CircleShape),
                    contentScale = ContentScale.Crop
                )
                SmallFloatingActionButton(
                    onClick = { showPhotoOptions = true },
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = "Edit", modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text("@${user?.username}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

            AssistChip(
                onClick = {},
                label = { Text(user?.userRole?.uppercase() ?: "ROLE") }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // --- Basic Info Card (Simplified) ---
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(user?.email ?: "N/A", style = MaterialTheme.typography.bodyLarge)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // --- History Section ---
            if (isLoading) {
                CircularProgressIndicator()
            } else {
                when (user?.userRole?.lowercase()) {
                    "student" -> StudentHistoryList(studentEnrollments)
                    "teacher" -> TeacherHistoryList(teacherCourses, teacherModules)
                }
            }
        }
    }

    if (showPhotoOptions) {
        AlertDialog(
            onDismissRequest = { showPhotoOptions = false },
            title = { Text("Update Photo") },
            text = { Text("Choose a source for your profile picture.") },
            confirmButton = {
                TextButton(onClick = { galleryLauncher.launch("image/*"); showPhotoOptions = false }) { Text("Gallery") }
            },
            dismissButton = {
                TextButton(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA); showPhotoOptions = false }) { Text("Camera") }
            }
        )
    }
}

@Composable
fun StudentHistoryList(enrollments: List<StudentEnrollmentDTO>) {
    Text("Academic Enrollments", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    Spacer(modifier = Modifier.height(8.dp))
    enrollments.forEach { enrollment ->
        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(enrollment.courseName ?: "Course", fontWeight = FontWeight.Bold)
                Text("Grade: ${enrollment.average}/20", color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
fun TeacherHistoryList(courses: List<TeacherCourseDTO>, modules: List<TeacherModuleDTO>) {
    Text("Assigned Courses", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    courses.forEach { course ->
        Text("• ${course.courseName}", modifier = Modifier.padding(vertical = 4.dp))
    }
}

// --- Helper Functions for Image Processing ---

private fun uploadImage(
    uri: Uri,
    userId: Int?,
    apiService: ApiService,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope, // Add this
    onSuccess: () -> Unit
) {
    val bytes = context.contentResolver.openInputStream(uri)?.readBytes() ?: return
    performUpload(bytes, userId, apiService, context, scope, onSuccess) // Pass scope here
}

private fun uploadBitmap(
    bitmap: Bitmap,
    userId: Int?,
    apiService: ApiService,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope, // Add this
    onSuccess: () -> Unit
) {
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
    performUpload(stream.toByteArray(), userId, apiService, context, scope, onSuccess) // Pass scope here
}

private fun performUpload(
    bytes: ByteArray,
    userId: Int?,
    apiService: ApiService,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope, // Add this
    onSuccess: () -> Unit
) {
    val requestFile = bytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
    val body = MultipartBody.Part.createFormData("file", "profile_${userId}.jpg", requestFile)

    scope.launch(Dispatchers.IO) { // Use the passed scope
        try {
            val response = apiService.uploadProfileImage(userId ?: 0, body)
            withContext(Dispatchers.Main) {
                if (response.isSuccessful) {
                    onSuccess()
                    Toast.makeText(context, "Profile updated successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Server error: ${response.code()}", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Network error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}