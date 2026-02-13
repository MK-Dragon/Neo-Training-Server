package com.example.nts_app.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

object RetrofitClient {
    private var currentBaseUrl = "https://127.0.0.1:7089/"
    fun getBaseUrl() = currentBaseUrl


    private var authToken: String? = null

    fun setToken(token: String) {
        authToken = token
    }

    /**
     * Function to update the IP from the Login Screen.
     * It rebuilds the apiService with the new URL.
     */
    fun updateBaseUrl(newIp: String) {
        if (newIp.isBlank()) return

        // CRITICAL FIX: Remove all spaces from the IP/Host string
        val cleanIp = newIp.replace(" ", "").trim()

        currentBaseUrl = when {
            cleanIp.startsWith("http") -> if (cleanIp.endsWith("/")) cleanIp else "$cleanIp/"
            else -> "https://$cleanIp:7089/"
        }

        try {
            apiService = buildApiService()
            println("RETROFIT_DEBUG: Successfully updated to $currentBaseUrl")
        } catch (e: Exception) {
            // This prevents a crash if the URL is still somehow malformed
            e.printStackTrace()
        }
    }

    val okHttpClient: OkHttpClient by lazy {
        try {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })

            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, SecureRandom())

            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            OkHttpClient.Builder()
                .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
                .hostnameVerifier { _, _ -> true }
                .addInterceptor { chain ->
                    val original = chain.request()
                    val requestBuilder = original.newBuilder()
                    authToken?.let {
                        requestBuilder.header("Authorization", "Bearer $it")
                    }
                    chain.proceed(requestBuilder.build())
                }
                .addInterceptor(logging)
                .connectTimeout(15, TimeUnit.SECONDS) // Slightly shorter for better feedback
                .build()
        } catch (e: Exception) {
            throw RuntimeException(e)
        }
    }

    // Change 1: apiService is no longer 'lazy'. It's a var that we can overwrite.
    @Volatile
    var apiService: ApiService = buildApiService()
        private set

    // Change 2: Helper function to build the service
    private fun buildApiService(): ApiService {
        return Retrofit.Builder()
            .baseUrl(currentBaseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    // Inside RetrofitClient.kt
    fun getProfileImageUrl(userId: Int?): String {
        if (userId == null) return ""
        // It uses currentBaseUrl, which changes when you update settings!
        return "${currentBaseUrl}api/DownloadUpload/profile-image/$userId"
    }
}