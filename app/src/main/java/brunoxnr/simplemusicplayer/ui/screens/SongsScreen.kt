package brunoxnr.simplemusicplayer.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Sort
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Folder
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.GroupType
import brunoxnr.simplemusicplayer.data.Song
import brunoxnr.simplemusicplayer.data.SongGroup
import brunoxnr.simplemusicplayer.data.SongSort
import brunoxnr.simplemusicplayer.data.groupedBy
import brunoxnr.simplemusicplayer.data.search
import brunoxnr.simplemusicplayer.data.searchGroups
import brunoxnr.simplemusicplayer.data.sortedBy
import brunoxnr.simplemusicplayer.ui.components.SongArtwork
import brunoxnr.simplemusicplayer.ui.components.SongRow

/** What the Songs tab lists: songs (all / favorites) or groups of songs */
private enum class LibraryView(val labelRes: Int, val groupType: GroupType?) {
    ALL(R.string.filter_all, null),
    FAVORITES(R.string.filter_favorites, null),
    FOLDERS(R.string.filter_folders, GroupType.FOLDER),
    ALBUMS(R.string.filter_albums, GroupType.ALBUM),
    ARTISTS(R.string.filter_artists, GroupType.ARTIST),
}

@Composable
fun SongsScreen(
    songs: List<Song>,
    libraryLoaded: Boolean,
    favoriteIds: Set<Long>,
    currentSongId: Long?,
    isPlaying: Boolean,
    onPlay: (songs: List<Song>, index: Int) -> Unit,
    onShuffle: (songs: List<Song>) -> Unit,
    onMore: (Song) -> Unit,
    onOpenGroup: (GroupType, key: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var query by rememberSaveable { mutableStateOf("") }
    var sort by rememberSaveable { mutableStateOf(SongSort.TITLE) }
    var ascending by rememberSaveable { mutableStateOf(true) }
    var view by rememberSaveable { mutableStateOf(LibraryView.ALL) }
    var sortMenuOpen by remember { mutableStateOf(false) }

    val variousArtists = stringResource(R.string.various_artists)
    val rootFolder = stringResource(R.string.internal_storage)
    val groupType = view.groupType

    val visibleSongs = remember(songs, query, sort, ascending, view, favoriteIds) {
        if (groupType != null) emptyList()
        else songs
            .let { list -> if (view == LibraryView.FAVORITES) list.filter { it.id in favoriteIds } else list }
            .search(query)
            .sortedBy(sort, ascending)
    }
    val visibleGroups = remember(songs, query, groupType, variousArtists, rootFolder) {
        if (groupType == null) emptyList()
        else songs.groupedBy(groupType, variousArtists, rootFolder).searchGroups(query)
    }

    Column(modifier.fillMaxSize()) {
        // Search + sort
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
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
                modifier = Modifier.weight(1f),
            )
            Box {
                IconButton(onClick = { sortMenuOpen = true }, enabled = groupType == null) {
                    Icon(Icons.AutoMirrored.Rounded.Sort, contentDescription = stringResource(R.string.action_sort))
                }
                DropdownMenu(expanded = sortMenuOpen, onDismissRequest = { sortMenuOpen = false }) {
                    SongSort.entries.forEach { option ->
                        DropdownMenuItem(
                            text = { Text(stringResource(option.labelRes())) },
                            trailingIcon = {
                                if (option == sort) {
                                    Text(if (ascending) "↑" else "↓", style = MaterialTheme.typography.titleMedium)
                                }
                            },
                            onClick = {
                                // Selecting the active option again flips the direction
                                if (option == sort) ascending = !ascending
                                else {
                                    sort = option
                                    ascending = option != SongSort.DATE_ADDED
                                }
                                sortMenuOpen = false
                            },
                        )
                    }
                }
            }
        }

        // View chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LibraryView.entries.forEach { option ->
                FilterChip(
                    selected = view == option,
                    onClick = { view = option },
                    label = { Text(stringResource(option.labelRes)) },
                    leadingIcon = if (view == option) {
                        { Icon(Icons.Rounded.Check, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    } else null,
                )
            }
        }

        when {
            !libraryLoaded -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }

            songs.isEmpty() -> EmptyState(
                icon = Icons.Rounded.LibraryMusic,
                title = stringResource(R.string.empty_library_title),
                message = stringResource(R.string.empty_library_message),
            )

            groupType != null -> GroupList(
                groups = visibleGroups,
                type = groupType,
                onOpenGroup = onOpenGroup,
            )

            visibleSongs.isEmpty() -> EmptyState(
                icon = if (query.isNotBlank()) Icons.Rounded.Search else Icons.Rounded.LibraryMusic,
                title = stringResource(if (query.isNotBlank()) R.string.empty_search_title else R.string.empty_favorites_title),
                message = stringResource(if (query.isNotBlank()) R.string.empty_search_message else R.string.empty_favorites_message),
            )

            else -> {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CountLabel(pluralStringResource(R.plurals.song_count, visibleSongs.size, visibleSongs.size))
                    Spacer(Modifier.weight(1f))
                    if (visibleSongs.size > 1) {
                        FilledTonalButton(onClick = { onShuffle(visibleSongs) }) {
                            Icon(Icons.Rounded.Shuffle, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.action_shuffle))
                        }
                    }
                }
                LazyColumn(contentPadding = PaddingValues(bottom = 8.dp), modifier = Modifier.fillMaxSize()) {
                    itemsIndexed(visibleSongs, key = { _, song -> song.id }) { index, song ->
                        SongRow(
                            song = song,
                            isCurrent = song.id == currentSongId,
                            isPlaying = isPlaying,
                            onClick = { onPlay(visibleSongs, index) },
                            onMore = { onMore(song) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupList(
    groups: List<SongGroup>,
    type: GroupType,
    onOpenGroup: (GroupType, key: String) -> Unit,
) {
    if (groups.isEmpty()) {
        EmptyState(
            icon = Icons.Rounded.Search,
            title = stringResource(R.string.empty_search_title),
            message = stringResource(R.string.empty_search_message),
        )
        return
    }
    val countRes = when (type) {
        GroupType.FOLDER -> R.plurals.folder_count
        GroupType.ALBUM -> R.plurals.album_count
        GroupType.ARTIST -> R.plurals.artist_count
    }
    CountLabel(
        pluralStringResource(countRes, groups.size, groups.size),
        Modifier.padding(start = 16.dp, top = 4.dp, bottom = 4.dp),
    )
    LazyColumn(contentPadding = PaddingValues(bottom = 8.dp), modifier = Modifier.fillMaxSize()) {
        items(groups, key = { it.key }) { group ->
            val songCount = pluralStringResource(R.plurals.song_count, group.songs.size, group.songs.size)
            ListItem(
                headlineContent = { Text(group.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                supportingContent = {
                    Text(
                        listOfNotNull(group.subtitle, songCount).joinToString(" • "),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                leadingContent = {
                    when (type) {
                        GroupType.ALBUM -> SongArtwork(
                            song = group.songs.first(),
                            requestSize = 48.dp,
                            modifier = Modifier.size(48.dp),
                        )
                        GroupType.FOLDER -> GroupIcon(Icons.Rounded.Folder)
                        GroupType.ARTIST -> GroupIcon(Icons.Rounded.Person)
                    }
                },
                colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                modifier = Modifier.clickable { onOpenGroup(type, group.key) },
            )
        }
    }
}

@Composable
private fun GroupIcon(icon: ImageVector) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.secondaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
    }
}

@Composable
private fun CountLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}

internal fun SongSort.labelRes(): Int = when (this) {
    SongSort.TITLE -> R.string.sort_title
    SongSort.ARTIST -> R.string.sort_artist
    SongSort.ALBUM -> R.string.sort_album
    SongSort.DURATION -> R.string.sort_duration
    SongSort.DATE_ADDED -> R.string.sort_date_added
}

@Composable
fun EmptyState(icon: ImageVector, title: String, message: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(56.dp), tint = MaterialTheme.colorScheme.outline)
        Spacer(Modifier.size(12.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.size(4.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
