import React, { useState } from 'react';
import { X, Check, Plus, ListMusic } from 'lucide-react';
import { Song, Playlist, M3ThemePalette } from '../types';

interface PlaylistPickerModalProps {
  song: Song | null;
  playlists: Playlist[];
  currentTheme: M3ThemePalette;
  onClose: () => void;
  onToggleSongInPlaylist: (playlistId: string, songId: string) => void;
  onCreatePlaylist: (name: string, initialSongIds: string[]) => void;
}

export const PlaylistPickerModal: React.FC<PlaylistPickerModalProps> = ({
  song,
  playlists,
  currentTheme,
  onClose,
  onToggleSongInPlaylist,
  onCreatePlaylist,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!song) return null;

  const handleClose = () => {
    setIsCreating(false);
    setNewPlaylistName('');
    onClose();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    onCreatePlaylist(name, [song.id]);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <div
      id="playlist-picker-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        id="playlist-picker-card"
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 duration-200"
        style={{ borderColor: `${currentTheme.outline}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="min-w-0 pr-2">
            <h3 className="text-base font-bold text-neutral-900">Adicionar à playlist</h3>
            <p className="text-xs text-neutral-500 truncate">{song.title}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playlists */}
        <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-1">
          {playlists.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-400">
              Nenhuma playlist ainda. Crie a primeira abaixo.
            </p>
          ) : (
            playlists.map((playlist) => {
              const isIncluded = playlist.songIds.includes(song.id);
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => onToggleSongInPlaylist(playlist.id, song.id)}
                  className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: currentTheme.secondaryContainer,
                        color: currentTheme.primary,
                      }}
                    >
                      <ListMusic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {playlist.name}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {playlist.songIds.length}{' '}
                        {playlist.songIds.length === 1 ? 'música' : 'músicas'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                      isIncluded ? 'text-white border-transparent' : 'border-neutral-300'
                    }`}
                    style={{
                      backgroundColor: isIncluded ? currentTheme.primary : 'transparent',
                    }}
                  >
                    {isIncluded && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Create new playlist */}
        <div className="pt-3 border-t border-neutral-100">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome da playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2"
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 shadow-xs"
                style={{ backgroundColor: currentTheme.primary }}
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewPlaylistName('');
                }}
                className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold hover:bg-neutral-50"
                style={{ color: currentTheme.primary }}
              >
                <Plus className="w-4 h-4" />
                <span>Nova playlist</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95"
                style={{ backgroundColor: currentTheme.primary }}
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
