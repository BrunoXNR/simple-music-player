import React, { useState } from 'react';
import { X, Search, Check, Music } from 'lucide-react';
import { Song, Playlist, M3ThemePalette } from '../types';
import { formatDuration } from '../utils/exportHelper';

interface AddSongsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  allSongs: Song[];
  currentTheme: M3ThemePalette;
  onToggleSongInPlaylist: (playlistId: string, songId: string) => void;
}

export const AddSongsModal: React.FC<AddSongsModalProps> = ({
  isOpen,
  onClose,
  playlist,
  allSongs,
  currentTheme,
  onToggleSongInPlaylist,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen || !playlist) return null;

  const currentSongIds = new Set(playlist.songIds);

  const filteredSongs = allSongs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      id="add-songs-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="add-songs-modal-card"
        className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[85vh]"
        style={{ borderColor: `${currentTheme.outline}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Adicionar Músicas à Playlist
            </h3>
            <p className="text-xs text-neutral-500 truncate max-w-[240px]">
              {playlist.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="py-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por título ou artista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent focus:outline-hidden text-neutral-800"
            />
          </div>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 pr-1">
          {filteredSongs.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Nenhuma música encontrada.
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isIncluded = currentSongIds.has(song.id);
              return (
                <div
                  key={song.id}
                  onClick={() => onToggleSongInPlaylist(playlist.id, song.id)}
                  className={`py-2 px-1.5 flex items-center justify-between cursor-pointer rounded-xl transition-all group ${
                    isIncluded ? 'bg-neutral-50/80 hover:bg-neutral-100/80' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative"
                      style={{
                        backgroundColor: currentTheme.secondaryContainer,
                        color: currentTheme.primary,
                      }}
                    >
                      {song.artworkUrl ? (
                        <img
                          src={song.artworkUrl}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs truncate ${
                          isIncluded ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'
                        }`}
                      >
                        {song.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[11px] font-mono text-neutral-400">
                      {formatDuration(song.duration)}
                    </span>
                    <button
                      type="button"
                      aria-label={isIncluded ? 'Música selecionada na playlist' : 'Música não selecionada'}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 ${
                        isIncluded
                          ? 'scale-105 shadow-sm text-white border-transparent'
                          : 'border-neutral-300 text-transparent hover:border-neutral-400 group-hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: isIncluded
                          ? currentTheme.primary
                          : 'transparent',
                        borderColor: isIncluded ? undefined : undefined,
                      }}
                    >
                      {isIncluded ? (
                        <Check className="w-3.5 h-3.5 stroke-[2.5] text-white animate-in zoom-in-50 duration-150" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-neutral-200 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">
            {playlist.songIds.length} {playlist.songIds.length === 1 ? 'música na playlist' : 'músicas na playlist'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs transition-transform active:scale-95"
            style={{ backgroundColor: currentTheme.primary }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
