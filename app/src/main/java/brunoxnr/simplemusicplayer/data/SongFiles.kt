package brunoxnr.simplemusicplayer.data

import android.content.ContentValues
import android.content.Context
import android.content.IntentSender
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.content.edit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Renames and deletes audio files. Since Android 11 the system asks the user for consent
 * ([MediaStore.createWriteRequest] / [MediaStore.createTrashRequest]), so no extra permission
 * is needed. Older versions would need legacy write access, so they don't get these actions.
 *
 * Both keep the MediaStore id stable, so favorites and playlists are not affected
 * (a song restored from the trash comes back with them).
 */
class SongFiles(private val context: Context, private val renamedTitles: RenamedTitles) {

    @RequiresApi(Build.VERSION_CODES.R)
    fun writeRequest(song: Song): IntentSender =
        MediaStore.createWriteRequest(context.contentResolver, listOf(song.uri)).intentSender

    /** Moves the files to the system trash, where they can be restored for about 30 days */
    @RequiresApi(Build.VERSION_CODES.R)
    fun trashRequest(songs: List<Song>): IntentSender =
        MediaStore.createTrashRequest(context.contentResolver, songs.map { it.uri }, true).intentSender

    /** Renames the file, keeping its extension. Call only after [writeRequest] was granted. */
    suspend fun rename(song: Song, newBaseName: String): Boolean = withContext(Dispatchers.IO) {
        val storedTitle = storedTitle(song)
        val values = ContentValues().apply {
            put(MediaStore.Audio.Media.DISPLAY_NAME, newBaseName + song.fileExtension)
        }
        val renamed = try {
            context.contentResolver.update(song.uri, values, null, null) > 0
        } catch (e: Exception) {
            // e.g. a file with that name already exists, or the storage is read-only
            Log.w(TAG, "Could not rename ${song.fileName}", e)
            false
        }
        // Untagged: the title came from the file name (or from an earlier rename) and is now stale
        if (renamed && storedTitle != null &&
            (storedTitle == song.fileBaseName || renamedTitles.isStale(song.id, storedTitle))
        ) {
            renamedTitles.remember(song.id, storedTitle)
        }
        renamed
    }

    /** The raw MediaStore title ([Song.title] may have been parsed from the file name) */
    private fun storedTitle(song: Song): String? =
        context.contentResolver.query(song.uri, arrayOf(MediaStore.Audio.Media.TITLE), null, null, null)
            ?.use { if (it.moveToFirst()) it.getString(0) else null }

    companion object {
        private const val TAG = "SongFiles"

        /** Characters not allowed in file names on internal storage or FAT/exFAT SD cards */
        private val INVALID_FILE_NAME_CHARS = Regex("""[\\/:*?"<>|]""")

        fun isValidBaseName(name: String): Boolean =
            name.isNotBlank() && !name.contains(INVALID_FILE_NAME_CHARS) && !name.startsWith(".")
    }
}

/**
 * MediaStore keeps an untagged file's title (taken from its old file name) after a rename, can't
 * be told otherwise, and only rescans when the content changes. Remembers those stale titles so
 * the scanner shows the new file name instead. Once MediaStore rescans, the title no longer
 * matches and the entry stops applying.
 */
class RenamedTitles(context: Context) {
    private val prefs = context.getSharedPreferences("renamed_titles", Context.MODE_PRIVATE)

    fun remember(songId: Long, staleTitle: String) {
        prefs.edit { putString(songId.toString(), staleTitle) }
    }

    fun isStale(songId: Long, storedTitle: String?): Boolean =
        storedTitle != null && prefs.getString(songId.toString(), null) == storedTitle
}

/** ".mp3", or "" when the file has no extension */
val Song.fileExtension: String
    get() = fileName.substringAfterLast('.', "").let { if (it.isEmpty()) "" else ".$it" }

val Song.fileBaseName: String
    get() = fileName.removeSuffix(fileExtension)
