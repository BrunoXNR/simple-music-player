package brunoxnr.simplemusicplayer.playback

import android.content.ComponentName
import android.content.Context
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import brunoxnr.simplemusicplayer.data.Song
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** One queue entry; [key] is unique even when the same song is queued twice */
data class QueueEntry(val key: String, val songId: Long)

data class PlayerUiState(
    val currentSongId: Long? = null,
    val currentIndex: Int = -1,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    /** 0 while unknown */
    val durationMs: Long = 0L,
    val shuffleEnabled: Boolean = false,
    val repeatMode: Int = Player.REPEAT_MODE_OFF,
    /** Queue in play order */
    val queue: List<QueueEntry> = emptyList(),
)

/**
 * UI-side handle to [PlaybackService] through a MediaController, exposed as a [StateFlow].
 *
 * Shuffle is implemented by reordering the queue itself (current song first, the rest shuffled),
 * so the queue screen always shows the real play order and Previous/Next stay predictable.
 * Turning shuffle off restores the original order.
 */
class PlayerConnection(context: Context, scope: CoroutineScope) {

    private val appContext = context.applicationContext
    private val store = PlaybackStateStore(appContext)

    private val _state = MutableStateFlow(PlayerUiState(shuffleEnabled = store.shuffleEnabled))
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private val controllerFuture = MediaController.Builder(
        appContext,
        SessionToken(appContext, ComponentName(appContext, PlaybackService::class.java)),
    ).buildAsync()
    private var controller: MediaController? = null

    /** Queue order (song ids) before shuffle was turned on; null when unknown */
    private var orderBeforeShuffle: List<Long>? = null

    private val listener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) {
            updateState(rebuildQueue = events.contains(Player.EVENT_TIMELINE_CHANGED))
        }
    }

    init {
        controllerFuture.addListener({
            controller = runCatching { controllerFuture.get() }.getOrNull()?.also {
                it.addListener(listener)
                updateState(rebuildQueue = true)
            }
        }, ContextCompat.getMainExecutor(appContext))

        // The player doesn't push position updates; poll while playing
        scope.launch {
            while (isActive) {
                delay(250)
                val c = controller
                if (c != null && c.isPlaying) {
                    _state.update { it.copy(positionMs = c.currentPosition) }
                }
            }
        }
    }

    fun release() {
        controller?.removeListener(listener)
        MediaController.releaseFuture(controllerFuture)
        controller = null
    }

    // Starting playback

    /** Replaces the queue with [songs] and starts at [startIndex] */
    /**
     * Replaces the queue with [songs] in list order, starting at [startIndex].
     * What the user taps is what plays: starting a list always turns shuffle off
     * (use [shuffleAll] to play it shuffled).
     */
    fun playSongs(songs: List<Song>, startIndex: Int = 0) {
        setQueue(songs, startIndex.coerceIn(songs.indices), shuffle = false)
    }

    /** Plays [songs] in random order, turning shuffle on */
    fun shuffleAll(songs: List<Song>) {
        if (songs.isEmpty()) return
        setQueue(songs, songs.indices.random(), shuffle = true)
    }

    private fun setQueue(songs: List<Song>, startIndex: Int, shuffle: Boolean) {
        val c = controller ?: return
        if (songs.isEmpty()) return
        setShuffleFlag(shuffle)
        var items = songs.map { it.toMediaItem() }
        var start = startIndex
        if (shuffle) {
            // The chosen song first, the rest shuffled; turning shuffle off restores list order
            orderBeforeShuffle = songs.map { it.id }
            items = listOf(items[start]) + items.filterIndexed { i, _ -> i != start }.shuffled()
            start = 0
        } else {
            orderBeforeShuffle = null
        }
        c.setMediaItems(items, start, 0L)
        c.prepare()
        c.play()
    }

    // Transport controls

    fun togglePlayPause() {
        val c = controller ?: return
        if (c.mediaItemCount == 0) return
        if (c.isPlaying) {
            c.pause()
            return
        }
        when (c.playbackState) {
            Player.STATE_IDLE -> c.prepare()
            Player.STATE_ENDED -> c.seekToDefaultPosition(c.currentMediaItemIndex)
            else -> Unit
        }
        c.play()
    }

    fun skipNext() {
        controller?.seekToNext()
    }

    /** Restarts the song if more than ~3s in, otherwise goes to the previous one */
    fun skipPrevious() {
        controller?.seekToPrevious()
    }

    fun seekTo(positionMs: Long) {
        val c = controller ?: return
        c.seekTo(positionMs)
        _state.update { it.copy(positionMs = positionMs) }
    }

    fun cycleRepeatMode() {
        val c = controller ?: return
        c.repeatMode = when (c.repeatMode) {
            Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
            Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
            else -> Player.REPEAT_MODE_OFF
        }
    }

    fun toggleShuffle() {
        val c = controller ?: return
        val enable = !_state.value.shuffleEnabled
        setShuffleFlag(enable)

        val items = (0 until c.mediaItemCount).map { c.getMediaItemAt(it) }
        val current = c.currentMediaItemIndex
        if (items.size <= 1 || current !in items.indices) {
            orderBeforeShuffle = if (enable) items.mapNotNull { it.songId } else null
            return
        }

        if (enable) {
            orderBeforeShuffle = items.mapNotNull { it.songId }
            val others = items.filterIndexed { i, _ -> i != current }.shuffled()
            rearrangeAroundCurrent(c, listOf(items[current]) + others, currentPosInTarget = 0)
        } else {
            // Without the original order (e.g. after an app restart) the current order is kept
            val original = orderBeforeShuffle ?: return
            orderBeforeShuffle = null
            val positions = HashMap<Long, Int>()
            original.forEachIndexed { i, id -> positions.putIfAbsent(id, i) }
            // Stable sort: songs added while shuffled keep their relative order at the end
            val sorted = items.withIndex().sortedBy { (_, item) -> positions[item.songId] ?: Int.MAX_VALUE }
            rearrangeAroundCurrent(
                c,
                sorted.map { it.value },
                currentPosInTarget = sorted.indexOfFirst { it.index == current },
            )
        }
    }

    // Queue editing

    fun playNext(song: Song) {
        val c = controller ?: return
        if (c.mediaItemCount == 0) playSongs(listOf(song))
        else c.addMediaItem(c.currentMediaItemIndex + 1, song.toMediaItem())
    }

    fun addToQueue(song: Song) {
        val c = controller ?: return
        if (c.mediaItemCount == 0) playSongs(listOf(song))
        else c.addMediaItem(song.toMediaItem())
    }

    fun playQueueItem(index: Int) {
        val c = controller ?: return
        if (index !in 0 until c.mediaItemCount) return
        c.seekToDefaultPosition(index)
        c.play()
    }

    fun removeQueueItem(index: Int) {
        val c = controller ?: return
        if (index in 0 until c.mediaItemCount) c.removeMediaItem(index)
    }

    fun moveQueueItem(from: Int, to: Int) {
        val c = controller ?: return
        if (from == to || from !in 0 until c.mediaItemCount || to !in 0 until c.mediaItemCount) return
        c.moveMediaItem(from, to)
    }

    /** Removes everything except the song that is playing */
    fun clearQueue() {
        val c = controller ?: return
        val current = c.currentMediaItemIndex
        if (current + 1 < c.mediaItemCount) c.removeMediaItems(current + 1, c.mediaItemCount)
        if (current > 0) c.removeMediaItems(0, current)
        orderBeforeShuffle = null
    }

    // Internals

    private fun setShuffleFlag(enabled: Boolean) {
        store.shuffleEnabled = enabled
        _state.update { it.copy(shuffleEnabled = enabled) }
    }

    /** Reorders the whole queue to [target] without interrupting the song that is playing */
    private fun rearrangeAroundCurrent(c: Player, target: List<MediaItem>, currentPosInTarget: Int) {
        val current = c.currentMediaItemIndex
        if (current + 1 < c.mediaItemCount) c.removeMediaItems(current + 1, c.mediaItemCount)
        if (current > 0) c.removeMediaItems(0, current)
        val before = target.subList(0, currentPosInTarget)
        val after = target.subList(currentPosInTarget + 1, target.size)
        if (before.isNotEmpty()) c.addMediaItems(0, before)
        if (after.isNotEmpty()) c.addMediaItems(c.mediaItemCount, after)
    }

    private fun updateState(rebuildQueue: Boolean) {
        val c = controller ?: return
        val queue = if (rebuildQueue) buildQueue(c) else _state.value.queue
        _state.update {
            it.copy(
                currentSongId = c.currentMediaItem?.songId,
                currentIndex = if (c.mediaItemCount > 0) c.currentMediaItemIndex else -1,
                isPlaying = c.isPlaying,
                positionMs = c.currentPosition,
                durationMs = c.duration.takeIf { d -> d != C.TIME_UNSET && d > 0 } ?: 0L,
                repeatMode = c.repeatMode,
                queue = queue,
            )
        }
    }

    private fun buildQueue(c: Player): List<QueueEntry> {
        val occurrences = HashMap<Long, Int>()
        return (0 until c.mediaItemCount).map { i ->
            val songId = c.getMediaItemAt(i).songId ?: -1L
            val n = occurrences.merge(songId, 1, Int::plus)!!
            QueueEntry(key = "$songId#$n", songId = songId)
        }
    }
}
