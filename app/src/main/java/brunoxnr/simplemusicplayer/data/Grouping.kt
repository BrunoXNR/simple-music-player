package brunoxnr.simplemusicplayer.data

enum class GroupType { FOLDER, ALBUM, ARTIST }

/** Songs grouped by folder, album or artist, already in their natural play order */
data class SongGroup(
    val type: GroupType,
    /** Stable identifier: folder path, MediaStore album id, or artist name */
    val key: String,
    val title: String,
    /** Full path for folders, album artist for albums, null for artists */
    val subtitle: String?,
    val songs: List<Song>,
)

/**
 * Groups the library. Albums play in track order, folders in file name order (how people
 * usually number their MP3s), artists by album then track.
 */
fun List<Song>.groupedBy(type: GroupType, variousArtists: String, rootFolder: String): List<SongGroup> {
    val byTitle = String.CASE_INSENSITIVE_ORDER
    return when (type) {
        GroupType.FOLDER -> groupBy { it.folder }
            .map { (path, songs) ->
                SongGroup(
                    type = type,
                    key = path,
                    title = path.substringAfterLast('/').ifEmpty { rootFolder },
                    subtitle = path.ifEmpty { null },
                    songs = songs.sortedWith(compareBy(byTitle) { it.fileName }),
                )
            }
            .sortedWith(compareBy(byTitle) { it.key })

        GroupType.ALBUM -> groupBy { it.albumId }
            .map { (albumId, songs) ->
                val artists = songs.map { it.artist }.distinct()
                SongGroup(
                    type = type,
                    key = albumId.toString(),
                    title = songs.first().album,
                    subtitle = artists.singleOrNull() ?: variousArtists,
                    songs = songs.sortedWith(compareBy<Song> { it.track }.thenBy(byTitle) { it.title }),
                )
            }
            .sortedWith(compareBy(byTitle) { it.title })

        GroupType.ARTIST -> groupBy { it.artist }
            .map { (artist, songs) ->
                SongGroup(
                    type = type,
                    key = artist,
                    title = artist,
                    subtitle = null,
                    songs = songs.sortedWith(
                        compareBy<Song, String>(byTitle) { it.album }.thenBy { it.track }.thenBy(byTitle) { it.title }
                    ),
                )
            }
            .sortedWith(compareBy(byTitle) { it.title })
    }
}

fun List<SongGroup>.searchGroups(query: String): List<SongGroup> {
    val q = query.trim().normalizedForSearch()
    if (q.isEmpty()) return this
    return filter { group ->
        group.title.normalizedForSearch().contains(q) ||
            group.subtitle.orEmpty().normalizedForSearch().contains(q)
    }
}
