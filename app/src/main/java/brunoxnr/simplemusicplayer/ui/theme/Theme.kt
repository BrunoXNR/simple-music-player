package brunoxnr.simplemusicplayer.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// Teal fallback palette (same as the web prototype) for devices without dynamic color
private val LightColors = lightColorScheme(
    primary = Color(0xFF006A67),
    onPrimary = Color.White,
    primaryContainer = Color(0xFF71F7F0),
    onPrimaryContainer = Color(0xFF00201F),
    secondaryContainer = Color(0xFFCCE8E5),
    onSecondaryContainer = Color(0xFF051F1E),
    surface = Color(0xFFF4FBF9),
    surfaceVariant = Color(0xFFDAE5E3),
    outline = Color(0xFF6F7978),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF50DBD4),
    onPrimary = Color(0xFF003735),
    primaryContainer = Color(0xFF00504D),
    onPrimaryContainer = Color(0xFF71F7F0),
    secondaryContainer = Color(0xFF324B49),
    onSecondaryContainer = Color(0xFFCCE8E5),
    surface = Color(0xFF0E1514),
    surfaceVariant = Color(0xFF3F4948),
    outline = Color(0xFF889392),
)

/** Material 3 theme: follows the wallpaper colors on Android 12+, and the system dark mode */
@Composable
fun SimpleMusicTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val context = LocalContext.current
    val colors = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        dark -> DarkColors
        else -> LightColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
