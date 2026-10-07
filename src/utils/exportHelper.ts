import { Song } from '../types';

/**
 * Formats duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const padSecs = secs.toString().padStart(2, '0');
  
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${padSecs}`;
  }
  return `${mins.toString().padStart(2, '0')}:${padSecs}`;
}

/**
 * Generates formatted text or CSV string for a playlist:
 * Format: "Title - Artist (Duration)"
 */
export function generatePlaylistExportContent(
  playlistName: string,
  songs: Song[],
  format: 'txt' | 'csv'
): string {
  if (format === 'csv') {
    const header = 'Title,Artist,Duration,Formatted\n';
    const rows = songs.map(song => {
      const formattedDuration = formatDuration(song.duration);
      const formattedEntry = `"${song.title} - ${song.artist} (${formattedDuration})"`;
      // Escape internal quotes
      const cleanTitle = `"${song.title.replace(/"/g, '""')}"`;
      const cleanArtist = `"${song.artist.replace(/"/g, '""')}"`;
      return `${cleanTitle},${cleanArtist},"${formattedDuration}",${formattedEntry}`;
    }).join('\n');
    return header + rows;
  } else {
    // Format: "Title - Artist (Duration)"
    const header = `# Playlist: ${playlistName}\n# Exported from Minimalist Local Music Player\n# Total Tracks: ${songs.length}\n\n`;
    const lines = songs.map(song => {
      const formattedDuration = formatDuration(song.duration);
      return `${song.title} - ${song.artist} (${formattedDuration})`;
    }).join('\n');
    return header + lines;
  }
}

/**
 * Exports playlist file using File System Access API (mimicking SAF ACTION_CREATE_DOCUMENT)
 * or falls back to traditional browser download.
 */
export async function exportPlaylistToFile(
  playlistName: string,
  songs: Song[],
  format: 'txt' | 'csv'
): Promise<{ success: boolean; fileName: string; method: 'saf' | 'download'; error?: string }> {
  const content = generatePlaylistExportContent(playlistName, songs, format);
  const cleanName = playlistName.trim().replace(/[/\\?%*:|"<>]/g, '-').toLowerCase() || 'playlist';
  const fileName = `${cleanName}_export.${format}`;
  const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';

  // Check if browser supports modern File System Access API (mirroring Android SAF ACTION_CREATE_DOCUMENT)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: Array<{
            description: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: string) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: format === 'csv' ? 'CSV Document' : 'Plain Text Playlist',
            accept: {
              [format === 'csv' ? 'text/csv' : 'text/plain']: [`.${format}`],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, fileName, method: 'saf' };
    } catch (err: unknown) {
      // User cancelled picker or permission denied; fall back to standard download if not abort
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, fileName, method: 'saf' };
      }
    }
  }

  // Fallback direct download
  const blob = new Blob([content], { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  return { success: true, fileName, method: 'download' };
}
