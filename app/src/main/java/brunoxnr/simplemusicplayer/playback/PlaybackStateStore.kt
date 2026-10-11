package brunoxnr.simplemusicplayer.playback

import android.content.Context
import androidx.core.content.edit
import androidx.media3.common.Player

data class SavedPlayback(
    val songIds: List<Long>,
    val index: Int,
    val positionMs: Long,
    val repeatMode: Int,
)

/**
 * Persists the queue, current track, position and modes so playback resumes where it stopped
 * after the app is closed.
 */
class PlaybackStateStore(context: Context) {
    private val prefs = context.getSharedPreferences("playback_state", Context.MODE_PRIVATE)

    fun save(player: Player) {
        val songIds = (0 until player.mediaItemCount).mapNotNull { player.getMediaItemAt(it).songId }
        prefs.edit {
            putString(KEY_QUEUE, songIds.joinToString(","))
            putInt(KEY_INDEX, player.currentMediaItemIndex)
            putLong(KEY_POSITION, player.currentPosition)
            putInt(KEY_REPEAT, player.repeatMode)
        }
    }

    fun savePosition(player: Player) {
        prefs.edit { putLong(KEY_POSITION, player.currentPosition) }
    }

    fun load(): SavedPlayback? {
        val songIds = prefs.getString(KEY_QUEUE, null)
            ?.split(',')
            ?.mapNotNull { it.toLongOrNull() }
            .orEmpty()
        if (songIds.isEmpty()) return null
        return SavedPlayback(
            songIds = songIds,
            index = prefs.getInt(KEY_INDEX, 0),
            positionMs = prefs.getLong(KEY_POSITION, 0L),
            repeatMode = prefs.getInt(KEY_REPEAT, Player.REPEAT_MODE_OFF),
        )
    }

    /** Shuffle is implemented by reordering the queue, so only the flag is stored */
    var shuffleEnabled: Boolean
        get() = prefs.getBoolean(KEY_SHUFFLE, false)
        set(value) = prefs.edit { putBoolean(KEY_SHUFFLE, value) }

    private companion object {
        const val KEY_QUEUE = "queue"
        const val KEY_INDEX = "index"
        const val KEY_POSITION = "position"
        const val KEY_REPEAT = "repeat"
        const val KEY_SHUFFLE = "shuffle"
    }
}
