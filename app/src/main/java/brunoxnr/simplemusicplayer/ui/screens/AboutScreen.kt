package brunoxnr.simplemusicplayer.ui.screens

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import brunoxnr.simplemusicplayer.BuildConfig
import brunoxnr.simplemusicplayer.R

private const val APACHE_LICENSE_URL = "https://www.apache.org/licenses/LICENSE-2.0"

/** Open source libraries shipped in the app, all under the Apache License 2.0 */
private val openSourceLibraries = listOf(
    "AndroidX Jetpack (Compose, Material 3, Media3 / ExoPlayer, Room, Lifecycle, AppCompat)" to "Google",
    "Kotlin, kotlinx.coroutines" to "JetBrains",
    "Guava" to "Google",
    "Reorderable" to "Calvin Liang",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(onBack: () -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val supportEmail = stringResource(R.string.support_email)
    val emailSubject = stringResource(R.string.about_support_subject, BuildConfig.VERSION_NAME)
    var showLicenses by rememberSaveable { mutableStateOf(false) }

    Column(modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(stringResource(R.string.about_title)) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = stringResource(R.string.action_back))
                }
            },
        )

        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                // Same layers as the launcher icon, so it follows any future icon redesign.
                // Scaled 1.5x because launchers only show the central 72dp of the 108dp layer.
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .clip(CircleShape)
                        .background(colorResource(R.color.ic_launcher_background)),
                ) {
                    Image(
                        painterResource(R.drawable.ic_launcher_foreground),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize().scale(1.5f),
                    )
                }
                Text(
                    stringResource(R.string.app_name),
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(top = 12.dp),
                )
                Text(
                    stringResource(R.string.about_version, BuildConfig.VERSION_NAME),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    stringResource(R.string.about_tagline),
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            HorizontalDivider(Modifier.padding(vertical = 8.dp))

            AboutRow(
                icon = { Icon(Icons.Outlined.Lock, contentDescription = null) },
                title = stringResource(R.string.about_privacy_title),
                subtitle = stringResource(R.string.about_privacy_text),
            )
            if (supportEmail.isNotBlank()) {
                AboutRow(
                    icon = { Icon(Icons.Outlined.Email, contentDescription = null) },
                    title = stringResource(R.string.about_support),
                    subtitle = supportEmail,
                    onClick = { context.sendEmail(supportEmail, emailSubject) },
                )
            }
            AboutRow(
                icon = { Icon(Icons.Outlined.Code, contentDescription = null) },
                title = stringResource(R.string.about_licenses),
                subtitle = stringResource(R.string.about_licenses_summary),
                onClick = { showLicenses = true },
            )
        }
    }

    if (showLicenses) {
        AlertDialog(
            onDismissRequest = { showLicenses = false },
            title = { Text(stringResource(R.string.about_licenses)) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(stringResource(R.string.about_licenses_intro))
                    openSourceLibraries.forEach { (name, author) ->
                        Column {
                            Text(name, style = MaterialTheme.typography.bodyLarge)
                            Text(
                                author,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLicenses = false }) { Text(stringResource(R.string.action_close)) }
            },
            dismissButton = {
                TextButton(onClick = { context.openUrl(APACHE_LICENSE_URL) }) {
                    Text(stringResource(R.string.about_view_license))
                }
            },
        )
    }
}

@Composable
private fun AboutRow(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null,
) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(subtitle) },
        leadingContent = icon,
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier,
    )
}

private fun Context.sendEmail(address: String, subject: String) {
    val intent = Intent(Intent.ACTION_SENDTO, "mailto:".toUri()).apply {
        putExtra(Intent.EXTRA_EMAIL, arrayOf(address))
        putExtra(Intent.EXTRA_SUBJECT, subject)
    }
    // No email app installed: the address stays visible on screen
    try {
        startActivity(intent)
    } catch (_: ActivityNotFoundException) {
    }
}

private fun Context.openUrl(url: String) {
    try {
        startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
    } catch (_: ActivityNotFoundException) {
    }
}
