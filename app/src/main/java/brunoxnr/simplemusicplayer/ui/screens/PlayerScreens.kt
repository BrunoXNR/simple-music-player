package brunoxnr.simplemusicplayer.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.PlaylistAdd
import androidx.compose.material.icons.automirrored.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DragHandle
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.RepeatOne
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.Song
import brunoxnr.simplemusicplayer.playback.PlayerUiState
import brunoxnr.simplemusicplayer.playback.QueueEntry
import brunoxnr.simplemusicplayer.ui.components.ConfirmDialog
import brunoxnr.simplemusicplayer.ui.components.SongArtwork
import brunoxnr.simplemusicplayer.ui.components.SongRow
import brunoxnr.simplemusicplayer.ui.components.formatDuration
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyListState

/** Compact player shown above the bottom navigation; tap to expand */
@Composable
fun MiniPlayer(
    song: Song,
    state: PlayerUiState,
    onClick: () -> Unit,
    onPlayPause: () -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val duration = state.durationMs.takeIf { it > 0 } ?: song.durationMs
    val progress = if (duration > 0) (state.positionMs.toFloat() / duration).coerceIn(0f, 1f) else 0f

    Surface(
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Column {
            Box(Modifier.fillMaxWidth().height(2.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                Box(Modifier.fillMaxWidth(progress).fillMaxHeight().background(MaterialTheme.colorScheme.primary))
            }
            Row(
                modifier = Modifier.padding(start = 12.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SongArtwork(song = song, requestSize = 44.dp, modifier = Modifier.size(44.dp), cornerRadius = 8.dp)
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(
                        song.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        song.artist,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                IconButton(onClick = onPlayPause) {
                    Icon(
                        if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = stringResource(if (state.isPlaying) R.string.action_pause else R.string.action_play),
                    )
                }
                IconButton(onClick = onNext) {
                    Icon(Icons.Rounded.SkipNext, contentDescription = stringResource(R.string.action_next))
                }
            }
        }
    }
}

/** Full-screen player */
@Composable
fun NowPlayingScreen(
    song: Song,
    state: PlayerUiState,
    isFavorite: Boolean,
    onCollapse: () -> Unit,
    onOpenQueue: () -> Unit,
    onToggleFavorite: () -> Unit,
    onAddToPlaylist: () -> Unit,
    onPlayPause: () -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onSeek: (Long) -> Unit,
    onToggleShuffle: () -> Unit,
    onCycleRepeat: () -> Unit,
) {
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier.fillMaxSize().systemBarsPadding().padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onCollapse) {
                    Icon(Icons.Rounded.KeyboardArrowDown, contentDescription = stringResource(R.string.action_collapse_player))
                }
                Text(
                    stringResource(R.string.now_playing),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onOpenQueue) {
                    Icon(Icons.AutoMirrored.Rounded.QueueMusic, contentDescription = stringResource(R.string.queue))
                }
            }

            Spacer(Modifier.weight(1f))

            SongArtwork(
                song = song,
                requestSize = 360.dp,
                cornerRadius = 24.dp,
                modifier = Modifier.fillMaxWidth().widthIn(max = 420.dp).aspectRatio(1f),
            )

            Spacer(Modifier.weight(1f))

            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        song.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        song.artist,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        song.album,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                IconButton(onClick = onAddToPlaylist) {
                    Icon(Icons.AutoMirrored.Rounded.PlaylistAdd, contentDescription = stringResource(R.string.action_add_to_playlist))
                }
                IconButton(onClick = onToggleFavorite) {
                    Icon(
                        if (isFavorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                        contentDescription = stringResource(if (isFavorite) R.string.action_unfavorite else R.string.action_favorite),
                        tint = if (isFavorite) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Seek bar: follows playback, except while the user is dragging it
            val duration = (state.durationMs.takeIf { it > 0 } ?: song.durationMs).coerceAtLeast(1L)
            var dragPosition by remember { mutableStateOf<Float?>(null) }
            val position = (dragPosition ?: state.positionMs.toFloat()).coerceIn(0f, duration.toFloat())
            Slider(
                value = position,
                onValueChange = { dragPosition = it },
                onValueChangeFinished = {
                    dragPosition?.let { onSeek(it.toLong()) }
                    dragPosition = null
                },
                valueRange = 0f..duration.toFloat(),
                modifier = Modifier.padding(top = 16.dp),
            )
            Row(Modifier.fillMaxWidth()) {
                Text(formatDuration(position.toLong()), style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.weight(1f))
                Text(formatDuration(duration), style = MaterialTheme.typography.labelMedium)
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onToggleShuffle) {
                    Icon(
                        Icons.Rounded.Shuffle,
                        contentDescription = stringResource(if (state.shuffleEnabled) R.string.shuffle_on else R.string.shuffle_off),
                        tint = if (state.shuffleEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                    )
                }
                IconButton(onClick = onPrevious, modifier = Modifier.size(56.dp)) {
                    Icon(Icons.Rounded.SkipPrevious, contentDescription = stringResource(R.string.action_previous), modifier = Modifier.size(36.dp))
                }
                FilledIconButton(onClick = onPlayPause, modifier = Modifier.size(76.dp)) {
                    Icon(
                        if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = stringResource(if (state.isPlaying) R.string.action_pause else R.string.action_play),
                        modifier = Modifier.size(40.dp),
                    )
                }
                IconButton(onClick = onNext, modifier = Modifier.size(56.dp)) {
                    Icon(Icons.Rounded.SkipNext, contentDescription = stringResource(R.string.action_next), modifier = Modifier.size(36.dp))
                }
                IconButton(onClick = onCycleRepeat) {
                    Icon(
                        if (state.repeatMode == Player.REPEAT_MODE_ONE) Icons.Rounded.RepeatOne else Icons.Rounded.Repeat,
                        contentDescription = stringResource(
                            when (state.repeatMode) {
                                Player.REPEAT_MODE_ALL -> R.string.repeat_all
                                Player.REPEAT_MODE_ONE -> R.string.repeat_one
                                else -> R.string.repeat_off
                            }
                        ),
                        tint = if (state.repeatMode != Player.REPEAT_MODE_OFF) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outline,
                    )
                }
            }
        }
    }
}

/** Play queue in play order: tap to jump, drag to reorder, ✕ to remove */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QueueScreen(
    queue: List<QueueEntry>,
    songsById: Map<Long, Song>,
    currentIndex: Int,
    isPlaying: Boolean,
    onClose: () -> Unit,
    onPlayIndex: (Int) -> Unit,
    onRemoveIndex: (Int) -> Unit,
    onMove: (from: Int, to: Int) -> Unit,
    onClear: () -> Unit,
) {
    var confirmClear by remember { mutableStateOf(false) }
    var entries by remember(queue) { mutableStateOf(queue) }
    var dragFrom by remember { mutableIntStateOf(-1) }
    val listState = rememberLazyListState()
    val reorderState = rememberReorderableLazyListState(listState) { from, to ->
        entries = entries.toMutableList().apply { add(to.index, removeAt(from.index)) }
    }

    LaunchedEffect(Unit) {
        if (currentIndex > 0) listState.scrollToItem(currentIndex)
    }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxSize().systemBarsPadding()) {
            TopAppBar(
                title = {
                    Column {
                        Text(stringResource(R.string.queue))
                        Text(
                            pluralStringResource(R.plurals.song_count, queue.size, queue.size),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Rounded.KeyboardArrowDown, contentDescription = stringResource(R.string.action_close))
                    }
                },
                actions = {
                    if (queue.size > 1) {
                        TextButton(onClick = { confirmClear = true }) { Text(stringResource(R.string.action_clear)) }
                    }
                },
                windowInsets = WindowInsets(0),
            )

            LazyColumn(state = listState, contentPadding = PaddingValues(bottom = 8.dp), modifier = Modifier.fillMaxSize()) {
                itemsIndexed(entries, key = { _, entry -> entry.key }) { index, entry ->
                    val song = songsById[entry.songId] ?: return@itemsIndexed
                    ReorderableItem(reorderState, key = entry.key) { isDragging ->
                        val elevation by animateDpAsState(if (isDragging) 6.dp else 0.dp, label = "drag elevation")
                        Surface(shadowElevation = elevation) {
                            SongRow(
                                song = song,
                                isCurrent = index == currentIndex,
                                isPlaying = isPlaying,
                                onClick = { onPlayIndex(index) },
                                onMore = null,
                                leading = {
                                    IconButton(
                                        onClick = {},
                                        modifier = Modifier.draggableHandle(
                                            onDragStarted = { dragFrom = entries.indexOfFirst { it.key == entry.key } },
                                            onDragStopped = {
                                                val to = entries.indexOfFirst { it.key == entry.key }
                                                if (dragFrom >= 0 && to >= 0) onMove(dragFrom, to)
                                                dragFrom = -1
                                            },
                                        ),
                                    ) {
                                        Icon(Icons.Rounded.DragHandle, contentDescription = stringResource(R.string.action_drag_to_reorder))
                                    }
                                },
                                trailing = {
                                    IconButton(onClick = { onRemoveIndex(index) }) {
                                        Icon(Icons.Rounded.Close, contentDescription = stringResource(R.string.action_remove_from_queue))
                                    }
                                },
                            )
                        }
                    }
                }
            }
        }
    }

    if (confirmClear) {
        ConfirmDialog(
            title = stringResource(R.string.clear_queue_title),
            text = stringResource(R.string.clear_queue_message),
            confirmLabel = stringResource(R.string.action_clear),
            onConfirm = {
                onClear()
                confirmClear = false
            },
            onDismiss = { confirmClear = false },
        )
    }
}
