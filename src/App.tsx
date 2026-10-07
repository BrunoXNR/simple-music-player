/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, Playlist, RepeatMode, M3ThemeColor, SavedPlayerState } from './types';
import { THEME_PALETTES } from './utils/theme';
import { getInitialLocalAudioFiles, resolveSongMetadata, generateAlbumArtwork } from './utils/audioGenerator';
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

const PLAYLISTS_STORAGE_KEY = 'minimalist_music_playlists_v1';
const THEME_STORAGE_KEY = 'minimalist_music_theme_v1';
const PERMISSION_STORAGE_KEY = 'minimalist_music_permission_granted';
const FAVORITES_STORAGE_KEY = 'minimalist_music_favorites_v1';
const PLAYER_STATE_KEY = 'minimalist_music_player_state_v1';

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
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved playlists', e);
    }
    return [
      {
        id: 'pl_chill',
        name: 'Acoustic & Ambient',
        createdAt: Date.now() - 172800000,
        songIds: [],
      },
    ];
  });

  // Playback & Queue State
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(PLAYER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.volume === 'number') return parsed.volume;
      }
    } catch {
      // ignore
    }
    return 0.85;
  });
  const [isShuffle, setIsShuffle] = useState(() => {
    try {
      const saved = localStorage.getItem(PLAYER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.isShuffle === 'boolean') return parsed.isShuffle;
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem(PLAYER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.repeatMode) return parsed.repeatMode;
      }
    } catch {
      // ignore
    }
    return 'off';
  });

  // Track if initial state was restored
  const stateRestoredRef = useRef(false);

  // Hidden File Input Ref for MediaStore file selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

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

  // Persist Player State across sessions
  useEffect(() => {
    try {
      const stateToSave: SavedPlayerState = {
        currentSongId: currentSong?.id || null,
        currentTime,
        queueIds: queue.map((s) => s.id),
        isShuffle,
        repeatMode,
        volume,
      };
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('LocalStorage player state save error', err);
    }
  }, [currentSong?.id, currentTime, queue, isShuffle, repeatMode, volume]);

  // Load initial local audio files on mount
  useEffect(() => {
    let mounted = true;
    async function loadInitialSongs() {
      setIsScanning(true);
      const initial = await getInitialLocalAudioFiles();
      if (!mounted) return;

      // Apply saved favorite tags
      const withFavs = initial.map((s) => ({
        ...s,
        isFavorite: favoriteIds.includes(s.id),
      }));

      setSongs(withFavs);
      setIsScanning(false);

      // Restore saved player state if available
      try {
        const savedStateStr = localStorage.getItem(PLAYER_STATE_KEY);
        if (savedStateStr && !stateRestoredRef.current) {
          stateRestoredRef.current = true;
          const parsed: SavedPlayerState = JSON.parse(savedStateStr);

          // Restore queue
          if (parsed.queueIds && parsed.queueIds.length > 0) {
            const restoredQueue: Song[] = [];
            parsed.queueIds.forEach((id) => {
              const matched = withFavs.find((s) => s.id === id);
              if (matched) restoredQueue.push(matched);
            });
            if (restoredQueue.length > 0) {
              setQueue(restoredQueue);
            } else {
              setQueue(withFavs);
            }
          } else {
            setQueue(withFavs);
          }

          // Restore current song and playback position
          if (parsed.currentSongId) {
            const matchedSong = withFavs.find((s) => s.id === parsed.currentSongId);
            if (matchedSong) {
              setCurrentSong(matchedSong);
              if (parsed.currentTime > 0) {
                setCurrentTime(parsed.currentTime);
              }
            } else if (withFavs.length > 0) {
              setCurrentSong(withFavs[0]);
            }
          } else if (withFavs.length > 0) {
            setCurrentSong(withFavs[0]);
          }
        } else {
          setQueue(withFavs);
          if (withFavs.length > 0 && !currentSong) {
            setCurrentSong(withFavs[0]);
          }
        }
      } catch (err) {
        console.warn('Error restoring player state', err);
        setQueue(withFavs);
        if (withFavs.length > 0 && !currentSong) {
          setCurrentSong(withFavs[0]);
        }
      }

      // Pre-populate demo playlists with first few tracks if they were empty
      setPlaylists((prev) => {
        if (prev.length >= 1 && prev[0].songIds.length === 0 && withFavs.length >= 2) {
          return [
            { ...prev[0], songIds: [withFavs[0].id, withFavs[1].id] },
          ];
        }
        return prev;
      });
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
    audio.volume = volume;
    audioElementRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      handleTrackEnded();
    };

    const onError = (e: Event) => {
      console.warn('Audio playback error / file unavailable', e);
      setIsPlaying(false);

      // Flag current song as unavailable
      if (currentSong) {
        setSongs((prev) =>
          prev.map((s) => (s.id === currentSong.id ? { ...s, unavailable: true } : s))
        );
        setQueue((prev) =>
          prev.map((s) => (s.id === currentSong.id ? { ...s, unavailable: true } : s))
        );
      }

      setScanMessage('Música indisponível ou arquivo movido.');
      setTimeout(() => setScanMessage(null), 4000);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Handle Playback Change
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (currentSong && audio.src !== currentSong.url) {
      audio.src = currentSong.url;
      audio.load();
      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Autoplay prevented', err);
          setIsPlaying(false);
        });
      }
    } else if (currentSong) {
      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Playback resume error', err);
          setIsPlaying(false);
        });
      } else {
        audio.pause();
      }
    }
  }, [currentSong, isPlaying]);

  // Volume Sync
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume;
    }
  }, [volume]);

  // Android MediaSessionService API integration (Background playback & notification controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
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

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        skipPrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        skipNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioElementRef.current) {
          audioElementRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        if (audioElementRef.current) {
          audioElementRef.current.currentTime = Math.min(
            duration,
            audioElementRef.current.currentTime + offset
          );
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        if (audioElementRef.current) {
          audioElementRef.current.currentTime = Math.max(
            0,
            audioElementRef.current.currentTime - offset
          );
        }
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        setIsPlaying(false);
      });
    }
  }, [currentSong, duration]);

  // Track Ended Handler
  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one' && audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Skip to next in queue
    skipNext();
  }, [repeatMode, queue, currentSong, isShuffle]);

  // Helper to ensure each queue item has a stable unique instance key for drag & drop
  const createQueueItem = (song: Song): Song => ({
    ...song,
    queueInstanceId:
      song.queueInstanceId ||
      `${song.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  });

  // Play Song immediately
  const playSong = (song: Song) => {
    const item = createQueueItem(song);
    setCurrentSong(item);
    setIsPlaying(true);
    // Ensure current song is in queue
    if (!queue.some((s) => s.id === song.id)) {
      setQueue((prev) => [item, ...prev]);
    }
  };

  // Play a full custom queue (e.g. from playlist or artist/album Play All)
  const playQueue = (songsToPlay: Song[]) => {
    if (songsToPlay.length === 0) return;
    const items = songsToPlay.map((s) => createQueueItem(s));
    setQueue(items);
    setCurrentSong(items[0]);
    setIsPlaying(true);
  };

  // Queue Operations: Add to queue
  const handleAddToQueue = (song: Song) => {
    const item = createQueueItem(song);
    setQueue((prev) => {
      // If queue is empty, set as current song too
      if (prev.length === 0) {
        setCurrentSong(item);
        setIsPlaying(true);
        return [item];
      }
      return [...prev, item];
    });
    setScanMessage(`"${song.title}" adicionada à fila`);
    setTimeout(() => setScanMessage(null), 2500);
  };

  // Queue Operations: Play next (insert immediately after current song)
  const handlePlayNext = (song: Song) => {
    const item = createQueueItem(song);
    setQueue((prev) => {
      if (prev.length === 0 || !currentSong) {
        setCurrentSong(item);
        setIsPlaying(true);
        return [item];
      }
      const currentIndex = prev.findIndex((s) => s.id === currentSong.id);
      if (currentIndex === -1) {
        return [currentSong, item, ...prev];
      }
      const updated = [...prev];
      updated.splice(currentIndex + 1, 0, item);
      return updated;
    });
    setScanMessage(`"${song.title}" tocará a seguir`);
    setTimeout(() => setScanMessage(null), 2500);
  };

  // Queue Operations: Remove from queue
  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      // If removed song was current playing, skip to next or stop
      if (removed?.id === currentSong?.id) {
        if (updated.length > 0) {
          const nextIndex = Math.min(index, updated.length - 1);
          setCurrentSong(updated[nextIndex]);
        } else {
          setCurrentSong(null);
          setIsPlaying(false);
        }
      }
      return updated;
    });
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
    setScanMessage('Fila de reprodução limpa');
    setTimeout(() => setScanMessage(null), 2000);
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

    setScanMessage(
      isNowFav
        ? `"${song.title}" adicionada aos Favoritos`
        : `"${song.title}" removida dos Favoritos`
    );
    setTimeout(() => setScanMessage(null), 2500);
  };

  // Remove song completely from library (handles moved/deleted tracks)
  const handleRemoveFromLibrary = (songId: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setQueue((prev) => prev.filter((s) => s.id !== songId));
    setFavoriteIds((prev) => prev.filter((id) => id !== songId));

    // Remove from all playlists
    setPlaylists((prev) =>
      prev.map((p) => ({
        ...p,
        songIds: p.songIds.filter((id) => id !== songId),
      }))
    );

    if (currentSong?.id === songId) {
      skipNext();
    }

    setScanMessage('Música removida da biblioteca local');
    setTimeout(() => setScanMessage(null), 2500);
  };

  // Skip Next
  const skipNext = () => {
    const currentList = queue.length > 0 ? queue : songs;
    if (currentList.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * currentList.length);
      setCurrentSong(currentList[randomIndex]);
      setIsPlaying(true);
      return;
    }

    const currentIndex = currentList.findIndex((s) => s.id === currentSong?.id);
    if (currentIndex === -1) {
      setCurrentSong(currentList[0]);
    } else if (currentIndex < currentList.length - 1) {
      setCurrentSong(currentList[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      setCurrentSong(currentList[0]);
    } else {
      setIsPlaying(false);
    }
  };

  // Skip Previous
  const skipPrevious = () => {
    // If more than 3 seconds in, restart track
    if (audioElementRef.current && audioElementRef.current.currentTime > 3) {
      audioElementRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currentList = queue.length > 0 ? queue : songs;
    if (currentList.length === 0) return;

    const currentIndex = currentList.findIndex((s) => s.id === currentSong?.id);
    if (currentIndex > 0) {
      setCurrentSong(currentList[currentIndex - 1]);
    } else {
      setCurrentSong(currentList[currentList.length - 1]);
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
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setCurrentTime(time);
    }
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

  // Device MediaStore Rescan Simulation
  const handleRescan = async () => {
    if (!permissionGranted) {
      setIsPermissionModalOpen(true);
      return;
    }

    setIsScanning(true);
    setScanMessage('Reindexando MediaStore e buscando novos arquivos de áudio...');

    try {
      // Simulate real background MediaStore scan query
      const scanned = await getInitialLocalAudioFiles();

      setSongs((prevExisting) => {
        const existingMap = new Map<string, Song>();
        prevExisting.forEach((s) => existingMap.set(s.id, s));

        // Preserve favorites
        scanned.forEach((s) => {
          if (!existingMap.has(s.id)) {
            existingMap.set(s.id, {
              ...s,
              isFavorite: favoriteIds.includes(s.id),
            });
          }
        });

        return Array.from(existingMap.values());
      });

      setScanMessage('Biblioteca atualizada com sucesso!');
    } catch (err) {
      console.warn('Rescan error', err);
      setScanMessage('Falha ao reindexar o MediaStore.');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanMessage(null), 3000);
    }
  };

  // Local File Scanner (Real .mp3 and .wav file upload)
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSongs: Song[] = [];
    Array.from(files).forEach((file: File) => {
      const isMp3 = file.name.endsWith('.mp3') || file.type === 'audio/mpeg';
      const isWav = file.name.endsWith('.wav') || file.type === 'audio/wav' || file.type === 'audio/x-wav';

      const metadata = resolveSongMetadata(undefined, undefined, undefined, file.name);
      const artworkUrl = generateAlbumArtwork(metadata.title, metadata.artist, metadata.album);

      const blobUrl = URL.createObjectURL(file);
      const songId = `user_audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const song: Song = {
        id: songId,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        folder: '/Download/Audio',
        artworkUrl,
        duration: 180, // Updated when loaded
        url: blobUrl,
        fileName: file.name,
        format: isWav ? 'wav' : isMp3 ? 'mp3' : 'mp3',
        size: file.size,
        dateAdded: Date.now(),
        isFavorite: false,
      };

      // Probe actual duration
      const probeAudio = new Audio();
      probeAudio.src = blobUrl;
      probeAudio.onloadedmetadata = () => {
        if (!isNaN(probeAudio.duration) && probeAudio.duration > 0) {
          setSongs((prevSongs) =>
            prevSongs.map((s) =>
              s.id === songId ? { ...s, duration: Math.round(probeAudio.duration) } : s
            )
          );
        }
      };

      newSongs.push(song);
    });

    setSongs((prev) => [...newSongs, ...prev]);
    setScanMessage(`Importado(s) ${newSongs.length} arquivo(s) de áudio local`);
    setTimeout(() => setScanMessage(null), 3000);

    // Reset input
    if (e.target) e.target.value = '';
  };

  // Playlist Management
  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      createdAt: Date.now(),
      songIds: [],
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    setScanMessage(`Playlist "${name}" criada com sucesso`);
    setTimeout(() => setScanMessage(null), 2500);
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
              const fresh = await getInitialLocalAudioFiles();
              setSongs(fresh);
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
        onToggleShuffle={() => setIsShuffle((prev) => !prev)}
        onCycleRepeat={cycleRepeat}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onOpenAddToPlaylist={(song) => {
          if (playlists.length > 0) {
            handleOpenAddSongsModal(playlists[0]);
          } else {
            handleCreatePlaylist('Minha Playlist');
          }
        }}
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
        onAddToPlaylist={(song) => {
          if (playlists.length > 0) {
            handleOpenAddSongsModal(playlists[0]);
          } else {
            handleCreatePlaylist('Minha Playlist');
          }
        }}
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
