package brunoxnr.simplemusicplayer.ui

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.GroupType
import brunoxnr.simplemusicplayer.data.Song
import brunoxnr.simplemusicplayer.data.SongSort
import brunoxnr.simplemusicplayer.data.groupedBy
import brunoxnr.simplemusicplayer.data.sortedBy
import brunoxnr.simplemusicplayer.ui.components.ConfirmDialog
import brunoxnr.simplemusicplayer.ui.components.NameDialog
import brunoxnr.simplemusicplayer.ui.components.PlaylistPickerSheet
import brunoxnr.simplemusicplayer.ui.components.SongActionsSheet
import brunoxnr.simplemusicplayer.ui.screens.AddSongsScreen
import brunoxnr.simplemusicplayer.ui.screens.MiniPlayer
import brunoxnr.simplemusicplayer.ui.screens.NowPlayingScreen
import brunoxnr.simplemusicplayer.ui.screens.PlaylistsScreen
import brunoxnr.simplemusicplayer.ui.screens.QueueScreen
import brunoxnr.simplemusicplayer.ui.screens.SongCollectionScreen
import brunoxnr.simplemusicplayer.ui.screens.SongsScreen
import kotlinx.coroutines.launch

// Simple string routes, kept in a saveable back stack
private const val ROUTE_HOME = "home"
private const val ROUTE_FAVORITES = "favorites"
private const val PREFIX_PLAYLIST = "playlist/"
private const val PREFIX_ADD_SONGS = "add/"
/** group/<FOLDER|ALBUM|ARTIST>/<url-encoded key> */
private const val PREFIX_GROUP = "group/"

private val backStackSaver = listSaver<SnapshotStateList<String>, String>(
    save = { it.toList() },
    restore = { it.toMutableStateList() },
)

/** Song whose "⋮" menu is open; [playlistId] is set when opened from inside a playlist */
private data class ActionTarget(val song: Song, val playlistId: Long?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(vm: MusicViewModel) {
    val songs by vm.songs.collectAsStateWithLifecycle()
    val libraryLoaded by vm.libraryLoaded.collectAsStateWithLifecycle()
    val songsById by vm.songsById.collectAsStateWithLifecycle()
    val favoriteIds by vm.favoriteIds.collectAsStateWithLifecycle()
    val playlists by vm.playlists.collectAsStateWithLifecycle()
    val playerState by vm.player.state.collectAsStateWithLifecycle()
    val player = vm.player

    val backStack = rememberSaveable(saver = backStackSaver) { mutableStateListOf(ROUTE_HOME) }
    val route = backStack.last()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var showPlayer by rememberSaveable { mutableStateOf(false) }
    var showQueue by rememberSaveable { mutableStateOf(false) }

    var actionTarget by remember { mutableStateOf<ActionTarget?>(null) }
    var pickerSong by remember { mutableStateOf<Song?>(null) }
    var showCreatePlaylist by rememberSaveable { mutableStateOf(false) }
    var renamePlaylistId by rememberSaveable { mutableStateOf<Long?>(null) }
    var deletePlaylistId by rememberSaveable { mutableStateOf<Long?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val resources = LocalResources.current
    fun notify(message: String) {
        scope.launch {
            snackbarHostState.currentSnackbarData?.dismiss()
            snackbarHostState.showSnackbar(message)
        }
    }

    val currentSong = playerState.currentSongId?.let { songsById[it] }
    val play: (List<Song>, Int) -> Unit = { list, index -> player.playSongs(list, index) }
    val openActions: (Song, Long?) -> Unit = { song, playlistId -> actionTarget = ActionTarget(song, playlistId) }

    BackHandler(enabled = showQueue || showPlayer || backStack.size > 1) {
        when {
            showQueue -> showQueue = false
            showPlayer -> showPlayer = false
            else -> backStack.removeAt(backStack.lastIndex)
        }
    }

    Box(Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                if (route == ROUTE_HOME) TopAppBar(title = { Text(stringResource(R.string.app_name)) })
            },
            bottomBar = {
                Column {
                    if (currentSong != null) {
                        MiniPlayer(
                            song = currentSong,
                            state = playerState,
                            onClick = { showPlayer = true },
                            onPlayPause = player::togglePlayPause,
                            onNext = player::skipNext,
                            modifier = if (route == ROUTE_HOME) Modifier else Modifier.navigationBarsPadding(),
                        )
                    }
                    if (route == ROUTE_HOME) {
                        NavigationBar {
                            NavigationBarItem(
                                selected = tab == 0,
                                onClick = { tab = 0 },
                                icon = { Icon(Icons.Rounded.LibraryMusic, contentDescription = null) },
                                label = { Text(stringResource(R.string.tab_songs)) },
                            )
                            NavigationBarItem(
                                selected = tab == 1,
                                onClick = { tab = 1 },
                                icon = { Icon(Icons.AutoMirrored.Rounded.QueueMusic, contentDescription = null) },
                                label = { Text(stringResource(R.string.tab_playlists)) },
                            )
                        }
                    }
                }
            },
            snackbarHost = { SnackbarHost(snackbarHostState) },
        ) { padding ->
            val contentModifier = Modifier.padding(padding)
            when {
                route == ROUTE_HOME && tab == 0 -> SongsScreen(
                    songs = songs,
                    libraryLoaded = libraryLoaded,
                    favoriteIds = favoriteIds,
                    currentSongId = playerState.currentSongId,
                    isPlaying = playerState.isPlaying,
                    onPlay = play,
                    onShuffle = player::shuffleAll,
                    onMore = { openActions(it, null) },
                    onOpenGroup = { type, key -> backStack.add(PREFIX_GROUP + type.name + "/" + Uri.encode(key)) },
                    modifier = contentModifier,
                )

                route == ROUTE_HOME -> PlaylistsScreen(
                    playlists = playlists,
                    favoritesCount = songs.count { it.id in favoriteIds },
                    onOpenFavorites = { backStack.add(ROUTE_FAVORITES) },
                    onOpenPlaylist = { backStack.add(PREFIX_PLAYLIST + it.id) },
                    onCreatePlaylist = { showCreatePlaylist = true },
                    modifier = contentModifier,
                )

                route == ROUTE_FAVORITES -> SongCollectionScreen(
                    title = stringResource(R.string.favorites),
                    songs = songs.filter { it.id in favoriteIds }.sortedBy(SongSort.TITLE, true),
                    currentSongId = playerState.currentSongId,
                    isPlaying = playerState.isPlaying,
                    onBack = { backStack.removeAt(backStack.lastIndex) },
                    onPlay = play,
                    onShuffle = player::shuffleAll,
                    onMore = { openActions(it, null) },
                    emptyMessage = stringResource(R.string.empty_favorites_message),
                    modifier = contentModifier,
                )

                route.startsWith(PREFIX_PLAYLIST) -> {
                    val playlistId = route.removePrefix(PREFIX_PLAYLIST).toLong()
                    val playlist = playlists.find { it.id == playlistId }
                    if (playlist == null) {
                        LaunchedEffect(route) { backStack.remove(route) }
                    } else {
                        var menuOpen by remember { mutableStateOf(false) }
                        SongCollectionScreen(
                            title = playlist.name,
                            songs = playlist.songIds.mapNotNull { songsById[it] },
                            currentSongId = playerState.currentSongId,
                            isPlaying = playerState.isPlaying,
                            onBack = { backStack.removeAt(backStack.lastIndex) },
                            onPlay = play,
                            onShuffle = player::shuffleAll,
                            onMore = { openActions(it, playlist.id) },
                            emptyMessage = stringResource(R.string.empty_playlist_message),
                            onReorder = { ids -> vm.reorderPlaylist(playlist.id, ids) },
                            modifier = contentModifier,
                            actions = {
                                IconButton(onClick = { backStack.add(PREFIX_ADD_SONGS + playlist.id) }) {
                                    Icon(Icons.Rounded.Add, contentDescription = stringResource(R.string.add_songs_title))
                                }
                                IconButton(onClick = { menuOpen = true }) {
                                    Icon(Icons.Rounded.MoreVert, contentDescription = stringResource(R.string.action_more_options))
                                }
                                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                                    DropdownMenuItem(
                                        text = { Text(stringResource(R.string.action_rename)) },
                                        onClick = {
                                            menuOpen = false
                                            renamePlaylistId = playlist.id
                                        },
                                    )
                                    DropdownMenuItem(
                                        text = { Text(stringResource(R.string.action_delete_playlist)) },
                                        onClick = {
                                            menuOpen = false
                                            deletePlaylistId = playlist.id
                                        },
                                    )
                                }
                            },
                        )
                    }
                }

                route.startsWith(PREFIX_GROUP) -> {
                    val (typeName, encodedKey) = route.removePrefix(PREFIX_GROUP).split('/', limit = 2)
                    val type = GroupType.valueOf(typeName)
                    val key = Uri.decode(encodedKey)
                    val variousArtists = stringResource(R.string.various_artists)
                    val rootFolder = stringResource(R.string.internal_storage)
                    val group = remember(songs, route, variousArtists, rootFolder) {
                        songs.groupedBy(type, variousArtists, rootFolder).find { it.key == key }
                    }
                    if (group == null) {
                        // The folder / album / artist no longer exists on the device
                        if (libraryLoaded) LaunchedEffect(route) { backStack.remove(route) }
                    } else {
                        SongCollectionScreen(
                            title = group.title,
                            subtitle = group.subtitle,
                            songs = group.songs,
                            currentSongId = playerState.currentSongId,
                            isPlaying = playerState.isPlaying,
                            onBack = { backStack.removeAt(backStack.lastIndex) },
                            onPlay = play,
                            onShuffle = player::shuffleAll,
                            onMore = { openActions(it, null) },
                            emptyMessage = "",
                            modifier = contentModifier,
                        )
                    }
                }

                route.startsWith(PREFIX_ADD_SONGS) -> {
                    val playlistId = route.removePrefix(PREFIX_ADD_SONGS).toLong()
                    val playlist = playlists.find { it.id == playlistId }
                    if (playlist != null) {
                        AddSongsScreen(
                            playlistName = playlist.name,
                            allSongs = songs,
                            selectedIds = playlist.songIds.toSet(),
                            onSetIncluded = { songId, included -> vm.setSongInPlaylist(playlist.id, songId, included) },
                            onBack = { backStack.removeAt(backStack.lastIndex) },
                            modifier = contentModifier,
                        )
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showPlayer && currentSong != null,
            enter = slideInVertically { it },
            exit = slideOutVertically { it },
        ) {
            // Keep showing the last song while the exit animation runs
            val song = currentSong ?: return@AnimatedVisibility
            NowPlayingScreen(
                song = song,
                state = playerState,
                isFavorite = song.id in favoriteIds,
                onCollapse = { showPlayer = false },
                onOpenQueue = { showQueue = true },
                onToggleFavorite = { vm.toggleFavorite(song.id) },
                onAddToPlaylist = { pickerSong = song },
                onPlayPause = player::togglePlayPause,
                onNext = player::skipNext,
                onPrevious = player::skipPrevious,
                onSeek = player::seekTo,
                onToggleShuffle = player::toggleShuffle,
                onCycleRepeat = player::cycleRepeatMode,
            )
        }

        AnimatedVisibility(
            visible = showQueue,
            enter = slideInVertically { it },
            exit = slideOutVertically { it },
        ) {
            QueueScreen(
                queue = playerState.queue,
                songsById = songsById,
                currentIndex = playerState.currentIndex,
                isPlaying = playerState.isPlaying,
                onClose = { showQueue = false },
                onPlayIndex = player::playQueueItem,
                onRemoveIndex = player::removeQueueItem,
                onMove = player::moveQueueItem,
                onClear = player::clearQueue,
            )
        }
    }

    // Sheets and dialogs

    actionTarget?.let { target ->
        val song = target.song
        SongActionsSheet(
            song = song,
            isFavorite = song.id in favoriteIds,
            onDismiss = { actionTarget = null },
            onPlayNext = {
                player.playNext(song)
                notify(resources.getString(R.string.message_play_next, song.title))
            },
            onAddToQueue = {
                player.addToQueue(song)
                notify(resources.getString(R.string.message_added_to_queue, song.title))
            },
            onAddToPlaylist = { pickerSong = song },
            onToggleFavorite = { vm.toggleFavorite(song.id) },
            onRemoveFromPlaylist = target.playlistId?.let { playlistId ->
                { vm.removeFromPlaylist(playlistId, song.id) }
            },
        )
    }

    pickerSong?.let { song ->
        PlaylistPickerSheet(
            song = song,
            playlists = playlists,
            onDismiss = { pickerSong = null },
            onSetIncluded = { playlistId, included -> vm.setSongInPlaylist(playlistId, song.id, included) },
            onCreatePlaylist = { name -> vm.createPlaylist(name, listOf(song.id)) },
        )
    }

    if (showCreatePlaylist) {
        NameDialog(
            title = stringResource(R.string.action_new_playlist),
            confirmLabel = stringResource(R.string.action_create),
            onConfirm = { name ->
                vm.createPlaylist(name)
                showCreatePlaylist = false
            },
            onDismiss = { showCreatePlaylist = false },
        )
    }

    renamePlaylistId?.let { id ->
        val playlist = playlists.find { it.id == id }
        if (playlist == null) {
            renamePlaylistId = null
        } else {
            NameDialog(
                title = stringResource(R.string.action_rename),
                confirmLabel = stringResource(R.string.action_save),
                initialValue = playlist.name,
                onConfirm = { name ->
                    vm.renamePlaylist(id, name)
                    renamePlaylistId = null
                },
                onDismiss = { renamePlaylistId = null },
            )
        }
    }

    deletePlaylistId?.let { id ->
        val playlist = playlists.find { it.id == id }
        if (playlist == null) {
            deletePlaylistId = null
        } else {
            ConfirmDialog(
                title = stringResource(R.string.delete_playlist_title),
                text = stringResource(R.string.delete_playlist_message, playlist.name),
                confirmLabel = stringResource(R.string.action_delete),
                onConfirm = {
                    vm.deletePlaylist(id)
                    deletePlaylistId = null
                    backStack.remove(PREFIX_PLAYLIST + id)
                },
                onDismiss = { deletePlaylistId = null },
            )
        }
    }
}
