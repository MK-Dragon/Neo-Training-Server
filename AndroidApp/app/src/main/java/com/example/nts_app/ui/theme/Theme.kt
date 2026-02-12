package com.example.nts_app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = BrandPink,
    secondary = DeepIndigo,
    background = SoftGray,
    // This controls the "White Box" (Card background)
    surfaceVariant = LightIndigoGray,
    // This controls the color of text inside that box
    onSurfaceVariant = DeepIndigo,
    // This controls the color of your Buttons
    primaryContainer = BrandPink,
    onPrimaryContainer = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = BrandPink,
    secondary = DeepIndigo,
    background = SoftGray,
    // This controls the "White Box" (Card background)
    surfaceVariant = LightIndigoGray,
    // This controls the color of text inside that box
    onSurfaceVariant = DeepIndigo,
    // This controls the color of your Buttons
    primaryContainer = LightBrandPink,
    onPrimaryContainer = Color.White
)

@Composable
fun NTS_APPTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // CHANGE THIS TO FALSE to stop Android from overriding your colors
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        // This block is what was making it look "Default/Purple"
        // based on your phone settings.
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}