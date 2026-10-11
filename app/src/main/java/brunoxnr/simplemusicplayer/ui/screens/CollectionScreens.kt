package brunoxnr.simplemusicplayer.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DragHandle
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.Song
import brunoxnr.simplemusicplayer.data.search
import brunoxnr.simplemusicplayer.data.sortedBy
import brunoxnr.simplemusicplayer.data.SongSort
import brunoxnr.simplemusicplayer.ui.components.ConfirmDialog
import brunoxnr.simplemusicplayer.ui.components.SongArtwork
import brunoxnr.simplemusicplayer.ui.components.SongRow
import brunoxnr.simplemusicplayer.ui.components.formatDuration
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyListState

/**
 * A list of songs with Play / Shuffle (a playlist or Favorites).
 * When [onReorder] is set, songs can be reordered by dragging the handle.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongCollectionScreen(
    title: String,
    songs: List<Song>,
    currentSongId: Long?,
    isPlaying: Boolean,
    onBack: () -> Unit,
    onPlay: (songs: List<Song>, index: Int) -> Unit,
    onShuffle: (List<Song>) -> Unit,
    onMore: (Song) -> Unit,
    emptyMessage: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onReorder: ((songIds: List<Long>) -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Column(modifier.fillMaxSize()) {
        TopAppBar(
            title = {
                Column {
                    Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (subtitle != null) {
                        Text(
                            subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = stringResource(R.string.action_back))
                }
            },
            actions = actions,
            windowInsets = WindowInsets(0),
        )

        if (songs.isEmpty()) {
            EmptyState(
                icon = Icons.AutoMirrored.Rounded.QueueMusic,
                title = stringResource(R.string.empty_collection_title),
                message = emptyMessage,
            )
            return@Column
        }

        Text(
            text = pluralStringResource(R.plurals.song_count, songs.size, songs.size) +
                " • " + formatDuration(songs.sumOf { it.durationMs }),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(onClick = { onPlay(songs, 0) }, modifier = Modifier.weight(1f)) {
                Icon(Icons.Rounded.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.action_play))
            }
            FilledTonalButton(onClick = { onShuffle(songs) }, modifier = Modifier.weight(1f)) {
                Icon(Icons.Rounded.Shuffle, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.action_shuffle))
            }
        }

        // Local copy so dragging is smooth; saved when the drag ends
        var orderedSongs by remember(songs) { mutableStateOf(songs) }
        val listState = rememberLazyListState()
        val reorderState = rememberReorderableLazyListState(listState) { from, to ->
            orderedSongs = orderedSongs.toMutableList().apply { add(to.index, removeAt(from.index)) }
        }

        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(bottom = 8.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            itemsIndexed(orderedSongs, key = { _, song -> song.id }) { index, song ->
                ReorderableItem(reorderState, key = song.id, enabled = onReorder != null) { isDragging ->
                    val elevation by animateDpAsState(if (isDragging) 6.dp else 0.dp, label = "drag elevation")
                    Surface(shadowElevation = elevation) {
                        SongRow(
                            song = song,
                            isCurrent = song.id == currentSongId,
                            isPlaying = isPlaying,
                            onClick = { onPlay(orderedSongs, index) },
                            onMore = { onMore(song) },
                            leading = onReorder?.let { save ->
                                {
                                    IconButton(
                                        onClick = {},
                                        modifier = Modifier.draggableHandle(
                                            onDragStopped = { save(orderedSongs.map { it.id }) },
                                        ),
                                    ) {
                                        Icon(
                                            Icons.Rounded.DragHandle,
                                            contentDescription = stringResource(R.string.action_drag_to_reorder),
                                        )
                                    }
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}

/**
 * Pick songs for a playlist. Checks are kept locally and only saved when the user confirms;
 * leaving with unsaved changes asks before discarding them.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddSongsScreen(
    playlistName: String,
    allSongs: List<Song>,
    currentSongIds: List<Long>,
    onSave: (songIds: List<Long>) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var query by rememberSaveable { mutableStateOf("") }
    // Playlist order is kept; newly checked songs are appended in the order they were checked
    var selection by rememberSaveable { mutableStateOf(currentSongIds.toLongArray()) }
    var confirmDiscard by remember { mutableStateOf(false) }
    val visibleSongs = remember(allSongs, query) { allSongs.search(query).sortedBy(SongSort.TITLE, true) }

    val selectedSet = remember(selection) { selection.toSet() }
    val initialSet = remember(currentSongIds) { currentSongIds.toSet() }
    val addedCount = selection.count { it !in initialSet }
    val removedCount = currentSongIds.count { it !in selectedSet }
    val hasChanges = addedCount > 0 || removedCount > 0

    fun toggle(songId: Long) {
        selection = if (songId in selectedSet) selection.filter { it != songId }.toLongArray() else selection + songId
    }
    val leave = { if (hasChanges) confirmDiscard = true else onCancel() }

    BackHandler(enabled = hasChanges) { confirmDiscard = true }

    Column(modifier.fillMaxSize()) {
        TopAppBar(
            title = {
                Column {
                    Text(stringResource(R.string.add_songs_title))
                    Text(
                        playlistName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            },
            navigationIcon = {
                IconButton(onClick = leave) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = stringResource(R.string.action_back))
                }
            },
            windowInsets = WindowInsets(0),
        )

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text(stringResource(R.string.search_hint)) },
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { query = "" }) {
                        Icon(Icons.Rounded.Close, contentDescription = stringResource(R.string.action_clear_search))
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(28.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        )

        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 8.dp)) {
            items(visibleSongs, key = { it.id }) { song ->
                val included = song.id in selectedSet
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { toggle(song.id) }
                        .padding(start = 16.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SongArtwork(song = song, requestSize = 44.dp, modifier = Modifier.size(44.dp))
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            song.artist,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Checkbox(checked = included, onCheckedChange = { toggle(song.id) })
                }
            }
        }

        // Confirm bar
        Surface(tonalElevation = 3.dp) {
            Button(
                onClick = { if (hasChanges) onSave(selection.toList()) else onCancel() },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                Text(
                    when {
                        addedCount > 0 && removedCount == 0 ->
                            pluralStringResource(R.plurals.action_add_n_songs, addedCount, addedCount)
                        hasChanges -> stringResource(R.string.action_save_changes)
                        else -> stringResource(R.string.action_done)
                    }
                )
            }
        }
    }

    if (confirmDiscard) {
        ConfirmDialog(
            title = stringResource(R.string.discard_changes_title),
            text = stringResource(R.string.discard_changes_message),
            confirmLabel = stringResource(R.string.action_discard),
            onConfirm = {
                confirmDiscard = false
                onCancel()
            },
            onDismiss = { confirmDiscard = false },
        )
    }
}
