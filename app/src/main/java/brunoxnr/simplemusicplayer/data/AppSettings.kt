package brunoxnr.simplemusicplayer.data

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.LocaleList
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.edit
import androidx.core.os.LocaleListCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemeMode { SYSTEM, LIGHT, DARK }

/** [WALLPAPER] is Android's dynamic color (Android 12+); the others are fixed palettes */
enum class ThemeColor { WALLPAPER, TEAL, AMBER, BLUE, PURPLE, GREEN, PINK }

/** Languages the app is translated to; [tag] is empty for "follow the system" */
enum class AppLanguage(val tag: String) { SYSTEM(""), ENGLISH("en"), PORTUGUESE("pt"), SPANISH("es") }

/**
 * Appearance and language preferences. Light/dark mode and language go through AppCompat, which
 * applies them to the whole UI (including system bars and translated resources); the language
 * choice is also stored by AppCompat and, on Android 13+, synced with the system setting.
 */
class AppSettings(context: Context) {

    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    private val _themeMode = MutableStateFlow(
        prefs.getString(KEY_THEME_MODE, null)?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() } ?: ThemeMode.SYSTEM
    )
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    private val _themeColor = MutableStateFlow(
        prefs.getString(KEY_THEME_COLOR, null)
            ?.let { runCatching { ThemeColor.valueOf(it) }.getOrNull() }
            ?.takeIf { it != ThemeColor.WALLPAPER || isWallpaperColorAvailable }
            ?: if (isWallpaperColorAvailable) ThemeColor.WALLPAPER else ThemeColor.TEAL
    )
    val themeColor: StateFlow<ThemeColor> = _themeColor.asStateFlow()

    val language: AppLanguage
        get() {
            val tag = AppCompatDelegate.getApplicationLocales().toLanguageTags()
            return AppLanguage.entries.firstOrNull { it != AppLanguage.SYSTEM && tag.startsWith(it.tag) } ?: AppLanguage.SYSTEM
        }

    /** Call once at startup, before any activity is created */
    fun applyThemeMode() {
        AppCompatDelegate.setDefaultNightMode(_themeMode.value.toNightMode())
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit { putString(KEY_THEME_MODE, mode.name) }
        _themeMode.value = mode
        AppCompatDelegate.setDefaultNightMode(mode.toNightMode())
    }

    fun setThemeColor(color: ThemeColor) {
        prefs.edit { putString(KEY_THEME_COLOR, color.name) }
        _themeColor.value = color
    }

    fun setLanguage(language: AppLanguage) {
        // Own copy for localized(): AppCompat only loads its stored choice once an activity starts
        prefs.edit { putString(KEY_LANGUAGE, language.tag) }
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language.tag))
    }

    /**
     * [context] with the in-app language. On Android 12 and below AppCompat only applies it to
     * activities, so texts built by the application or the playback service would otherwise stay
     * in the system language. Android 13+ applies it to every context by itself.
     */
    fun localized(context: Context): Context {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return context
        val tag = AppCompatDelegate.getApplicationLocales().toLanguageTags()
            .ifEmpty { prefs.getString(KEY_LANGUAGE, null).orEmpty() }
        if (tag.isEmpty()) return context
        val config = Configuration(context.resources.configuration).apply { setLocales(LocaleList.forLanguageTags(tag)) }
        return context.createConfigurationContext(config)
    }

    private fun ThemeMode.toNightMode(): Int = when (this) {
        ThemeMode.SYSTEM -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        ThemeMode.LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
        ThemeMode.DARK -> AppCompatDelegate.MODE_NIGHT_YES
    }

    companion object {
        private const val KEY_THEME_MODE = "theme_mode"
        private const val KEY_THEME_COLOR = "theme_color"
        private const val KEY_LANGUAGE = "language"

        val isWallpaperColorAvailable: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    }
}
