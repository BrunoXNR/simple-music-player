package brunoxnr.simplemusicplayer.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import brunoxnr.simplemusicplayer.data.ThemeColor

/**
 * Material 3 theme in the user's chosen color: the wallpaper colors (Android 12+) or a fixed palette.
 * Light/dark comes from the configuration, which AppCompat sets from the theme mode setting.
 */
@Composable
fun SimpleMusicTheme(color: ThemeColor, content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val context = LocalContext.current
    val colors = if (color == ThemeColor.WALLPAPER && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    } else {
        color.scheme(dark)
    }
    MaterialTheme(colorScheme = colors, content = content)
}

/** Fixed palette for [this] color; the wallpaper choice falls back to teal where unavailable */
fun ThemeColor.scheme(dark: Boolean): ColorScheme = when (this) {
    ThemeColor.WALLPAPER, ThemeColor.TEAL -> if (dark) TealDark else TealLight
    ThemeColor.AMBER -> if (dark) AmberDark else AmberLight
    ThemeColor.BLUE -> if (dark) BlueDark else BlueLight
    ThemeColor.PURPLE -> if (dark) PurpleDark else PurpleLight
    ThemeColor.GREEN -> if (dark) GreenDark else GreenLight
    ThemeColor.PINK -> if (dark) PinkDark else PinkLight
}
