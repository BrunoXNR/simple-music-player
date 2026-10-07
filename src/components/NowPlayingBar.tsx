import React from 'react';
import { Play, Pause, SkipForward, Music, Heart, ListMusic } from 'lucide-react';
import { Song, M3ThemePalette } from '../types';

interface NowPlayingBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number; // 0 to 1
  currentTime: number;
  currentTheme: M3ThemePalette;
  onTogglePlay: (e: React.MouseEvent) => void;
  onSkipNext: (e: React.MouseEvent) => void;
  onToggleFavorite: (song: Song) => void;
  onOpenQueue: () => void;
  onExpandPlayer: () => void;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({
  currentSong,
  isPlaying,
  progress,
  currentTheme,
  onTogglePlay,
  onSkipNext,
  onToggleFavorite,
  onOpenQueue,
  onExpandPlayer,
}) => {
  if (!currentSong) return null;

  return (
    <div
      id="now-playing-bar"
      className="fixed bottom-16 left-0 right-0 z-20 transition-all select-none"
    >
      <div className="max-w-md mx-auto px-2">
        <div
          onClick={onExpandPlayer}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onExpandPlayer();
            }
          }}
          className="group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer shadow-md border transition-all active:scale-[0.99] overflow-hidden"
          style={{
            backgroundColor: currentTheme.surfaceVariant,
            borderColor: `${currentTheme.outline}30`,
          }}
        >
          {/* Subtle top progress indicator line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 bg-black/10"
            aria-hidden="true"
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                backgroundColor: currentTheme.primary,
              }}
            />
          </div>

          {/* Song info & art */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden"
              style={{
                backgroundColor: currentTheme.primaryContainer,
                color: currentTheme.onPrimaryContainer,
              }}
            >
              {currentSong.artworkUrl ? (
                <img
                  src={currentSong.artworkUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate text-neutral-900 leading-tight">
                  {currentSong.title}
                </span>
                <span
                  className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium shrink-0"
                  style={{
                    backgroundColor: `${currentTheme.primary}18`,
                    color: currentTheme.primary,
                  }}
                >
                  {currentSong.format}
                </span>
              </div>
              <p className="text-xs text-neutral-600 truncate mt-0.5">
                {currentSong.artist} • {currentSong.album}
              </p>
            </div>
          </div>

          {/* Quick controls */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Favorite */}
            <button
              id="btn-bar-toggle-favorite"
              type="button"
              onClick={() => onToggleFavorite(currentSong)}
              aria-label={currentSong.isFavorite ? 'Remover favorito' : 'Favoritar'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
                currentSong.isFavorite
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-black/5'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  currentSong.isFavorite ? 'fill-current' : ''
                }`}
              />
            </button>

            {/* Quick Queue */}
            <button
              id="btn-bar-open-queue"
              type="button"
              onClick={onOpenQueue}
              aria-label="Ver fila"
              title="Fila de reprodução"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-neutral-600 hover:text-black hover:bg-black/5 active:scale-90"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              id="btn-bar-toggle-play"
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
              style={{
                backgroundColor: currentTheme.primary,
                color: '#FFFFFF',
              }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip Next */}
            <button
              id="btn-bar-skip-next"
              type="button"
              onClick={onSkipNext}
              aria-label="Next track"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors text-neutral-700 hover:bg-black/5 active:scale-90"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
