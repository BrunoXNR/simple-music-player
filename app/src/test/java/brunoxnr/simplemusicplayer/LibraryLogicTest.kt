package brunoxnr.simplemusicplayer

import brunoxnr.simplemusicplayer.data.GroupType
import brunoxnr.simplemusicplayer.data.Song
import brunoxnr.simplemusicplayer.data.groupedBy
import brunoxnr.simplemusicplayer.data.searchGroups
import brunoxnr.simplemusicplayer.data.SongSort
import brunoxnr.simplemusicplayer.data.search
import brunoxnr.simplemusicplayer.data.sortedBy
import brunoxnr.simplemusicplayer.data.parseFileName
import brunoxnr.simplemusicplayer.ui.components.formatDuration
import org.junit.Assert.assertEquals
import org.junit.Test

class LibraryLogicTest {

    private fun song(id: Long, title: String, artist: String = "Artista", durationMs: Long = 1000, added: Long = 0) =
        Song(
            id = id,
            title = title,
            artist = artist,
            album = "Álbum",
            albumId = 0,
            durationMs = durationMs,
            folder = "Music",
            fileName = "$title.mp3",
            dateAddedSec = added,
            track = 0,
        )

    @Test
    fun searchIgnoresCaseAndAccents() {
        val songs = listOf(song(1, "Coração Selvagem"), song(2, "Outra"), song(3, "Canção", artist = "João"))
        assertEquals(listOf(1L), songs.search("coracao").map { it.id })
        assertEquals(listOf(3L), songs.search("JOAO").map { it.id })
        assertEquals(songs, songs.search("  "))
    }

    @Test
    fun sortsByTitleCaseInsensitiveAndByDuration() {
        val songs = listOf(song(1, "beta", durationMs = 300), song(2, "Alfa", durationMs = 100), song(3, "gama", durationMs = 200))
        assertEquals(listOf(2L, 1L, 3L), songs.sortedBy(SongSort.TITLE, ascending = true).map { it.id })
        assertEquals(listOf(1L, 3L, 2L), songs.sortedBy(SongSort.DURATION, ascending = false).map { it.id })
    }

    @Test
    fun parsesArtistAndTitleFromFileName() {
        assertEquals("Ana Lima" to "Café da Manhã", parseFileName("Ana Lima - Café da Manhã"))
        assertEquals("Banda" to "Música - Ao Vivo", parseFileName("Banda - Música - Ao Vivo"))
        assertEquals("Ana Lima" to "Partida", parseFileName("01 - Ana Lima - Partida"))
        assertEquals(null to "Abertura", parseFileName("07. Abertura"))
        assertEquals(null to "Faixa 01", parseFileName("Faixa 01"))
        assertEquals(null to "2001", parseFileName("2001"))
    }

    @Test
    fun groupsFoldersInFileNameOrderAndAlbumsInTrackOrder() {
        val songs = listOf(
            song(1, "B").copy(folder = "Music/Rock", fileName = "02 - B.mp3", albumId = 7, track = 2),
            song(2, "A").copy(folder = "Music/Rock", fileName = "01 - A.mp3", albumId = 7, track = 1),
            song(3, "C", artist = "Outro").copy(folder = "", fileName = "c.mp3", albumId = 7, track = 3),
        )

        val folders = songs.groupedBy(GroupType.FOLDER, "Vários", "Interno")
        assertEquals(listOf("Interno", "Rock"), folders.map { it.title })
        assertEquals(listOf(2L, 1L), folders[1].songs.map { it.id })

        val album = songs.groupedBy(GroupType.ALBUM, "Vários", "Interno").single()
        assertEquals(listOf(2L, 1L, 3L), album.songs.map { it.id })
        assertEquals("Vários", album.subtitle)

        assertEquals(listOf("Rock"), folders.searchGroups("rock").map { it.title })
    }

    @Test
    fun formatsDurations() {
        assertEquals("0:00", formatDuration(0))
        assertEquals("3:07", formatDuration(187_000))
        assertEquals("1:02:45", formatDuration(3_765_000))
    }
}
