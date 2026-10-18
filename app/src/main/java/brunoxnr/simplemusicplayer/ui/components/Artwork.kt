package brunoxnr.simplemusicplayer.ui.components

import android.content.ContentUris
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.SystemClock
import android.util.LruCache
import android.util.Size
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import brunoxnr.simplemusicplayer.data.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Album art (embedded cover or folder art indexed by MediaStore), with a music note placeholder.
 * [requestSize] is the displayed size, used to load a thumbnail of the right resolution.
 */
@Composable
fun SongArtwork(
    song: Song?,
    requestSize: Dp,
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 10.dp,
) {
    val context = LocalContext.current
    val sizePx = with(LocalDensity.current) { requestSize.roundToPx() }.coerceIn(64, 1024)
    val bitmap by produceState(
        initialValue = song?.let { ArtworkLoader.peek(it, sizePx) },
        song?.id,
        sizePx,
    ) {
        value = song?.let { ArtworkLoader.load(context, it, sizePx) }
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(MaterialTheme.colorScheme.secondaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        val image = bitmap
        if (image != null) {
            Image(
                bitmap = image,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            Icon(
                imageVector = Icons.Rounded.MusicNote,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSecondaryContainer,
                modifier = Modifier.fillMaxWidth(0.45f),
            )
        }
    }
}

/**
 * Loads and caches artwork thumbnails. "No artwork" results are cached too, but expire, because
 * a failure can also be transient (e.g. MediaStore still busy right after a scan).
 */
private object ArtworkLoader {
    private class Art(val bitmap: ImageBitmap?, val bytes: Int, val loadedAt: Long = SystemClock.elapsedRealtime())

    private const val MISS_TTL_MS = 60_000L
    private const val RETRY_DELAY_MS = 1_500L

    private val cache = object : LruCache<String, Art>((Runtime.getRuntime().maxMemory() / 8).toInt()) {
        override fun sizeOf(key: String, value: Art): Int = maxOf(1, value.bytes)
    }

    private fun key(song: Song, sizePx: Int) = "${song.id}@$sizePx"

    fun peek(song: Song, sizePx: Int): ImageBitmap? = cache.get(key(song, sizePx))?.bitmap

    suspend fun load(context: Context, song: Song, sizePx: Int): ImageBitmap? = withContext(Dispatchers.IO) {
        val key = key(song, sizePx)
        cache.get(key)?.let { cached ->
            val fresh = SystemClock.elapsedRealtime() - cached.loadedAt < MISS_TTL_MS
            if (cached.bitmap != null || fresh) return@withContext cached.bitmap
        }
        // One delayed retry before treating the song as having no artwork
        val bitmap = loadBitmap(context, song, sizePx)
            ?: run { delay(RETRY_DELAY_MS); loadBitmap(context, song, sizePx) }
        val art = Art(bitmap?.asImageBitmap(), bitmap?.byteCount ?: 0)
        cache.put(key, art)
        art.bitmap
    }

    private fun loadBitmap(context: Context, song: Song, sizePx: Int): Bitmap? = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.contentResolver.loadThumbnail(song.uri, Size(sizePx, sizePx), null)
        } else {
            loadLegacyAlbumArt(context, song.albumId, sizePx)
        }
    } catch (_: Exception) {
        null // No artwork for this file (or a transient failure)
    }

    /** Android 8–9: album art cached by MediaStore */
    private fun loadLegacyAlbumArt(context: Context, albumId: Long, sizePx: Int): Bitmap? {
        val uri = ContentUris.withAppendedId(LEGACY_ALBUM_ART_URI, albumId)
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0) return null
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= sizePx) sample *= 2
        val options = BitmapFactory.Options().apply { inSampleSize = sample }
        return context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
    }

    private val LEGACY_ALBUM_ART_URI = "content://media/external/audio/albumart".toUri()
}
