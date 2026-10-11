/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Song, Playlist, RepeatMode, M3ThemeColor, SavedPlayerState } from './types';
import { THEME_PALETTES } from './utils/theme';
import { getInitialLocalAudioFiles, resolveSongMetadata, generateAlbumArtwork } from './utils/audioGenerator';
import { createQueueItem, findQueueIndex, isSameQueueItem, shuffleArray } from './utils/queue';
import {
  loadUserTracks,
  saveUserTrack,
  deleteUserTrack,
  hashString,
  detectAudioFormat,
  probeDuration,
} from './utils/libraryStore';
import { TopAppBar } from './components/TopAppBar';
import { NavigationBar, MainTab } from './components/NavigationBar';
import { SongsTab } from './components/SongsTab';
import { PlaylistsTab } from './components/PlaylistsTab';
import { NowPlayingBar } from './components/NowPlayingBar';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { PermissionModal } from './components/PermissionModal';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { AddSongsModal } from './components/AddSongsModal';
import { QueueModal } from './components/QueueModal';
import { SongActionMenu } from './components/SongActionMenu';
import { PlaylistPickerModal } from './components/PlaylistPickerModal';

const PLAYLISTS_STORAGE_KEY = 'minimalist_music_playlists_v1';
const THEME_STORAGE_KEY = 'minimalist_music_theme_v1';
const PERMISSION_STORAGE_KEY = 'minimalist_music_permission_granted';
const FAVORITES_STORAGE_KEY = 'minimalist_music_favorites_v1';
const PLAYER_STATE_KEY = 'minimalist_music_player_state_v1';
const DEMO_PLAYLIST_ID = 'pl_chill';

function loadSavedPlayerState(): Partial<SavedPlayerState> | null {
  try {
    const saved = localStorage.getItem(PLAYER_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.warn('Failed to parse saved player state', err);
  }
  return null;
}

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<MainTab>('songs');
  const [themeKey, setThemeKey] = useState<M3ThemeColor>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as M3ThemeColor) || 'teal';
  });
  const currentTheme = THEME_PALETTES[themeKey] || THEME_PALETTES.teal;

  // MediaStore Permission Simulation
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() => {
    const saved = localStorage.getItem(PERMISSION_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  });

  // Modal States
  const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isAndroidCodeModalOpen, setIsAndroidCodeModalOpen] = useState(false);
  const [isAddSongsModalOpen, setIsAddSongsModalOpen] = useState(false);
  const [selectedPlaylistForAdd, setSelectedPlaylistForAdd] = useState<Playlist | null>(null);
  const [playlistPickerSong, setPlaylistPickerSong] = useState<Song | null>(null);

  // Queue Modal & Contextual Menu States
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isSongActionMenuOpen, setIsSongActionMenuOpen] = useState(false);
  const [selectedSongForMenu, setSelectedSongForMenu] = useState<Song | null>(null);

  // Favorites persistence Set
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved favorites', e);
    }
    return [];
  });

  // Audio Library State
  const [songs, setSongs] = useState<Song[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Playlists State (Room Database simulation)
  // The demo playlist is only seeded on the very first run (nothing saved yet)
  const [shouldSeedDemoPlaylist] = useState(() => localStorage.getItem(PLAYLISTS_STORAGE_KEY) === null);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved playlists', e);
    }
    return [
      {
        id: DEMO_PLAYLIST_ID,
        name: 'Acoustic & Ambient',
        createdAt: Date.now() - 172800000,
        songIds: [],
      },
    ];
  });

  // Playback & Queue State
  // Read once on mount, before anything can overwrite it
  const [initialPlayerState] = useState(loadSavedPlayerState);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() =>
    typeof initialPlayerState?.volume === 'number' ? initialPlayerState.volume : 0.85
  );
  const [isShuffle, setIsShuffle] = useState<boolean>(() =>
    typeof initialPlayerState?.isShuffle === 'boolean' ? initialPlayerState.isShuffle : false
  );
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(
    () => initialPlayerState?.repeatMode || 'off'
  );

  // Hidden File Input Ref for MediaStore file selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Player state is only persisted after the library has loaded and the saved state was restored
  const libraryReadyRef = useRef(false);
  // Saved playback position, applied once the restored track's metadata is loaded
  const pendingSeekRef = useRef<{ queueInstanceId?: string; time: number } | null>(null);
  // Queue order before shuffle was turned on, used to restore it when shuffle is turned off
  const originalOrderRef = useRef<string[] | null>(null);
  const messageTimerRef = useRef<number | undefined>(undefined);

  // Latest state & handlers for long-lived listeners (audio element, Media Session),
  // which are registered once and would otherwise see stale values
  const latestRef = useRef({
    queue,
    currentSong,
    isShuffle,
    repeatMode,
    volume,
    onTrackEnded: () => {},
    skipNext: () => {},
    skipPrevious: () => {},
  });

  // Transient notification banner (each new message replaces the previous one)
  const showMessage = (message: string, durationMs: number | null = 2500) => {
    window.clearTimeout(messageTimerRef.current);
    setScanMessage(message);
    if (durationMs !== null) {
      messageTimerRef.current = window.setTimeout(() => setScanMessage(null), durationMs);
    }
  };

  const persistPlayerState = () => {
    if (!libraryReadyRef.current) return;
    const { queue, currentSong, isShuffle, repeatMode, volume } = latestRef.current;
    try {
      const stateToSave: SavedPlayerState = {
        currentSongId: currentSong?.id || null,
        currentQueueIndex: findQueueIndex(queue, currentSong),
        currentTime: pendingSeekRef.current?.time ?? audioElementRef.current?.currentTime ?? 0,
        queueIds: queue.map((s) => s.id),
        isShuffle,
        repeatMode,
        volume,
      };
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('LocalStorage player state save error', err);
    }
  };

  // Sync playlists to local persistence (Room Database simulation)
  useEffect(() => {
    try {
      localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
    } catch (err) {
      console.warn('LocalStorage save error', err);
    }
  }, [playlists]);

  // Sync theme
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  }, [themeKey]);

  // Sync permission
  useEffect(() => {
    localStorage.setItem(PERMISSION_STORAGE_KEY, permissionGranted.toString());
  }, [permissionGranted]);

  // Sync favorites
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch (err) {
      console.warn('LocalStorage favorites save error', err);
    }
  }, [favoriteIds]);

  // Persist Player State across sessions. Playback position is saved on pause / when the
  // page is hidden instead of on every timeupdate.
  useEffect(() => {
    persistPlayerState();
  }, [currentSong, queue, isShuffle, repeatMode, volume]);

  // Load local audio files on mount (demo tracks + user imports stored in IndexedDB)
  // and restore the saved queue / current track / position
  useEffect(() => {
    let mounted = true;
    async function loadInitialSongs() {
      setIsScanning(true);
      const [sampleTracks, userTracks] = await Promise.all([
        getInitialLocalAudioFiles(),
        loadUserTracks().catch((err) => {
          console.warn('Failed to load imported tracks', err);
          return [] as Song[];
        }),
      ]);
      if (!mounted) return;

      // Apply saved favorite tags
      const library = [...userTracks, ...sampleTracks].map((s) => ({
        ...s,
        isFavorite: favoriteIds.includes(s.id),
      }));

      setSongs(library);
      setIsScanning(false);

      // Restore queue
      const songsById = new Map<string, Song>(library.map((s) => [s.id, s]));
      let restoredQueue = (initialPlayerState?.queueIds ?? [])
        .map((id) => songsById.get(id))
        .filter((s): s is Song => !!s)
        .map(createQueueItem);
      if (restoredQueue.length === 0) {
        restoredQueue = library.map(createQueueItem);
      }
      setQueue(restoredQueue);

      // Restore current song and playback position
      let restoredSong: Song | undefined;
      const savedSongId = initialPlayerState?.currentSongId;
      if (savedSongId) {
        const savedIndex = initialPlayerState?.currentQueueIndex;
        restoredSong =
          savedIndex !== undefined && restoredQueue[savedIndex]?.id === savedSongId
            ? restoredQueue[savedIndex]
            : restoredQueue.find((s) => s.id === savedSongId);
        const savedTime = initialPlayerState?.currentTime ?? 0;
        if (restoredSong && savedTime > 0) {
          pendingSeekRef.current = { queueInstanceId: restoredSong.queueInstanceId, time: savedTime };
          setCurrentTime(savedTime);
        }
      }
      setCurrentSong(restoredSong ?? restoredQueue[0] ?? null);

      // Pre-populate the demo playlist on first run only
      if (shouldSeedDemoPlaylist && sampleTracks.length >= 2) {
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === DEMO_PLAYLIST_ID && p.songIds.length === 0
              ? { ...p, songIds: [sampleTracks[0].id, sampleTracks[1].id] }
              : p
          )
        );
      }

      libraryReadyRef.current = true;
    }

    loadInitialSongs();
    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = latestRef.current.volume;
    audioElementRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      const pending = pendingSeekRef.current;
      if (!pending) return;
      pendingSeekRef.current = null;
      // Only apply the saved position to the track it belongs to
      if (latestRef.current.currentSong?.queueInstanceId !== pending.queueInstanceId) return;
      const target = isFinite(audio.duration) ? Math.min(pending.time, audio.duration) : pending.time;
      audio.currentTime = target;
      setCurrentTime(target);
    };

    const onEnded = () => {
      latestRef.current.onTrackEnded();
    };

    const onError = (e: Event) => {
      // Ignore errors caused by clearing the source
      if (!audio.getAttribute('src')) return;
      console.warn('Audio playback error / file unavailable', e);
      setIsPlaying(false);

      // Flag current song as unavailable
      const failedSong = latestRef.current.currentSong;
      if (failedSong) {
        const markUnavailable = (s: Song) =>
          s.id === failedSong.id ? { ...s, unavailable: true } : s;
        setSongs((prev) => prev.map(markUnavailable));
        setQueue((prev) => prev.map(markUnavailable));
        setCurrentSong((prev) => (prev ? markUnavailable(prev) : prev));
      }

      showMessage('Música indisponível ou arquivo movido.', 4000);
    };

    const onPause = () => persistPlayerState();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistPlayerState();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);
    window.addEventListener('pagehide', persistPlayerState);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
      window.removeEventListener('pagehide', persistPlayerState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Handle Playback Change
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (!currentSong) {
      // Nothing left to play (e.g. last queue item removed)
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    if (audio.src !== currentSong.url) {
      audio.src = currentSong.url;
      audio.load();
      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Autoplay prevented', err);
          setIsPlaying(false);
        });
      }
    } else if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Playback resume error', err);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [currentSong, isPlaying]);

  // Volume Sync
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume;
    }
  }, [volume]);

  // Android MediaSessionService API integration (Background playback & notification controls)
  // Handlers are registered once and always call the latest playback functions.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported by this browser
      }
    };

    setHandler('play', () => setIsPlaying(true));
    setHandler('pause', () => setIsPlaying(false));
    setHandler('stop', () => setIsPlaying(false));
    setHandler('previoustrack', () => latestRef.current.skipPrevious());
    setHandler('nexttrack', () => latestRef.current.skipNext());
    setHandler('seekto', (details) => {
      const audio = audioElementRef.current;
      if (details.seekTime !== undefined && audio) {
        audio.currentTime = details.seekTime;
        setCurrentTime(details.seekTime);
      }
    });
    setHandler('seekforward', (details) => {
      const audio = audioElementRef.current;
      if (!audio) return;
      const offset = details.seekOffset || 10;
      const maxTime = isFinite(audio.duration) ? audio.duration : audio.currentTime + offset;
      audio.currentTime = Math.min(maxTime, audio.currentTime + offset);
    });
    setHandler('seekbackward', (details) => {
      const audio = audioElementRef.current;
      if (!audio) return;
      const offset = details.seekOffset || 10;
      audio.currentTime = Math.max(0, audio.currentTime - offset);
    });
  }, []);

  // Media Session metadata (notification / lock screen)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'Minimalist Local Music Player',
      artwork: currentSong.artworkUrl
        ? [
            {
              src: currentSong.artworkUrl,
              sizes: '300x300',
              type: 'image/svg+xml',
            },
          ]
        : [
            {
              src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="%23006A67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
          ],
    });
  }, [currentSong]);

  const seekToStart = () => {
    pendingSeekRef.current = null;
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  // Track Ended Handler
  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      seekToStart();
      audioElementRef.current?.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
      return;
    }

    // Skip to next in queue
    skipNext();
  };

  // Moves playback to a queue entry; replaying the same entry restarts it
  const goToQueueItem = (song: Song) => {
    if (isSameQueueItem(song, currentSong)) {
      seekToStart();
      if (isPlaying) {
        audioElementRef.current?.play().catch(() => setIsPlaying(false));
      }
      return;
    }
    setCurrentSong(song);
  };

  // Play Song immediately
  const playSong = (song: Song) => {
    const queuedIndex = findQueueIndex(queue, song);
    if (queuedIndex !== -1) {
      setCurrentSong(queue[queuedIndex]);
    } else {
      // Insert right after the current song so the rest of the queue continues afterwards
      const item = createQueueItem(song);
      const currentIndex = findQueueIndex(queue, currentSong);
      const updated = [...queue];
      updated.splice(currentIndex + 1, 0, item);
      setQueue(updated);
      setCurrentSong(item);
    }
    setIsPlaying(true);
  };

  // Play a full custom queue (e.g. from playlist or artist/album Play All)
  const playQueue = (songsToPlay: Song[]) => {
    if (songsToPlay.length === 0) return;
    const items = songsToPlay.map(createQueueItem);
    let ordered = items;
    if (isShuffle) {
      originalOrderRef.current = items.map((s) => s.queueInstanceId!);
      ordered = shuffleArray(items);
    }
    setQueue(ordered);
    setCurrentSong(ordered[0]);
    setIsPlaying(true);
  };

  // Queue Operations: Add to queue
  const handleAddToQueue = (song: Song) => {
    const item = createQueueItem(song);
    if (queue.length === 0) {
      setQueue([item]);
      setCurrentSong(item);
      setIsPlaying(true);
    } else {
      setQueue([...queue, item]);
    }
    showMessage(`"${song.title}" adicionada à fila`);
  };

  // Queue Operations: Play next (insert immediately after current song)
  const handlePlayNext = (song: Song) => {
    const item = createQueueItem(song);
    if (!currentSong) {
      setQueue([item, ...queue]);
      setCurrentSong(item);
      setIsPlaying(true);
    } else {
      const currentIndex = findQueueIndex(queue, currentSong);
      if (currentIndex === -1) {
        setQueue([currentSong, item, ...queue]);
      } else {
        const updated = [...queue];
        updated.splice(currentIndex + 1, 0, item);
        setQueue(updated);
      }
    }
    showMessage(`"${song.title}" tocará a seguir`);
  };

  // Queue Operations: Remove from queue
  const handleRemoveFromQueue = (index: number) => {
    const removed = queue[index];
    if (!removed) return;
    const updated = queue.filter((_, i) => i !== index);
    setQueue(updated);

    // If removed entry was the one playing, move to the next one or stop
    if (isSameQueueItem(removed, currentSong)) {
      if (updated.length > 0) {
        setCurrentSong(updated[Math.min(index, updated.length - 1)]);
      } else {
        setCurrentSong(null);
        setIsPlaying(false);
      }
    }
  };

  // Queue Operations: Move queue item
  const handleMoveQueueItem = (fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  // Queue Operations: Full Reorder (Drag & Drop or Sort)
  const handleReorderQueue = (newQueue: Song[]) => {
    setQueue(newQueue);
  };

  // Queue Operations: Clear queue
  const handleClearQueue = () => {
    if (currentSong) {
      // Keep only currently playing song in queue
      setQueue([currentSong]);
    } else {
      setQueue([]);
    }
    showMessage('Fila de reprodução limpa', 2000);
  };

  // Toggle Favorite
  const handleToggleFavorite = (song: Song) => {
    const isNowFav = !song.isFavorite;
    const newFavoriteIds = isNowFav
      ? Array.from(new Set([...favoriteIds, song.id]))
      : favoriteIds.filter((id) => id !== song.id);

    setFavoriteIds(newFavoriteIds);

    // Update in songs array
    setSongs((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, isFavorite: isNowFav } : s))
    );

    // Update in queue
    setQueue((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, isFavorite: isNowFav } : s))
    );

    // Update in currentSong
    if (currentSong?.id === song.id) {
      setCurrentSong((prev) => (prev ? { ...prev, isFavorite: isNowFav } : prev));
    }

    showMessage(
      isNowFav
        ? `"${song.title}" adicionada aos Favoritos`
        : `"${song.title}" removida dos Favoritos`
    );
  };

  // Remove song completely from library (handles moved/deleted tracks)
  const handleRemoveFromLibrary = (songId: string) => {
    const updatedQueue = queue.filter((s) => s.id !== songId);

    if (currentSong?.id === songId) {
      // Continue with the next surviving entry after the removed one
      const currentIndex = findQueueIndex(queue, currentSong);
      const nextSong =
        queue.slice(currentIndex + 1).find((s) => s.id !== songId) ?? updatedQueue[0] ?? null;
      setCurrentSong(nextSong);
      if (!nextSong) setIsPlaying(false);
    }

    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setQueue(updatedQueue);
    setFavoriteIds((prev) => prev.filter((id) => id !== songId));

    // Remove from all playlists
    setPlaylists((prev) =>
      prev.map((p) => ({
        ...p,
        songIds: p.songIds.filter((id) => id !== songId),
      }))
    );

    // Imported files also live in IndexedDB
    deleteUserTrack(songId).catch((err) => console.warn('Failed to delete stored track', err));

    showMessage('Música removida da biblioteca local');
  };

  // Skip Next
  const skipNext = () => {
    const currentList = queue.length > 0 ? queue : songs;
    if (currentList.length === 0) return;

    const currentIndex = findQueueIndex(currentList, currentSong);
    if (currentIndex === -1) {
      setCurrentSong(currentList[0]);
    } else if (currentIndex < currentList.length - 1) {
      setCurrentSong(currentList[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      goToQueueItem(currentList[0]);
    } else {
      setIsPlaying(false);
    }
  };

  // Skip Previous
  const skipPrevious = () => {
    // If more than 3 seconds in, restart track
    if (audioElementRef.current && audioElementRef.current.currentTime > 3) {
      seekToStart();
      return;
    }

    const currentList = queue.length > 0 ? queue : songs;
    if (currentList.length === 0) return;

    const currentIndex = findQueueIndex(currentList, currentSong);
    if (currentIndex > 0) {
      setCurrentSong(currentList[currentIndex - 1]);
    } else if (repeatMode === 'all') {
      goToQueueItem(currentList[currentList.length - 1]);
    } else {
      seekToStart();
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!currentSong) {
      if (songs.length > 0) {
        playSong(songs[0]);
      }
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  // Seek
  const handleSeek = (time: number) => {
    pendingSeekRef.current = null;
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Shuffle reorders the queue itself (current song first, the rest shuffled), so the
  // queue view shows the real play order and Previous/Next stay predictable.
  // Turning it off restores the original order.
  const toggleShuffle = () => {
    if (!isShuffle) {
      originalOrderRef.current = queue.map((s) => s.queueInstanceId ?? s.id);
      const currentIndex = findQueueIndex(queue, currentSong);
      if (currentIndex === -1) {
        setQueue(shuffleArray(queue));
      } else {
        const rest = queue.filter((_, i) => i !== currentIndex);
        setQueue([queue[currentIndex], ...shuffleArray(rest)]);
      }
    } else if (originalOrderRef.current) {
      const order = new Map<string, number>(originalOrderRef.current.map((key, i) => [key, i]));
      const position = (s: Song) =>
        order.get(s.queueInstanceId ?? s.id) ?? Number.MAX_SAFE_INTEGER;
      // Stable sort: entries added while shuffled keep their relative order at the end
      setQueue([...queue].sort((a, b) => position(a) - position(b)));
      originalOrderRef.current = null;
    }
    setIsShuffle(!isShuffle);
  };

  // Cycle Repeat Mode
  const cycleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Cycle Material 3 Theme Palette
  const cycleTheme = () => {
    const keys: M3ThemeColor[] = ['teal', 'indigo', 'amber', 'emerald', 'rose', 'slate'];
    const currentIdx = keys.indexOf(themeKey);
    const nextKey = keys[(currentIdx + 1) % keys.length];
    setThemeKey(nextKey);
  };

  // Adds sample tracks that are not yet in the library; returns how many were added
  const addSampleTracks = async (): Promise<number> => {
    const scanned = await getInitialLocalAudioFiles();
    const existingIds = new Set(songs.map((s) => s.id));
    const fresh = scanned.filter((s) => !existingIds.has(s.id));
    // Release audio generated for tracks we already have
    scanned
      .filter((s) => existingIds.has(s.id))
      .forEach((s) => s.url && URL.revokeObjectURL(s.url));

    if (fresh.length > 0) {
      setSongs((prev) => [
        ...prev,
        ...fresh.map((s) => ({ ...s, isFavorite: favoriteIds.includes(s.id) })),
      ]);
    }
    return fresh.length;
  };

  // Device MediaStore Rescan Simulation
  const handleRescan = async () => {
    if (!permissionGranted) {
      setIsPermissionModalOpen(true);
      return;
    }

    setIsScanning(true);
    showMessage('Reindexando MediaStore e buscando novos arquivos de áudio...', null);

    try {
      const added = await addSampleTracks();
      showMessage(
        added > 0
          ? `Biblioteca atualizada: ${added} nova(s) música(s)`
          : 'Biblioteca atualizada com sucesso!',
        3000
      );
    } catch (err) {
      console.warn('Rescan error', err);
      showMessage('Falha ao reindexar o MediaStore.', 3000);
    } finally {
      setIsScanning(false);
    }
  };

  // Local File Scanner (real audio file import, persisted in IndexedDB)
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files: File[] = input.files ? Array.from(input.files) : [];
    // Reset input so the same file can be picked again
    input.value = '';
    if (files.length === 0) return;

    const existingIds = new Set(songs.map((s) => s.id));
    const imported: Song[] = [];
    let saveFailed = false;

    for (const file of files) {
      // Stable id: re-importing the same file doesn't create a duplicate
      const songId = `user_audio_${hashString(`${file.name}|${file.size}|${file.lastModified}`)}`;
      if (existingIds.has(songId)) continue;
      existingIds.add(songId);

      const metadata = resolveSongMetadata(undefined, undefined, undefined, file.name);
      const blobUrl = URL.createObjectURL(file);
      const probedDuration = await probeDuration(blobUrl);

      const song: Song = {
        id: songId,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        folder: '/Download/Audio',
        artworkUrl: generateAlbumArtwork(metadata.title, metadata.artist, metadata.album),
        duration: probedDuration || 180,
        url: blobUrl,
        fileName: file.name,
        format: detectAudioFormat(file.name),
        size: file.size,
        dateAdded: Date.now(),
        isFavorite: favoriteIds.includes(songId),
      };

      try {
        await saveUserTrack(song, file);
      } catch (err) {
        console.warn('Failed to persist imported track', err);
        saveFailed = true;
      }

      imported.push(song);
    }

    if (imported.length === 0) {
      showMessage('Essas músicas já estão na biblioteca');
      return;
    }

    setSongs((prev) => [...imported, ...prev]);
    showMessage(
      saveFailed
        ? `Importado(s) ${imported.length} arquivo(s), mas alguns não puderam ser salvos permanentemente`
        : `Importado(s) ${imported.length} arquivo(s) de áudio local`,
      3000
    );
  };

  // Playlist Management
  const handleCreatePlaylist = (name: string, initialSongIds: string[] = []) => {
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      createdAt: Date.now(),
      songIds: initialSongIds,
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    showMessage(`Playlist "${name}" criada com sucesso`);
  };

  const handleRenamePlaylist = (id: string, newName: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddSongToPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          if (p.songIds.includes(songId)) return p;
          return { ...p, songIds: [...p.songIds, songId] };
        }
        return p;
      })
    );
  };

  const handleRemoveSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return { ...p, songIds: p.songIds.filter((id) => id !== songId) };
        }
        return p;
      })
    );
  };

  const handleToggleSongInPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const exists = p.songIds.includes(songId);
          return {
            ...p,
            songIds: exists
              ? p.songIds.filter((id) => id !== songId)
              : [...p.songIds, songId],
          };
        }
        return p;
      })
    );
  };

  const handleReorderPlaylistSongs = (playlistId: string, newSongIds: string[]) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, songIds: newSongIds } : p))
    );
  };

  const handleOpenAddSongsModal = (playlist: Playlist) => {
    setSelectedPlaylistForAdd(playlist);
    setIsAddSongsModalOpen(true);
  };

  // Open contextual song action menu
  const handleOpenSongMenu = (song: Song) => {
    setSelectedSongForMenu(song);
    setIsSongActionMenuOpen(true);
  };

  latestRef.current = {
    queue,
    currentSong,
    isShuffle,
    repeatMode,
    volume,
    onTrackEnded: handleTrackEnded,
    skipNext,
    skipPrevious,
  };

  return (
    <div
      id="app-root"
      className="min-h-screen flex flex-col font-sans transition-colors antialiased select-none"
      style={{
        backgroundColor: currentTheme.surface,
        color: '#1C1B1F',
      }}
    >
      {/* Hidden file picker for local audio scanning */}
      <input
        ref={fileInputRef}
        type="file"
        id="hidden-audio-file-input"
        multiple
        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav,audio/*"
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Top App Bar */}
      <TopAppBar
        currentTheme={currentTheme}
        onCycleTheme={cycleTheme}
        onOpenPermissions={() => setIsPermissionModalOpen(true)}
        onOpenCode={() => setIsAndroidCodeModalOpen(true)}
        onAddFiles={() => fileInputRef.current?.click()}
        onOpenQueue={() => setIsQueueModalOpen(true)}
        queueCount={queue.length}
        permissionGranted={permissionGranted}
      />

      {/* MediaStore Scan / Notification Banner */}
      {scanMessage && (
        <div
          id="scan-notification-banner"
          className="py-1.5 px-4 text-xs text-center font-medium transition-all animate-in fade-in"
          style={{
            backgroundColor: currentTheme.primaryContainer,
            color: currentTheme.onPrimaryContainer,
          }}
        >
          {scanMessage}
        </div>
      )}

      {/* Main Single-Activity Screen View with Two Main Tabs: [Songs] & [Playlists] */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'songs' ? (
          <SongsTab
            songs={songs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            currentTheme={currentTheme}
            isScanning={isScanning}
            onPlaySong={playSong}
            onPlayQueue={playQueue}
            onRescan={handleRescan}
            onOpenAddFiles={() => fileInputRef.current?.click()}
            onOpenSongMenu={handleOpenSongMenu}
            onToggleFavorite={handleToggleFavorite}
            onLoadSamples={async () => {
              const added = await addSampleTracks();
              if (added > 0) showMessage(`${added} música(s) de exemplo carregada(s)`);
            }}
          />
        ) : (
          <PlaylistsTab
            playlists={playlists}
            allSongs={songs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            currentTheme={currentTheme}
            onCreatePlaylist={handleCreatePlaylist}
            onRenamePlaylist={handleRenamePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onAddSongToPlaylist={handleAddSongToPlaylist}
            onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
            onReorderPlaylistSongs={handleReorderPlaylistSongs}
            onPlaySong={playSong}
            onPlayQueue={playQueue}
            onOpenAddSongsModal={handleOpenAddSongsModal}
            onOpenSongMenu={handleOpenSongMenu}
          />
        )}
      </main>

      {/* Subtle Always-Visible 'Now Playing' Bar at the bottom */}
      <NowPlayingBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        progress={duration > 0 ? currentTime / duration : 0}
        currentTime={currentTime}
        currentTheme={currentTheme}
        onTogglePlay={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        onSkipNext={(e) => {
          e.stopPropagation();
          skipNext();
        }}
        onToggleFavorite={handleToggleFavorite}
        onOpenQueue={() => setIsQueueModalOpen(true)}
        onExpandPlayer={() => setIsFullScreenPlayerOpen(true)}
      />

      {/* Material 3 Bottom Navigation Bar with Two Main Tabs */}
      <NavigationBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentTheme={currentTheme}
        songsCount={songs.length}
        playlistsCount={playlists.length}
      />

      {/* Full-Screen Player View */}
      <FullScreenPlayer
        isOpen={isFullScreenPlayerOpen}
        onClose={() => setIsFullScreenPlayerOpen(false)}
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        volume={volume}
        currentTheme={currentTheme}
        onTogglePlay={togglePlay}
        onSkipNext={skipNext}
        onSkipPrevious={skipPrevious}
        onToggleShuffle={toggleShuffle}
        onCycleRepeat={cycleRepeat}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onOpenAddToPlaylist={setPlaylistPickerSong}
        onOpenQueue={() => setIsQueueModalOpen(true)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Queue Modal (Fila de Reprodução) */}
      <QueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        queue={queue}
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTheme={currentTheme}
        onPlaySong={playSong}
        onRemoveFromQueue={handleRemoveFromQueue}
        onMoveQueueItem={handleMoveQueueItem}
        onReorderQueue={handleReorderQueue}
        onClearQueue={handleClearQueue}
      />

      {/* Contextual Song Action Menu */}
      <SongActionMenu
        isOpen={isSongActionMenuOpen}
        onClose={() => {
          setIsSongActionMenuOpen(false);
          setSelectedSongForMenu(null);
        }}
        song={selectedSongForMenu}
        currentTheme={currentTheme}
        onPlayNow={playSong}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onAddToPlaylist={setPlaylistPickerSong}
        onToggleFavorite={handleToggleFavorite}
        onRemoveFromLibrary={handleRemoveFromLibrary}
      />

      {/* Add Songs to Playlist Modal */}
      <AddSongsModal
        isOpen={isAddSongsModalOpen}
        onClose={() => {
          setIsAddSongsModalOpen(false);
          setSelectedPlaylistForAdd(null);
        }}
        playlist={selectedPlaylistForAdd}
        allSongs={songs}
        currentTheme={currentTheme}
        onToggleSongInPlaylist={handleToggleSongInPlaylist}
      />

      {/* Choose which playlist(s) a song belongs to */}
      <PlaylistPickerModal
        song={playlistPickerSong}
        playlists={playlists}
        currentTheme={currentTheme}
        onClose={() => setPlaylistPickerSong(null)}
        onToggleSongInPlaylist={handleToggleSongInPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* Android Permissions Modal */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        permissionGranted={permissionGranted}
        onTogglePermission={() => setPermissionGranted((prev) => !prev)}
        currentTheme={currentTheme}
      />

      {/* Android Kotlin / Jetpack Compose Source Code Modal */}
      <AndroidCodeModal
        isOpen={isAndroidCodeModalOpen}
        onClose={() => setIsAndroidCodeModalOpen(false)}
        currentTheme={currentTheme}
      />
    </div>
  );
}
