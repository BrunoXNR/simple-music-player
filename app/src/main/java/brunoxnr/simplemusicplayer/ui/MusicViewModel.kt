package brunoxnr.simplemusicplayer.ui

import android.app.Application
import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import brunoxnr.simplemusicplayer.MusicApplication
import brunoxnr.simplemusicplayer.data.MediaStoreScanner
import brunoxnr.simplemusicplayer.data.Playlist
import brunoxnr.simplemusicplayer.data.Song
import brunoxnr.simplemusicplayer.playback.PlayerConnection
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MusicViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as MusicApplication
    private val repository = app.libraryRepository

    val player = PlayerConnection(application, viewModelScope)

    private val _songs = MutableStateFlow<List<Song>>(emptyList())
    val songs: StateFlow<List<Song>> = _songs.asStateFlow()

    /** False until the first library scan finishes (avoids flashing the empty state) */
    private val _libraryLoaded = MutableStateFlow(false)
    val libraryLoaded: StateFlow<Boolean> = _libraryLoaded.asStateFlow()

    val songsById: StateFlow<Map<Long, Song>> = _songs
        .map { list -> list.associateBy { it.id } }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    val favoriteIds: StateFlow<Set<Long>> =
        repository.favoriteIds.stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    val playlists: StateFlow<List<Playlist>> =
        repository.playlists.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    // Rescan automatically when audio files are added, removed or changed on the device
    private val rescanRequests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private var observerRegistered = false
    private val mediaObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) {
            rescanRequests.tryEmit(Unit)
        }
    }

    init {
        @OptIn(FlowPreview::class)
        viewModelScope.launch {
            rescanRequests.debounce(1_000).collect { loadLibrary() }
        }
    }

    fun onPermissionGranted() {
        if (!observerRegistered) {
            app.contentResolver.registerContentObserver(MediaStoreScanner.COLLECTION_URI, true, mediaObserver)
            observerRegistered = true
        }
        viewModelScope.launch { loadLibrary() }
    }

    private suspend fun loadLibrary() {
        _songs.value = app.scanner.scan()
        _libraryLoaded.value = true
    }

    override fun onCleared() {
        player.release()
        if (observerRegistered) app.contentResolver.unregisterContentObserver(mediaObserver)
    }

    // Favorites

    fun toggleFavorite(songId: Long) {
        val favorite = songId !in favoriteIds.value
        viewModelScope.launch { repository.setFavorite(songId, favorite) }
    }

    // Playlists

    fun createPlaylist(name: String, songIds: List<Long> = emptyList()) {
        viewModelScope.launch { repository.createPlaylist(name, songIds) }
    }

    fun renamePlaylist(playlistId: Long, name: String) {
        viewModelScope.launch { repository.renamePlaylist(playlistId, name) }
    }

    fun deletePlaylist(playlistId: Long) {
        viewModelScope.launch { repository.deletePlaylist(playlistId) }
    }

    fun setSongInPlaylist(playlistId: Long, songId: Long, included: Boolean) {
        viewModelScope.launch {
            if (included) repository.addSongs(playlistId, listOf(songId))
            else repository.removeSong(playlistId, songId)
        }
    }

    fun removeFromPlaylist(playlistId: Long, songId: Long) {
        viewModelScope.launch { repository.removeSong(playlistId, songId) }
    }

    fun reorderPlaylist(playlistId: Long, songIds: List<Long>) {
        viewModelScope.launch { repository.reorder(playlistId, songIds) }
    }
}
