import React, { useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListPlus,
  ListMusic,
  Heart,
  Music,
  Folder,
  Disc3,
} from 'lucide-react';
import { Song, RepeatMode, M3ThemePalette } from '../types';
import { formatDuration } from '../utils/exportHelper';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  currentTheme: M3ThemePalette;
  onTogglePlay: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (val: number) => void;
  onOpenAddToPlaylist: (song: Song) => void;
  onOpenQueue: () => void;
  onToggleFavorite: (song: Song) => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  volume,
  currentTheme,
  onTogglePlay,
  onSkipNext,
  onSkipPrevious,
  onToggleShuffle,
  onCycleRepeat,
  onSeek,
  onVolumeChange,
  onOpenAddToPlaylist,
  onOpenQueue,
  onToggleFavorite,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !currentSong) return null;

  const songDuration = duration || currentSong.duration || 1;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / songDuration) * 100));

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * songDuration);
  };

  return (
    <div
      id="fullscreen-player-modal"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto transition-all select-none animate-in fade-in slide-in-from-bottom-6 duration-200"
      style={{
        backgroundColor: currentTheme.surface,
      }}
    >
      {/* Top Header: Collapse button & context */}
      <div className="max-w-md w-full mx-auto px-6 pt-6 pb-2 flex items-center justify-between">
        <button
          id="btn-close-fullscreen-player"
          onClick={onClose}
          aria-label="Collapse player"
          className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform"
          style={{ color: currentTheme.primary }}
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
            Tocando Agora
          </p>
          <p className="text-xs font-semibold text-neutral-800 truncate max-w-[180px]">
            {currentSong.album || 'Armazenamento Local'}
          </p>
        </div>

        <div className="flex items-center gap-1 -mr-2">
          {/* Open Queue shortcut */}
          <button
            id="btn-player-open-queue"
            onClick={onOpenQueue}
            aria-label="Ver Fila"
            title="Fila de reprodução"
            className="p-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform text-neutral-700"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          {/* Add to playlist */}
          <button
            id="btn-player-add-to-playlist"
            onClick={() => onOpenAddToPlaylist(currentSong)}
            aria-label="Add to Playlist"
            title="Adicionar à playlist"
            className="p-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform text-neutral-700"
          >
            <ListPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center: Minimalist Artwork & Typography */}
      <div className="max-w-md w-full mx-auto px-8 flex-1 flex flex-col justify-center items-center py-4">
        {/* Minimalist Vinyl/Cover Art container */}
        <div
          className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl flex flex-col items-center justify-center p-4 shadow-xl border relative transition-all overflow-hidden"
          style={{
            backgroundColor: currentTheme.surfaceVariant,
            borderColor: `${currentTheme.outline}20`,
          }}
        >
          {currentSong.artworkUrl ? (
            <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <img
                src={currentSong.artworkUrl}
                alt={currentSong.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
              {/* Subtle vinyl center spindle hole */}
              <div className="absolute w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center backdrop-blur-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentTheme.primary }}
                />
              </div>
            </div>
          ) : (
            /* Fallback vinyl disc */
            <div
              className={`w-40 h-40 sm:w-44 sm:h-44 rounded-full border-2 flex items-center justify-center relative transition-transform ${
                isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''
              }`}
              style={{
                borderColor: `${currentTheme.outline}40`,
                backgroundColor: currentTheme.surface,
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-inner"
                style={{
                  backgroundColor: currentTheme.primaryContainer,
                  color: currentTheme.onPrimaryContainer,
                }}
              >
                <Music className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Minimal format badge */}
          <span
            className="absolute bottom-3 right-3 text-[10px] uppercase font-mono px-2 py-0.5 rounded-md font-semibold tracking-wider shadow-xs backdrop-blur-xs"
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#FFFFFF',
            }}
          >
            {currentSong.format}
          </span>
        </div>

        {/* Title, Artist, & Favorite with generous spacing */}
        <div className="w-full text-center mt-6 px-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 truncate">
              {currentSong.title}
            </h2>
            <button
              onClick={() => onToggleFavorite(currentSong)}
              title={
                currentSong.isFavorite
                  ? 'Remover dos favoritos'
                  : 'Marcar como favorito'
              }
              className={`p-1 rounded-full transition-transform active:scale-90 ${
                currentSong.isFavorite
                  ? 'text-red-500'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${
                  currentSong.isFavorite ? 'fill-current' : ''
                }`}
              />
            </button>
          </div>

          <p className="text-sm text-neutral-600 font-medium truncate mt-1">
            {currentSong.artist}
          </p>

          <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Disc3 className="w-3 h-3" /> {currentSong.album}
            </span>
            {currentSong.folder && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <Folder className="w-3 h-3" /> {currentSong.folder}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="max-w-md w-full mx-auto px-6 pb-8 pt-2">
        {/* Seek Bar */}
        <div className="mb-4">
          <div
            ref={progressBarRef}
            id="player-seek-bar"
            onClick={handleProgressBarClick}
            className="h-3 w-full flex items-center cursor-pointer group py-1"
          >
            <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden relative">
              <div
                className="h-full transition-[width] duration-150 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: currentTheme.primary,
                }}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex justify-between text-xs font-mono text-neutral-500 mt-1 select-none">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(songDuration)}</span>
          </div>
        </div>

        {/* Core playback controls */}
        <div className="flex items-center justify-between mt-2 px-2">
          {/* Shuffle */}
          <button
            id="btn-player-shuffle"
            onClick={onToggleShuffle}
            title={isShuffle ? 'Modo aleatório ativado' : 'Modo aleatório desativado'}
            className="p-3 rounded-full transition-colors active:scale-90"
            style={{
              color: isShuffle ? currentTheme.primary : currentTheme.outline,
              backgroundColor: isShuffle
                ? `${currentTheme.primary}18`
                : 'transparent',
            }}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Skip Previous */}
          <button
            id="btn-player-prev"
            onClick={onSkipPrevious}
            title="Música anterior"
            className="p-3 rounded-full text-neutral-800 hover:bg-black/5 active:scale-90 transition-transform"
          >
            <SkipBack className="w-6 h-6 fill-neutral-800" />
          </button>

          {/* Play / Pause - Large Filled Tonal Button */}
          <button
            id="btn-player-toggle-play"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
            style={{
              backgroundColor: currentTheme.primary,
              color: '#FFFFFF',
            }}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Skip Next */}
          <button
            id="btn-player-next"
            onClick={onSkipNext}
            title="Próxima música"
            className="p-3 rounded-full text-neutral-800 hover:bg-black/5 active:scale-90 transition-transform"
          >
            <SkipForward className="w-6 h-6 fill-neutral-800" />
          </button>

          {/* Repeat */}
          <button
            id="btn-player-repeat"
            onClick={onCycleRepeat}
            title={`Modo repetição: ${repeatMode}`}
            className="p-3 rounded-full transition-colors active:scale-90"
            style={{
              color:
                repeatMode !== 'off'
                  ? currentTheme.primary
                  : currentTheme.outline,
              backgroundColor:
                repeatMode !== 'off'
                  ? `${currentTheme.primary}18`
                  : 'transparent',
            }}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="mt-6 flex items-center gap-3 px-3">
          <button
            type="button"
            onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
            className="text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            id="player-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-current"
            style={{ color: currentTheme.primary }}
          />
        </div>
      </div>
    </div>
  );
};
