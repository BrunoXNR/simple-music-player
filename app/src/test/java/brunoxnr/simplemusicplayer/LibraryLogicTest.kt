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
import brunoxnr.simplemusicplayer.ui.components.formatSongList
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
    fun sortsByFileNameWithNumbersInNaturalOrder() {
        // song() names the file "<title>.mp3"
        val songs = listOf(song(1, "10 - Dez"), song(2, "b - Banda"), song(3, "2 - Dois"), song(4, "A - Abertura"), song(5, "02 - Zero dois"))
        assertEquals(listOf(3L, 5L, 1L, 4L, 2L), songs.sortedBy(SongSort.FILE_NAME, ascending = true).map { it.id })
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
    fun formatsSharedSongListInOrder() {
        val songs = listOf(
            song(1, "Even Flow", artist = "Pearl Jam", durationMs = 293_000),
            song(2, "Alive", artist = "Pearl Jam", durationMs = 341_000),
        )
        val expected = """
            Viagem — 2 músicas • 10:34

            1. Even Flow — Pearl Jam (4:53)
            2. Alive — Pearl Jam (5:41)

            Rodapé
        """.trimIndent()
        assertEquals(expected, formatSongList("Viagem", "2 músicas", songs, "Rodapé"))
    }

    @Test
    fun formatsDurations() {
        assertEquals("0:00", formatDuration(0))
        assertEquals("3:07", formatDuration(187_000))
        assertEquals("1:02:45", formatDuration(3_765_000))
    }
}
