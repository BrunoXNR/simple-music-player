package brunoxnr.simplemusicplayer.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DragHandle
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.SortByAlpha
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.Playlist
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyListState

/**
 * Favorites plus the user's playlists. Playlists can be reordered by dragging the handle
 * or sorted by name in one tap; [onReorder] receives the ids from top to bottom.
 */
@Composable
fun PlaylistsScreen(
    playlists: List<Playlist>,
    favoritesCount: Int,
    onOpenFavorites: () -> Unit,
    onOpenPlaylist: (Playlist) -> Unit,
    onCreatePlaylist: () -> Unit,
    onReorder: (playlistIds: List<Long>) -> Unit,
    onSortByName: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Local copy so dragging is smooth; saved when the drag ends
    var orderedPlaylists by remember(playlists) { mutableStateOf(playlists) }
    val listState = rememberLazyListState()
    val reorderState = rememberReorderableLazyListState(listState) { from, to ->
        // Favorites and the header have string keys, so they never move
        val fromIndex = orderedPlaylists.indexOfFirst { it.id == from.key }
        val toIndex = orderedPlaylists.indexOfFirst { it.id == to.key }
        if (fromIndex >= 0 && toIndex >= 0) {
            orderedPlaylists = orderedPlaylists.toMutableList().apply { add(toIndex, removeAt(fromIndex)) }
        }
    }

    LazyColumn(modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(vertical = 8.dp)) {
        item(key = "favorites") {
            CollectionRow(
                icon = Icons.Rounded.Favorite,
                iconBackground = MaterialTheme.colorScheme.errorContainer,
                iconTint = MaterialTheme.colorScheme.onErrorContainer,
                title = stringResource(R.string.favorites),
                subtitle = pluralStringResource(R.plurals.song_count, favoritesCount, favoritesCount),
                onClick = onOpenFavorites,
            )
        }

        item(key = "header") {
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.my_playlists),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                if (orderedPlaylists.size > 1) {
                    IconButton(onClick = onSortByName) {
                        Icon(Icons.Rounded.SortByAlpha, contentDescription = stringResource(R.string.action_sort_by_name))
                    }
                }
                TextButton(onClick = onCreatePlaylist) {
                    Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text(stringResource(R.string.action_new_playlist), modifier = Modifier.padding(start = 6.dp))
                }
            }
        }

        if (orderedPlaylists.isEmpty()) {
            item(key = "empty") {
                Text(
                    stringResource(R.string.empty_playlists_message),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }
        }

        items(orderedPlaylists, key = { it.id }) { playlist ->
            ReorderableItem(reorderState, key = playlist.id) { isDragging ->
                val elevation by animateDpAsState(if (isDragging) 6.dp else 0.dp, label = "drag elevation")
                Surface(shadowElevation = elevation) {
                    CollectionRow(
                        icon = Icons.AutoMirrored.Rounded.QueueMusic,
                        iconBackground = MaterialTheme.colorScheme.secondaryContainer,
                        iconTint = MaterialTheme.colorScheme.onSecondaryContainer,
                        title = playlist.name,
                        subtitle = pluralStringResource(R.plurals.song_count, playlist.songIds.size, playlist.songIds.size),
                        onClick = { onOpenPlaylist(playlist) },
                        trailing = {
                            IconButton(
                                onClick = {},
                                modifier = Modifier.draggableHandle(
                                    onDragStopped = { onReorder(orderedPlaylists.map { it.id }) },
                                ),
                            ) {
                                Icon(
                                    Icons.Rounded.DragHandle,
                                    contentDescription = stringResource(R.string.action_drag_to_reorder),
                                )
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun CollectionRow(
    icon: ImageVector,
    iconBackground: Color,
    iconTint: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    trailing: (@Composable () -> Unit)? = null,
) {
    ListItem(
        headlineContent = { Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
        supportingContent = { Text(subtitle) },
        leadingContent = {
            Box(
                modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(iconBackground),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = iconTint)
            }
        },
        trailingContent = trailing,
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = Modifier.clickable(onClick = onClick),
    )
}
