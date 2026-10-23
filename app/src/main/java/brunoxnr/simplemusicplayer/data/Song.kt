package brunoxnr.simplemusicplayer.data

import android.net.Uri

/**
 * An audio file indexed by the system MediaStore. [id] is the MediaStore row id.
 */
data class Song(
    val id: Long,
    val title: String,
    val artist: String,
    val album: String,
    val albumId: Long,
    val durationMs: Long,
    val folder: String,
    val fileName: String,
    val dateAddedSec: Long,
    /** Disc * 1000 + track number from the tags (0 when unknown) */
    val track: Int,
) {
    val uri: Uri get() = MediaStoreScanner.songUri(id)
}

data class Playlist(
    val id: Long,
    val name: String,
    val createdAt: Long,
    /** Song ids in the user's custom order */
    val songIds: List<Long>,
)

enum class SongSort { TITLE, ARTIST, ALBUM, DURATION, DATE_ADDED, FILE_NAME }

fun List<Song>.sortedBy(sort: SongSort, ascending: Boolean): List<Song> {
    val comparator: Comparator<Song> = when (sort) {
        SongSort.TITLE -> compareBy(String.CASE_INSENSITIVE_ORDER) { it.title }
        SongSort.ARTIST -> compareBy<Song, String>(String.CASE_INSENSITIVE_ORDER) { it.artist }
            .thenBy(String.CASE_INSENSITIVE_ORDER) { it.title }
        SongSort.ALBUM -> compareBy<Song, String>(String.CASE_INSENSITIVE_ORDER) { it.album }
            .thenBy(String.CASE_INSENSITIVE_ORDER) { it.title }
        SongSort.DURATION -> compareBy { it.durationMs }
        SongSort.DATE_ADDED -> compareBy { it.dateAddedSec }
        SongSort.FILE_NAME -> compareBy(NaturalOrder) { it.fileName }
    }
    return sortedWith(if (ascending) comparator else comparator.reversed())
}

/**
 * Case-insensitive order where digit runs compare as numbers, like file managers do:
 * "2 - Song" comes before "10 - Song".
 */
internal object NaturalOrder : Comparator<String> {
    private val CHUNK = Regex("""\d+|\D+""")

    override fun compare(a: String, b: String): Int {
        val chunksA = CHUNK.findAll(a).map { it.value }.toList()
        val chunksB = CHUNK.findAll(b).map { it.value }.toList()
        for (i in 0 until minOf(chunksA.size, chunksB.size)) {
            val x = chunksA[i]
            val y = chunksB[i]
            val result = if (x[0].isDigit() && y[0].isDigit()) {
                // Compare by value without overflowing on long digit runs: strip zeros, then length
                val nx = x.trimStart('0')
                val ny = y.trimStart('0')
                if (nx.length != ny.length) nx.length - ny.length else nx.compareTo(ny)
            } else {
                x.compareTo(y, ignoreCase = true)
            }
            if (result != 0) return result
        }
        return chunksA.size - chunksB.size
    }
}

/** Leading track number in file names: "01 - ", "07. ", "3_", "12) " */
private val LEADING_TRACK_NUMBER = Regex("""^\d{1,3}\s*[-._)]\s*""")

/**
 * Best-effort (artist, title) for untagged files, which are usually named like
 * "Artist - Title.mp3" or "01 - Artist - Title.mp3". Artist is null when the name has none.
 */
fun parseFileName(baseName: String): Pair<String?, String> {
    val name = baseName.replaceFirst(LEADING_TRACK_NUMBER, "").trim().ifEmpty { baseName }
    val separator = name.indexOf(" - ")
    if (separator > 0) {
        val artist = name.substring(0, separator).trim()
        val title = name.substring(separator + 3).trim()
        if (artist.isNotEmpty() && title.isNotEmpty()) return artist to title
    }
    return null to name
}

/** Case- and accent-insensitive search over title, artist, album and file name */
fun List<Song>.search(query: String): List<Song> {
    val q = query.trim().normalizedForSearch()
    if (q.isEmpty()) return this
    return filter { song ->
        listOf(song.title, song.artist, song.album, song.fileName)
            .any { it.normalizedForSearch().contains(q) }
    }
}

internal fun String.normalizedForSearch(): String =
    java.text.Normalizer.normalize(lowercase(), java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
