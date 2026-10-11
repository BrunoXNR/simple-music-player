package brunoxnr.simplemusicplayer.ui.components

import android.content.Context
import android.content.Intent
import brunoxnr.simplemusicplayer.R
import brunoxnr.simplemusicplayer.data.Song

/**
 * Plain-text version of a song list, in order:
 *
 * Viagem — 12 músicas • 45:30
 *
 * 1. Even Flow — Pearl Jam (4:53)
 * ...
 */
fun formatSongList(title: String, countLabel: String, songs: List<Song>, footer: String): String =
    buildString {
        append(title).append(" — ").append(countLabel).append(" • ")
            .append(formatDuration(songs.sumOf { it.durationMs }))
        append("\n\n")
        songs.forEachIndexed { index, song ->
            append(index + 1).append(". ").append(song.title).append(" — ").append(song.artist)
                .append(" (").append(formatDuration(song.durationMs)).append(")\n")
        }
        append('\n').append(footer)
    }

/** Opens the Android share sheet (WhatsApp, e-mail, Drive, notes…) with the song list as text */
fun Context.shareSongList(title: String, songs: List<Song>) {
    val text = formatSongList(
        title = title,
        countLabel = resources.getQuantityString(R.plurals.song_count, songs.size, songs.size),
        songs = songs,
        footer = getString(R.string.share_footer),
    )
    val send = Intent(Intent.ACTION_SEND)
        .setType("text/plain")
        .putExtra(Intent.EXTRA_SUBJECT, title)
        .putExtra(Intent.EXTRA_TEXT, text)
    startActivity(Intent.createChooser(send, getString(R.string.share_chooser_title)))
}
