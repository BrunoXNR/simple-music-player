import React from 'react';
import { Music2, ListMusic } from 'lucide-react';
import { M3ThemePalette } from '../types';

export type MainTab = 'songs' | 'playlists';

interface NavigationBarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  currentTheme: M3ThemePalette;
  songsCount: number;
  playlistsCount: number;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onSelectTab,
  currentTheme,
  songsCount,
  playlistsCount,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Bottom navigation bar"
      className="fixed bottom-0 left-0 right-0 z-20 border-t transition-colors select-none"
      style={{
        backgroundColor: currentTheme.surface,
        borderColor: `${currentTheme.outline}25`,
      }}
    >
      <div className="max-w-md mx-auto grid grid-cols-2 h-16 px-4">
        {/* Songs Tab */}
        <button
          id="nav-tab-songs"
          type="button"
          onClick={() => onSelectTab('songs')}
          className="flex flex-col items-center justify-center gap-1 group relative transition-transform active:scale-95"
        >
          <div
            className={`px-5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
              activeTab === 'songs' ? 'shadow-xs' : 'bg-transparent'
            }`}
            style={{
              backgroundColor:
                activeTab === 'songs'
                  ? currentTheme.secondaryContainer
                  : 'transparent',
            }}
          >
            <Music2
              className="w-5 h-5 transition-colors"
              style={{
                color:
                  activeTab === 'songs'
                    ? currentTheme.primary
                    : currentTheme.outline,
              }}
            />
          </div>
          <span
            className="text-xs tracking-wide transition-colors font-medium flex items-center gap-1"
            style={{
              color:
                activeTab === 'songs'
                  ? currentTheme.onPrimaryContainer
                  : currentTheme.outline,
              fontWeight: activeTab === 'songs' ? 600 : 500,
            }}
          >
            Songs
            <span className="text-[10px] opacity-75">({songsCount})</span>
          </span>
        </button>

        {/* Playlists Tab */}
        <button
          id="nav-tab-playlists"
          type="button"
          onClick={() => onSelectTab('playlists')}
          className="flex flex-col items-center justify-center gap-1 group relative transition-transform active:scale-95"
        >
          <div
            className={`px-5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
              activeTab === 'playlists' ? 'shadow-xs' : 'bg-transparent'
            }`}
            style={{
              backgroundColor:
                activeTab === 'playlists'
                  ? currentTheme.secondaryContainer
                  : 'transparent',
            }}
          >
            <ListMusic
              className="w-5 h-5 transition-colors"
              style={{
                color:
                  activeTab === 'playlists'
                    ? currentTheme.primary
                    : currentTheme.outline,
              }}
            />
          </div>
          <span
            className="text-xs tracking-wide transition-colors font-medium flex items-center gap-1"
            style={{
              color:
                activeTab === 'playlists'
                  ? currentTheme.onPrimaryContainer
                  : currentTheme.outline,
              fontWeight: activeTab === 'playlists' ? 600 : 500,
            }}
          >
            Playlists
            <span className="text-[10px] opacity-75">({playlistsCount})</span>
          </span>
        </button>
      </div>
    </nav>
  );
};
