package brunoxnr.simplemusicplayer.playback

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import brunoxnr.simplemusicplayer.MainActivity
import brunoxnr.simplemusicplayer.MusicApplication
import brunoxnr.simplemusicplayer.R
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Owns the player. Running as a MediaSessionService gives background playback, the media
 * notification, lock screen / Bluetooth / headset controls and audio focus handling.
 */
// Media3 marks MediaItemsWithStartPosition and a few builder options as unstable (may change between versions)
@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    private lateinit var stateStore: PlaybackStateStore
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()
        stateStore = PlaybackStateStore(this)

        val player = ExoPlayer.Builder(this)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                /* handleAudioFocus = */ true,
            )
            // Pause when headphones are unplugged / Bluetooth disconnects
            .setHandleAudioBecomingNoisy(true)
            // Keep the CPU awake while playing with the screen off
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .build()

        player.addListener(object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) {
                if (events.containsAny(
                        Player.EVENT_TIMELINE_CHANGED,
                        Player.EVENT_MEDIA_ITEM_TRANSITION,
                        Player.EVENT_IS_PLAYING_CHANGED,
                        Player.EVENT_REPEAT_MODE_CHANGED,
                    )
                ) {
                    stateStore.save(player)
                }
            }
        })

        val openAppIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val closeButton = CommandButton.Builder(CommandButton.ICON_UNDEFINED)
            .setCustomIconResId(R.drawable.ic_notification_close)
            .setDisplayName(getString(R.string.action_close))
            .setSessionCommand(closeCommand)
            .setSlots(CommandButton.SLOT_OVERFLOW)
            .build()

        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(openAppIntent)
            .setCallback(SessionCallback())
            .setMediaButtonPreferences(listOf(closeButton))
            .build()

        // A stopped player (the close button) has no notification; only paused/playing ones do
        setShowNotificationForIdlePlayer(SHOW_NOTIFICATION_FOR_IDLE_PLAYER_NEVER)

        restoreLastSession(player)
        startPositionSaver(player)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    /** Swiping the app away keeps the music playing, but stops the service if nothing is playing */
    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player == null || !player.playWhenReady || player.mediaItemCount == 0 ||
            player.playbackState == Player.STATE_ENDED
        ) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        scope.cancel()
        mediaSession?.run {
            stateStore.save(player)
            player.release()
            release()
        }
        mediaSession = null
        super.onDestroy()
    }

    /** Reloads the previous queue (paused) so the user can continue where they stopped */
    private fun restoreLastSession(player: ExoPlayer) {
        scope.launch {
            val saved = loadSavedQueue() ?: return@launch
            // The UI (or a headset button) may have started something meanwhile; never overwrite it
            if (player.mediaItemCount > 0) return@launch
            player.setMediaItems(saved.mediaItems, saved.startIndex, saved.startPositionMs)
            player.prepare()
        }
    }

    /**
     * The saved queue, rebuilt from the current library. Files deleted since are skipped and the
     * saved song's position is kept when it still exists.
     */
    private suspend fun loadSavedQueue(): MediaSession.MediaItemsWithStartPosition? {
        val saved = stateStore.load() ?: return null
        val songsById = (application as MusicApplication).scanner.scan().associateBy { it.id }
        val items = saved.songIds.mapNotNull { songsById[it]?.toMediaItem() }
        if (items.isEmpty()) return null

        val restoredIndex = saved.songIds
            .take(saved.index + 1)
            .count { it in songsById }
            .minus(1)
            .coerceIn(0, items.lastIndex)
        val savedCurrentId = saved.songIds.getOrNull(saved.index)
        val stillThere = savedCurrentId != null && savedCurrentId in songsById

        mediaSession?.player?.repeatMode = saved.repeatMode
        return MediaSession.MediaItemsWithStartPosition(
            items,
            restoredIndex,
            if (stillThere) saved.positionMs else 0L,
        )
    }

    /** Saves the position periodically so it survives the process being killed mid-song */
    private fun startPositionSaver(player: Player) {
        scope.launch {
            while (isActive) {
                delay(10_000)
                if (player.isPlaying) stateStore.savePosition(player)
            }
        }
    }

    /**
     * The notification's close button: saves where the user stopped, removes the notification and
     * ends the service. The queue is kept, so opening the app (or a headset play) continues from there.
     */
    private fun closePlayer(player: Player) {
        stateStore.save(player)
        // Idle player = no notification, even while the app's UI is still connected to the session
        player.stop()
        pauseAllPlayersAndStopSelf()
    }

    private inner class SessionCallback : MediaSession.Callback {
        override fun onConnect(
            session: MediaSession,
            controller: MediaSession.ControllerInfo,
        ): MediaSession.ConnectionResult =
            MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                .setAvailableSessionCommands(
                    MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                        .add(closeCommand)
                        .build(),
                )
                .build()

        override fun onCustomCommand(
            session: MediaSession,
            controller: MediaSession.ControllerInfo,
            customCommand: SessionCommand,
            args: Bundle,
        ): ListenableFuture<SessionResult> {
            if (customCommand.customAction != ACTION_CLOSE) {
                return super.onCustomCommand(session, controller, customCommand, args)
            }
            closePlayer(session.player)
            return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
        }

        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
        ): ListenableFuture<MutableList<MediaItem>> =
            Futures.immediateFuture(mediaItems.map { it.withPlayableUri() }.toMutableList())

        /**
         * Called when playback is resumed from outside the app while it isn't running:
         * a headset / Bluetooth / car play button, or the system's media resumption controls
         * (which only need the metadata, [isForPlayback] = false).
         */
        override fun onPlaybackResumption(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            isForPlayback: Boolean,
        ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> {
            val result = SettableFuture.create<MediaSession.MediaItemsWithStartPosition>()
            scope.launch {
                val saved = loadSavedQueue()
                if (saved != null) result.set(saved)
                else result.setException(UnsupportedOperationException("Nothing to resume"))
            }
            return result
        }
    }

    private companion object {
        const val ACTION_CLOSE = "brunoxnr.simplemusicplayer.CLOSE"
        val closeCommand = SessionCommand(ACTION_CLOSE, Bundle.EMPTY)
    }
}
