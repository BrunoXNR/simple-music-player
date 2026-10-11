package brunoxnr.simplemusicplayer.data

import brunoxnr.simplemusicplayer.data.db.FavoriteEntity
import brunoxnr.simplemusicplayer.data.db.LibraryDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map

/**
 * User data stored by the app (favorites and playlists). Songs themselves come from MediaStore;
 * ids that no longer exist on the device are simply skipped when displayed.
 */
class LibraryRepository(private val dao: LibraryDao) {

    val favoriteIds: Flow<Set<Long>> = dao.observeFavoriteIds().map { it.toSet() }

    val playlists: Flow<List<Playlist>> =
        combine(dao.observePlaylists(), dao.observePlaylistSongs()) { playlists, entries ->
            val songsByPlaylist = entries.groupBy({ it.playlistId }, { it.songId })
            playlists.map { p ->
                Playlist(p.id, p.name, p.createdAt, songsByPlaylist[p.id].orEmpty())
            }
        }

    suspend fun setFavorite(songId: Long, favorite: Boolean) {
        if (favorite) dao.insertFavorite(FavoriteEntity(songId, System.currentTimeMillis()))
        else dao.deleteFavorite(songId)
    }

    suspend fun createPlaylist(name: String, songIds: List<Long> = emptyList()): Long =
        dao.createPlaylist(name, songIds)

    suspend fun renamePlaylist(playlistId: Long, name: String) = dao.renamePlaylist(playlistId, name)

    suspend fun deletePlaylist(playlistId: Long) = dao.deletePlaylist(playlistId)

    suspend fun addSongs(playlistId: Long, songIds: List<Long>) = dao.addSongsToPlaylist(playlistId, songIds)

    suspend fun removeSong(playlistId: Long, songId: Long) = dao.removeSongFromPlaylist(playlistId, songId)

    suspend fun reorder(playlistId: Long, songIds: List<Long>) = dao.replacePlaylistSongs(playlistId, songIds)
}
