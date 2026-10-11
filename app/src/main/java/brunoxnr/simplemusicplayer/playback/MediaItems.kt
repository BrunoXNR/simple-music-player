package brunoxnr.simplemusicplayer.playback

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import brunoxnr.simplemusicplayer.data.MediaStoreScanner
import brunoxnr.simplemusicplayer.data.Song

/** The media id of every queue item is the MediaStore song id */
fun Song.toMediaItem(): MediaItem =
    MediaItem.Builder()
        .setMediaId(id.toString())
        .setUri(uri)
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist)
                .setAlbumTitle(album)
                .setIsPlayable(true)
                .setIsBrowsable(false)
                .build()
        )
        .build()

val MediaItem.songId: Long? get() = mediaId.toLongOrNull()

/**
 * Items sent by a MediaController may arrive without their URI; rebuild it from the media id.
 */
fun MediaItem.withPlayableUri(): MediaItem {
    if (localConfiguration != null) return this
    val id = songId ?: return this
    return buildUpon().setUri(MediaStoreScanner.songUri(id)).build()
}
