package brunoxnr.simplemusicplayer.data

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import brunoxnr.simplemusicplayer.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Reads the device's music library from the system MediaStore (no manual import needed:
 * Android already indexes every audio file on internal storage and SD cards).
 */
class MediaStoreScanner(private val context: Context, private val renamedTitles: RenamedTitles) {

    suspend fun scan(): List<Song> = withContext(Dispatchers.IO) {
        try {
            query()
        } catch (e: SecurityException) {
            Log.w(TAG, "No permission to read audio files", e)
            emptyList()
        }
    }

    private fun query(): List<Song> {
        val folderColumn =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Audio.Media.RELATIVE_PATH
            else @Suppress("DEPRECATION") MediaStore.Audio.Media.DATA

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.DATE_ADDED,
            MediaStore.Audio.Media.TRACK,
            folderColumn,
        )

        val unknownArtist = context.getString(R.string.unknown_artist)
        val unknownAlbum = context.getString(R.string.unknown_album)
        val songs = mutableListOf<Song>()

        context.contentResolver.query(
            COLLECTION_URI,
            projection,
            "${MediaStore.Audio.Media.IS_MUSIC} != 0",
            null,
            null,
        )?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
            val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
            val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
            val trackCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TRACK)
            val folderCol = cursor.getColumnIndexOrThrow(folderColumn)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idCol)
                val fileName = cursor.getString(nameCol).orEmpty()
                val baseName = fileName.substringBeforeLast('.').ifBlank { fileName }
                val storedTitle = cursor.getString(titleCol)
                var title = (if (renamedTitles.isStale(id, storedTitle)) null else storedTitle.cleanTag()) ?: baseName
                var artist = cursor.getString(artistCol).cleanTag()
                // No tags: MediaStore uses the file name as title; recover artist / title from it
                if (artist == null && title == baseName) {
                    val (parsedArtist, parsedTitle) = parseFileName(baseName)
                    artist = parsedArtist
                    title = parsedTitle
                }
                songs += Song(
                    id = id,
                    title = title,
                    artist = artist ?: unknownArtist,
                    album = cursor.getString(albumCol).cleanTag() ?: unknownAlbum,
                    albumId = cursor.getLong(albumIdCol),
                    durationMs = cursor.getLong(durationCol),
                    folder = cursor.getString(folderCol).toFolder(),
                    fileName = fileName,
                    dateAddedSec = cursor.getLong(dateCol),
                    track = cursor.getInt(trackCol),
                )
            }
        }
        return songs
    }

    /** MediaStore uses "<unknown>" for missing tags */
    private fun String?.cleanTag(): String? =
        this?.trim()?.takeUnless { it.isEmpty() || it == MediaStore.UNKNOWN_STRING }

    /** RELATIVE_PATH ("Music/Album/") on Android 10+, full file path (DATA) before that */
    private fun String?.toFolder(): String {
        if (this.isNullOrBlank()) return ""
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) trimEnd('/')
        else File(this).parent.orEmpty()
    }

    companion object {
        private const val TAG = "MediaStoreScanner"

        val COLLECTION_URI: Uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

        fun songUri(id: Long): Uri = ContentUris.withAppendedId(COLLECTION_URI, id)
    }
}
