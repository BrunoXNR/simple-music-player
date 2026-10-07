export interface AndroidFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const ANDROID_FILES: AndroidFile[] = [
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/minimalist/music/MainActivity.kt',
    language: 'kotlin',
    description: 'Single-Activity Architecture with Jetpack Compose, Material 3 dynamic color, and NavigationBar',
    content: `package com.minimalist.music

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.minimalist.music.ui.screens.MainScreen
import com.minimalist.music.ui.theme.MinimalistMusicTheme
import com.minimalist.music.viewmodel.MusicViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MusicViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MinimalistMusicTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainScreen(viewModel = viewModel)
                }
            }
        }
    }
}`
  },
  {
    name: 'AudioScanner.kt',
    path: 'app/src/main/java/com/minimalist/music/data/AudioScanner.kt',
    language: 'kotlin',
    description: 'MediaStore query scanning local .mp3 and .wav audio files with metadata',
    content: `package com.minimalist.music.data

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import com.minimalist.music.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AudioScanner(private val context: Context) {

    suspend fun scanLocalAudio(): List<Song> = withContext(Dispatchers.IO) {
        val songList = mutableListOf<Song>()
        val collection: Uri = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        }

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.SIZE
        )

        // Filter only .mp3 and .wav files as requested
        val selection = "\${MediaStore.Audio.Media.IS_MUSIC} != 0 AND (" +
                "\${MediaStore.Audio.Media.MIME_TYPE} = ? OR " +
                "\${MediaStore.Audio.Media.MIME_TYPE} = ? OR " +
                "\${MediaStore.Audio.Media.DISPLAY_NAME} LIKE '%.mp3' OR " +
                "\${MediaStore.Audio.Media.DISPLAY_NAME} LIKE '%.wav')"

        val selectionArgs = arrayOf("audio/mpeg", "audio/x-wav")
        val sortOrder = "\${MediaStore.Audio.Media.TITLE} ASC"

        context.contentResolver.query(
            collection,
            projection,
            selection,
            selectionArgs,
            sortOrder
        )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val displayNameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
            val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val title = cursor.getString(titleColumn) ?: "Unknown Title"
                val artist = cursor.getString(artistColumn) ?: "Unknown Artist"
                val album = cursor.getString(albumColumn) ?: "Unknown Album"
                val durationMs = cursor.getLong(durationColumn)
                val displayName = cursor.getString(displayNameColumn) ?: ""
                val size = cursor.getLong(sizeColumn)

                val contentUri = ContentUris.withAppendedId(collection, id)
                val format = if (displayName.endsWith(".wav", ignoreCase = true)) "wav" else "mp3"

                songList.add(
                    Song(
                        id = id.toString(),
                        title = title,
                        artist = if (artist == "<unknown>") "Unknown Artist" else artist,
                        album = album,
                        duration = (durationMs / 1000).toInt(),
                        uri = contentUri.toString(),
                        fileName = displayName,
                        format = format,
                        size = size
                    )
                )
            }
        }
        songList
    }
}`
  },
  {
    name: 'MusicPlayerService.kt',
    path: 'app/src/main/java/com/minimalist/music/service/MusicPlayerService.kt',
    language: 'kotlin',
    description: 'AndroidX Media3 MediaSessionService with ExoPlayer and foreground notification',
    content: `package com.minimalist.music.service

import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class MusicPlayerService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private lateinit var player: ExoPlayer

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        mediaSession = MediaSession.Builder(this, player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}`
  },
  {
    name: 'RoomDatabase.kt',
    path: 'app/src/main/java/com/minimalist/music/data/db/AppDatabase.kt',
    language: 'kotlin',
    description: 'Room Entities and DAO for custom playlists and manual ordering',
    content: `package com.minimalist.music.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey val id: String,
    val name: String,
    val createdAt: Long,
    val songIdsJson: String // Serialized JSON array preserving custom manual song order
)

@Dao
interface PlaylistDao {
    @Query("SELECT * FROM playlists ORDER BY createdAt DESC")
    fun getAllPlaylists(): Flow<List<PlaylistEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlaylist(playlist: PlaylistEntity)

    @Update
    suspend fun updatePlaylist(playlist: PlaylistEntity)

    @Delete
    suspend fun deletePlaylist(playlist: PlaylistEntity)
}

@Database(entities = [PlaylistEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun playlistDao(): PlaylistDao
}`
  },
  {
    name: 'ExportHelper.kt',
    path: 'app/src/main/java/com/minimalist/music/util/ExportHelper.kt',
    language: 'kotlin',
    description: 'Storage Access Framework (SAF) Intent.ACTION_CREATE_DOCUMENT export for .txt and .csv',
    content: `package com.minimalist.music.util

import android.content.Context
import android.net.Uri
import com.minimalist.music.model.Song
import java.io.OutputStreamWriter
import java.util.Locale

object ExportHelper {

    fun formatDuration(seconds: Int): String {
        val m = seconds / 60
        val s = seconds % 60
        return String.format(Locale.getDefault(), "%02d:%02d", m, s)
    }

    /**
     * Builds playlist string formatted as "Title - Artist (Duration)"
     */
    fun buildExportString(songs: List<Song>, isCsv: Boolean): String {
        return if (isCsv) {
            val sb = StringBuilder("Title,Artist,Duration,Formatted\\n")
            songs.forEach { song ->
                val durationStr = formatDuration(song.duration)
                val line = "\\"\${song.title.replace("\\"", "\\"\\")}\\",\\"\${song.artist.replace("\\"", "\\"\\")}\\",\\"$durationStr\\",\\"\${song.title} - \${song.artist} ($durationStr)\\"\\n"
                sb.append(line)
            }
            sb.toString()
        } else {
            val sb = StringBuilder()
            songs.forEach { song ->
                val durationStr = formatDuration(song.duration)
                sb.append("\${song.title} - \${song.artist} ($durationStr)\\n")
            }
            sb.toString()
        }
    }

    fun writeToUri(context: Context, uri: Uri, content: String) {
        context.contentResolver.openOutputStream(uri)?.use { outputStream ->
            OutputStreamWriter(outputStream).use { writer ->
                writer.write(content)
            }
        }
    }
}`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Permissions for READ_MEDIA_AUDIO, READ_EXTERNAL_STORAGE, and MediaSessionService declaration',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Android 13+ Granular Audio Permission -->
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    
    <!-- Legacy Storage Permission for Android 12 and below -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />

    <!-- Foreground service for continuous background playback -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".MinimalistMusicApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MinimalistMusic">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.MinimalistMusic">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- MediaSessionService for AndroidX Media3 background playback -->
        <service
            android:name=".service.MusicPlayerService"
            android:exported="true"
            android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>

    </application>

</manifest>`
  },
  {
    name: 'build.gradle.kts (Module: app)',
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    description: 'Target SDK 35, Media3, Room, Compose dependencies, R8/ProGuard and signing setup',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.minimalist.music"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.minimalist.music"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // Trocar por release keystore para Play Store
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & Lifecycle
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Jetpack Compose & Material 3
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    // Media3 (ExoPlayer & MediaSession)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
    implementation(libs.androidx.media3.common)

    // Room Database (Local Playlists)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Image loading for album artwork (Coil)
    implementation(libs.coil.compose)

    // Splashscreen API
    implementation(libs.androidx.core.splashscreen)
}`
  },
  {
    name: 'proguard-rules.pro',
    path: 'app/proguard-rules.pro',
    language: 'pro',
    description: 'R8/ProGuard configuration preserving Media3, Room, and Kotlin coroutines',
    content: `# Minimalist Music Player - R8/ProGuard Rules

# Room Database
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# AndroidX Media3 & ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Coroutines
-keepattributes *Annotation*, InnerClasses
-dontwarn kotlinx.coroutines.**

# Retain Parcelable & Serializable
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}
-keepnames class * implements java.io.Serializable`
  },
  {
    name: 'PrivacyPolicy.md',
    path: 'PRIVACY_POLICY.md',
    language: 'markdown',
    description: 'Pronto para publicação na Play Store (declaração de zero coleta de dados / 100% offline)',
    content: `# Política de Privacidade - Minimalist Music Player

**Última atualização:** Setembro de 2026

O **Minimalist Music Player** foi desenvolvido com foco total em privacidade, leveza e minimalismo.

### 1. Coleta de Dados
O aplicativo **NÃO coleta, NÃO armazena e NÃO transmite** nenhum tipo de dado pessoal, identificador de dispositivo, localização ou informação de uso para servidores externos.

### 2. Arquivos de Áudio e Permissões
- O aplicativo solicita permissão de leitura de áudio (\`READ_MEDIA_AUDIO\` no Android 13+ e \`READ_EXTERNAL_STORAGE\` em versões anteriores) estritamente para escanear, indexar e reproduzir os arquivos de música locais (.mp3 e .wav) armazenados na memória do seu dispositivo.
- Nenhum arquivo é transferido ou sincronizado com a internet. O aplicativo opera **100% offline**.

### 3. Playlists e Armazenamento Local
Suas listas de reprodução e preferências de tema são gravadas exclusivamente no banco de dados local do seu dispositivo (Room Database). Ao desinstalar o aplicativo ou limpar os dados, essas informações são apagadas.

### 4. Contato
Para dúvidas ou suporte, entre em contato através do repositório oficial do projeto.`
  }
];
