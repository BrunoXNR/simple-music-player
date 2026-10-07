export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url: string;
  fileName: string;
  format: 'mp3' | 'wav' | 'm4a' | 'ogg' | 'flac';
  size?: number; // in bytes
  dateAdded: number;
  isFavorite?: boolean;
  folder?: string;
  artworkUrl?: string;
  unavailable?: boolean;
  queueInstanceId?: string;
}

export type LibraryFilter = 'all' | 'artists' | 'albums' | 'folders' | 'favorites';

export interface SavedPlayerState {
  currentSongId: string | null;
  currentTime: number;
  queueIds: string[];
  isShuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  songIds: string[]; // preserves manual custom order
}

export type SortField = 'name' | 'duration' | 'artist' | 'custom';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type M3ThemeColor = 'teal' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'slate';

export interface M3ThemePalette {
  name: M3ThemeColor;
  label: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondaryContainer: string;
  surface: string;
  surfaceVariant: string;
  outline: string;
  accentHex: string;
}
