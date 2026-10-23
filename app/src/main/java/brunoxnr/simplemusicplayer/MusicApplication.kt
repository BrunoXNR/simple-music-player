package brunoxnr.simplemusicplayer

import android.app.Application
import brunoxnr.simplemusicplayer.data.LibraryRepository
import brunoxnr.simplemusicplayer.data.MediaStoreScanner
import brunoxnr.simplemusicplayer.data.RenamedTitles
import brunoxnr.simplemusicplayer.data.SongFiles
import brunoxnr.simplemusicplayer.data.db.AppDatabase

/** Holds app-wide singletons (simple manual dependency container) */
class MusicApplication : Application() {
    val database by lazy { AppDatabase.create(this) }
    val libraryRepository by lazy { LibraryRepository(database.libraryDao()) }
    private val renamedTitles by lazy { RenamedTitles(this) }
    val scanner by lazy { MediaStoreScanner(this, renamedTitles) }
    val songFiles by lazy { SongFiles(this, renamedTitles) }
}
