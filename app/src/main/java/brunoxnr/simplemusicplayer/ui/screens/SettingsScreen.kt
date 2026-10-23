package brunoxnr.simplemusicplayer.ui.screens

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.AppLanguage
import brunoxnr.simplemusicplayer.data.AppSettings
import brunoxnr.simplemusicplayer.data.ThemeColor
import brunoxnr.simplemusicplayer.data.ThemeMode
import brunoxnr.simplemusicplayer.ui.theme.scheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    themeMode: ThemeMode,
    themeColor: ThemeColor,
    language: AppLanguage,
    onThemeModeChange: (ThemeMode) -> Unit,
    onThemeColorChange: (ThemeColor) -> Unit,
    onLanguageChange: (AppLanguage) -> Unit,
    onOpenAbout: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showLanguages by rememberSaveable { mutableStateOf(false) }

    Column(modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(stringResource(R.string.settings_title)) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = stringResource(R.string.action_back))
                }
            },
        )

        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            SectionHeader(stringResource(R.string.settings_appearance))

            Text(
                stringResource(R.string.settings_theme),
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                ThemeMode.entries.forEachIndexed { index, mode ->
                    SegmentedButton(
                        selected = mode == themeMode,
                        onClick = { onThemeModeChange(mode) },
                        shape = SegmentedButtonDefaults.itemShape(index, ThemeMode.entries.size),
                    ) {
                        Text(stringResource(mode.labelRes()))
                    }
                }
            }

            Text(
                stringResource(R.string.settings_color),
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 4.dp),
            )
            Text(
                stringResource(themeColor.labelRes()),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            ColorChoices(
                selected = themeColor,
                onSelect = onThemeColorChange,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            )

            SectionHeader(stringResource(R.string.settings_language))
            SettingsRow(
                icon = { Icon(Icons.Outlined.Language, contentDescription = null) },
                title = stringResource(R.string.settings_language),
                subtitle = stringResource(language.labelRes()),
                onClick = { showLanguages = true },
            )

            SectionHeader(stringResource(R.string.about_title))
            SettingsRow(
                icon = { Icon(Icons.Outlined.Info, contentDescription = null) },
                title = stringResource(R.string.about_title),
                subtitle = stringResource(R.string.app_name),
                onClick = onOpenAbout,
            )
        }
    }

    if (showLanguages) {
        LanguageDialog(
            selected = language,
            onSelect = {
                showLanguages = false
                onLanguageChange(it)
            },
            onDismiss = { showLanguages = false },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ColorChoices(selected: ThemeColor, onSelect: (ThemeColor) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val colors = ThemeColor.entries.filter { it != ThemeColor.WALLPAPER || AppSettings.isWallpaperColorAvailable }
    FlowRow(
        modifier = modifier.selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        colors.forEach { color ->
            // The swatch shows each choice's light primary color, whatever the current mode
            val swatch = if (color == ThemeColor.WALLPAPER && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                dynamicLightColorScheme(context).primary
            } else {
                color.scheme(dark = false).primary
            }
            val isSelected = color == selected
            val label = stringResource(color.labelRes())
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(swatch)
                    .then(
                        if (isSelected) Modifier.border(3.dp, MaterialTheme.colorScheme.onSurface, CircleShape)
                        else Modifier
                    )
                    .selectable(selected = isSelected, role = Role.RadioButton, onClick = { onSelect(color) })
                    .semantics { contentDescription = label },
                contentAlignment = Alignment.Center,
            ) {
                when {
                    isSelected -> Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White)
                    color == ThemeColor.WALLPAPER -> Icon(Icons.Rounded.Wallpaper, contentDescription = null, tint = Color.White)
                }
            }
        }
    }
}

@Composable
private fun LanguageDialog(selected: AppLanguage, onSelect: (AppLanguage) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_language)) },
        text = {
            Column(Modifier.selectableGroup()) {
                AppLanguage.entries.forEach { language ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = language == selected,
                                role = Role.RadioButton,
                                onClick = { onSelect(language) },
                            )
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = language == selected, onClick = null)
                        Text(stringResource(language.labelRes()), modifier = Modifier.padding(start = 16.dp))
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) } },
    )
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 4.dp),
    )
}

@Composable
private fun SettingsRow(icon: @Composable () -> Unit, title: String, subtitle: String, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(subtitle) },
        leadingContent = icon,
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = Modifier.clickable(onClick = onClick),
    )
}

private fun ThemeMode.labelRes(): Int = when (this) {
    ThemeMode.SYSTEM -> R.string.theme_system
    ThemeMode.LIGHT -> R.string.theme_light
    ThemeMode.DARK -> R.string.theme_dark
}

private fun ThemeColor.labelRes(): Int = when (this) {
    ThemeColor.WALLPAPER -> R.string.color_wallpaper
    ThemeColor.TEAL -> R.string.color_teal
    ThemeColor.AMBER -> R.string.color_amber
    ThemeColor.BLUE -> R.string.color_blue
    ThemeColor.PURPLE -> R.string.color_purple
    ThemeColor.GREEN -> R.string.color_green
    ThemeColor.PINK -> R.string.color_pink
}

private fun AppLanguage.labelRes(): Int = when (this) {
    AppLanguage.SYSTEM -> R.string.language_system
    AppLanguage.ENGLISH -> R.string.language_english
    AppLanguage.PORTUGUESE -> R.string.language_portuguese
    AppLanguage.SPANISH -> R.string.language_spanish
}
