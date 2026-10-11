package brunoxnr.simplemusicplayer.data.db

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "favorites")
data class FavoriteEntity(
    @PrimaryKey val songId: Long,
    val addedAt: Long,
)

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val createdAt: Long,
)

@Entity(
    tableName = "playlist_songs",
    primaryKeys = ["playlistId", "songId"],
    indices = [Index("playlistId")],
)
data class PlaylistSongEntity(
    val playlistId: Long,
    val songId: Long,
    val position: Int,
)

@Dao
abstract class LibraryDao {
    // Favorites

    @Query("SELECT songId FROM favorites")
    abstract fun observeFavoriteIds(): Flow<List<Long>>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertFavorite(favorite: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE songId = :songId")
    abstract suspend fun deleteFavorite(songId: Long)

    // Playlists

    @Query("SELECT * FROM playlists ORDER BY createdAt DESC")
    abstract fun observePlaylists(): Flow<List<PlaylistEntity>>

    @Query("SELECT * FROM playlist_songs ORDER BY playlistId, position")
    abstract fun observePlaylistSongs(): Flow<List<PlaylistSongEntity>>

    @Insert
    abstract suspend fun insertPlaylist(playlist: PlaylistEntity): Long

    @Query("UPDATE playlists SET name = :name WHERE id = :playlistId")
    abstract suspend fun renamePlaylist(playlistId: Long, name: String)

    @Query("DELETE FROM playlists WHERE id = :playlistId")
    protected abstract suspend fun deletePlaylistRow(playlistId: Long)

    @Query("DELETE FROM playlist_songs WHERE playlistId = :playlistId")
    protected abstract suspend fun deletePlaylistSongs(playlistId: Long)

    @Query("SELECT COALESCE(MAX(position), -1) FROM playlist_songs WHERE playlistId = :playlistId")
    protected abstract suspend fun maxPosition(playlistId: Long): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract suspend fun insertPlaylistSongs(entries: List<PlaylistSongEntity>)

    @Query("DELETE FROM playlist_songs WHERE playlistId = :playlistId AND songId = :songId")
    abstract suspend fun removeSongFromPlaylist(playlistId: Long, songId: Long)

    @Transaction
    open suspend fun createPlaylist(name: String, songIds: List<Long>): Long {
        val playlistId = insertPlaylist(PlaylistEntity(name = name, createdAt = System.currentTimeMillis()))
        insertPlaylistSongs(songIds.distinct().mapIndexed { i, id -> PlaylistSongEntity(playlistId, id, i) })
        return playlistId
    }

    @Transaction
    open suspend fun deletePlaylist(playlistId: Long) {
        deletePlaylistSongs(playlistId)
        deletePlaylistRow(playlistId)
    }

    /** Appends songs at the end; songs already in the playlist are ignored */
    @Transaction
    open suspend fun addSongsToPlaylist(playlistId: Long, songIds: List<Long>) {
        val start = maxPosition(playlistId) + 1
        insertPlaylistSongs(songIds.distinct().mapIndexed { i, id -> PlaylistSongEntity(playlistId, id, start + i) })
    }

    @Transaction
    open suspend fun replacePlaylistSongs(playlistId: Long, songIds: List<Long>) {
        deletePlaylistSongs(playlistId)
        insertPlaylistSongs(songIds.distinct().mapIndexed { i, id -> PlaylistSongEntity(playlistId, id, i) })
    }
}

@Database(
    entities = [FavoriteEntity::class, PlaylistEntity::class, PlaylistSongEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun libraryDao(): LibraryDao

    companion object {
        fun create(context: Context): AppDatabase =
            Room.databaseBuilder(context, AppDatabase::class.java, "library.db").build()
    }
}
