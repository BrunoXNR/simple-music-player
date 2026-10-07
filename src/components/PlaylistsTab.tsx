import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  ArrowLeft,
  Play,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  ListPlus,
  Music,
  Check,
  X,
  FileText,
  Heart,
  Sparkles,
  MoreVertical,
  GripVertical,
} from 'lucide-react';
import { Playlist, Song, SortField, SortDirection, M3ThemePalette } from '../types';
import { formatDuration, exportPlaylistToFile } from '../utils/exportHelper';
import { ConfirmationModal } from './ConfirmationModal';

interface PlaylistsTabProps {
  playlists: Playlist[];
  allSongs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTheme: M3ThemePalette;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (id: string, newName: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddSongToPlaylist: (playlistId: string, songId: string) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  onReorderPlaylistSongs: (playlistId: string, newSongIds: string[]) => void;
  onPlaySong: (song: Song) => void;
  onPlayQueue: (songs: Song[]) => void;
  onOpenAddSongsModal: (playlist: Playlist) => void;
  onOpenSongMenu?: (song: Song) => void;
}

export const PlaylistsTab: React.FC<PlaylistsTabProps> = ({
  playlists,
  allSongs,
  currentSong,
  isPlaying,
  currentTheme,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onRemoveSongFromPlaylist,
  onReorderPlaylistSongs,
  onPlaySong,
  onPlayQueue,
  onOpenAddSongsModal,
  onOpenSongMenu,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // Sort state for current playlist
  const [sortField, setSortField] = useState<SortField>('custom');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isManualReorderMode, setIsManualReorderMode] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'csv'>('txt');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Delete Confirmation state
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null);

  // Drag and drop state for songs in playlist
  const [draggedSongIndex, setDraggedSongIndex] = useState<number | null>(null);
  const [dragOverSongIndex, setDragOverSongIndex] = useState<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

  const isFavoritesCollection = selectedPlaylistId === 'special_favorites';

  const selectedPlaylist = useMemo(() => {
    if (isFavoritesCollection) {
      const favSongs = allSongs.filter((s) => s.isFavorite);
      return {
        id: 'special_favorites',
        name: 'Favoritos',
        createdAt: Date.now(),
        songIds: favSongs.map((s) => s.id),
      };
    }
    return playlists.find((p) => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId, isFavoritesCollection, allSongs]);

  // Resolve songs in current playlist
  const playlistSongs = useMemo(() => {
    if (!selectedPlaylist) return [];

    let resolved: Song[] = [];
    if (isFavoritesCollection) {
      resolved = allSongs.filter((s) => s.isFavorite);
    } else {
      const songMap = new Map<string, Song>();
      allSongs.forEach((s) => songMap.set(s.id, s));
      selectedPlaylist.songIds.forEach((id) => {
        const s = songMap.get(id);
        if (s) resolved.push(s);
      });
    }

    // Apply sorting if not in custom manual order
    if (sortField === 'custom') {
      return resolved;
    }

    const sorted = [...resolved];
    sorted.sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') comp = a.title.localeCompare(b.title);
      if (sortField === 'artist') comp = a.artist.localeCompare(b.artist);
      if (sortField === 'duration') comp = a.duration - b.duration;
      return sortDirection === 'asc' ? comp : -comp;
    });
    return sorted;
  }, [selectedPlaylist, allSongs, sortField, sortDirection, isFavoritesCollection]);

  // Playlist stats
  const totalDuration = useMemo(() => {
    return playlistSongs.reduce((acc, curr) => acc + curr.duration, 0);
  }, [playlistSongs]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingNew(false);
    }
  };

  const handleRenameSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editedName.trim()) {
      onRenamePlaylist(id, editedName.trim());
      setEditingPlaylistId(null);
    }
  };

  // Reorder songs manually
  const moveSong = (index: number, direction: 'up' | 'down') => {
    if (!selectedPlaylist || isFavoritesCollection) return;
    const currentIds = [...selectedPlaylist.songIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const [movedId] = currentIds.splice(index, 1);
    currentIds.splice(targetIndex, 0, movedId);
    setSortField('custom');
    onReorderPlaylistSongs(selectedPlaylist.id, currentIds);
  };

  // Reorder songs by arbitrary index (drag and drop)
  const reorderSongToIndex = (fromIndex: number, toIndex: number) => {
    if (!selectedPlaylist || isFavoritesCollection) return;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const currentIds = [...selectedPlaylist.songIds];
    if (fromIndex >= currentIds.length || toIndex >= currentIds.length) return;

    const [movedId] = currentIds.splice(fromIndex, 1);
    currentIds.splice(toIndex, 0, movedId);
    setSortField('custom');
    onReorderPlaylistSongs(selectedPlaylist.id, currentIds);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isFavoritesCollection) return;
    setDraggedSongIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isFavoritesCollection) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSongIndex !== index) {
      setDragOverSongIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (isFavoritesCollection) return;
    e.preventDefault();
    if (draggedSongIndex !== null && draggedSongIndex !== targetIndex) {
      reorderSongToIndex(draggedSongIndex, targetIndex);
    }
    setDraggedSongIndex(null);
    setDragOverSongIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSongIndex(null);
    setDragOverSongIndex(null);
  };

  // Mobile Touch handlers for dragging inside playlist
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (isFavoritesCollection) return;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartIndexRef.current = index;
    setDraggedSongIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || touchStartIndexRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    const threshold = 48; // row height in pixels

    if (Math.abs(diff) > threshold) {
      const steps = Math.round(diff / threshold);
      const newTarget = Math.max(
        0,
        Math.min(playlistSongs.length - 1, touchStartIndexRef.current + steps)
      );
      if (newTarget !== dragOverSongIndex) {
        setDragOverSongIndex(newTarget);
      }
    }
  };

  const handleTouchEnd = () => {
    if (
      touchStartIndexRef.current !== null &&
      dragOverSongIndex !== null &&
      touchStartIndexRef.current !== dragOverSongIndex
    ) {
      reorderSongToIndex(touchStartIndexRef.current, dragOverSongIndex);
    }
    touchStartYRef.current = null;
    touchStartIndexRef.current = null;
    setDraggedSongIndex(null);
    setDragOverSongIndex(null);
  };

  // Handle Export
  const handleExport = async () => {
    if (!selectedPlaylist || playlistSongs.length === 0) return;
    setIsExporting(true);
    setExportMessage(null);

    const result = await exportPlaylistToFile(
      selectedPlaylist.name,
      playlistSongs,
      exportFormat
    );

    setIsExporting(false);
    if (result.success) {
      setExportMessage(`Playlist exportada com sucesso como .${exportFormat}`);
      setTimeout(() => {
        setExportModalOpen(false);
        setExportMessage(null);
      }, 2000);
    } else {
      setExportMessage(`Erro: ${result.error || 'Não foi possível exportar'}`);
    }
  };

  // 1. DETAIL VIEW FOR SELECTED PLAYLIST
  if (selectedPlaylist) {
    return (
      <div
        id="playlist-detail-container"
        className="max-w-3xl mx-auto px-4 py-4 pb-32 animate-in fade-in duration-200"
      >
        {/* Navigation back and header controls */}
        <div className="flex items-center justify-between mb-4">
          <button
            id="btn-back-to-playlists"
            onClick={() => {
              setSelectedPlaylistId(null);
              setIsManualReorderMode(false);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1.5 px-3 rounded-full hover:bg-black/5 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Playlists</span>
          </button>

          <button
            id="btn-export-playlist"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border shadow-xs transition-colors hover:bg-neutral-50 active:scale-95"
            style={{
              borderColor: `${currentTheme.outline}40`,
              color: currentTheme.primary,
            }}
            title="Exportar lista de músicas via Storage Access Framework"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar (.txt / .csv)</span>
          </button>
        </div>

        {/* Playlist Hero Header */}
        <div
          className="p-6 rounded-3xl mb-5 shadow-xs border"
          style={{
            backgroundColor: isFavoritesCollection ? '#FEF2F2' : currentTheme.surfaceVariant,
            borderColor: isFavoritesCollection ? '#FCA5A5' : `${currentTheme.outline}30`,
          }}
        >
          {editingPlaylistId === selectedPlaylist.id && !isFavoritesCollection ? (
            <form
              onSubmit={(e) => handleRenameSubmit(e, selectedPlaylist.id)}
              className="flex items-center gap-2 mb-2"
            >
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="text-xl font-bold bg-white px-3 py-1 rounded-xl border border-neutral-300 focus:outline-hidden"
              />
              <button
                type="submit"
                className="p-2 rounded-xl text-white shadow-xs"
                style={{ backgroundColor: currentTheme.primary }}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditingPlaylistId(null)}
                className="p-2 rounded-xl bg-neutral-200 text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mb-1 group">
              {isFavoritesCollection && (
                <Heart className="w-6 h-6 text-red-500 fill-current shrink-0" />
              )}
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate">
                {selectedPlaylist.name}
              </h2>
              {!isFavoritesCollection && (
                <button
                  onClick={() => {
                    setEditingPlaylistId(selectedPlaylist.id);
                    setEditedName(selectedPlaylist.name);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full transition-colors"
                  title="Renomear Playlist"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-neutral-600 font-medium">
            {playlistSongs.length} {playlistSongs.length === 1 ? 'música' : 'músicas'} • Duração Total:{' '}
            {formatDuration(totalDuration)}
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {playlistSongs.length > 0 && (
              <button
                id="btn-play-all-playlist"
                onClick={() => onPlayQueue(playlistSongs)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
                style={{ backgroundColor: currentTheme.primary }}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Reproduzir Todas</span>
              </button>
            )}

            {!isFavoritesCollection && (
              <button
                id="btn-add-songs-to-playlist"
                onClick={() => onOpenAddSongsModal(selectedPlaylist)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 bg-white"
                style={{
                  borderColor: currentTheme.outline,
                  color: currentTheme.onPrimaryContainer,
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Músicas</span>
              </button>
            )}

            {playlistSongs.length > 1 && !isFavoritesCollection && (
              <button
                id="btn-toggle-reorder-mode"
                onClick={() => {
                  setIsManualReorderMode((prev) => !prev);
                  if (!isManualReorderMode) setSortField('custom');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all active:scale-95"
                style={{
                  backgroundColor: isManualReorderMode
                    ? currentTheme.primaryContainer
                    : '#FFFFFF',
                  borderColor: `${currentTheme.outline}30`,
                  color: isManualReorderMode
                    ? currentTheme.onPrimaryContainer
                    : 'inherit',
                }}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{isManualReorderMode ? 'Concluir Ordem' : 'Ordem Manual'}</span>
              </button>
            )}

            {!isFavoritesCollection && (
              <button
                id="btn-delete-playlist-detail"
                type="button"
                onClick={() => {
                  setPlaylistToDelete({
                    id: selectedPlaylist.id,
                    name: selectedPlaylist.name,
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all active:scale-95 ml-auto"
                title="Excluir esta playlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Playlist</span>
              </button>
            )}
          </div>
        </div>

        {/* Smart Sorting controls within playlist */}
        {playlistSongs.length > 1 && !isManualReorderMode && (
          <div className="flex items-center justify-between mb-3 px-1 text-xs text-neutral-600">
            <span className="font-medium">Classificar lista por:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200">
              <button
                onClick={() => {
                  setSortField('name');
                  setSortDirection((prev) => (sortField === 'name' && prev === 'asc' ? 'desc' : 'asc'));
                }}
                className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                  sortField === 'name' ? 'bg-neutral-100 font-bold text-black' : 'text-neutral-600'
                }`}
              >
                Nome {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>

              <button
                onClick={() => {
                  setSortField('artist');
                  setSortDirection((prev) => (sortField === 'artist' && prev === 'asc' ? 'desc' : 'asc'));
                }}
                className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                  sortField === 'artist' ? 'bg-neutral-100 font-bold text-black' : 'text-neutral-600'
                }`}
              >
                Artista {sortField === 'artist' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>

              <button
                onClick={() => {
                  setSortField('duration');
                  setSortDirection((prev) => (sortField === 'duration' && prev === 'asc' ? 'desc' : 'asc'));
                }}
                className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                  sortField === 'duration' ? 'bg-neutral-100 font-bold text-black' : 'text-neutral-600'
                }`}
              >
                Duração {sortField === 'duration' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        )}

        {/* Songs List inside Playlist */}
        {playlistSongs.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed text-neutral-500 bg-white">
            <Music className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Esta lista está vazia</p>
            <p className="text-xs text-neutral-400 mt-1 mb-4">
              {isFavoritesCollection
                ? 'Toque no ícone de coração em qualquer música para adicioná-la aos Favoritos.'
                : 'Adicione faixas de áudio do seu armazenamento.'}
            </p>
            {!isFavoritesCollection && (
              <button
                onClick={() => onOpenAddSongsModal(selectedPlaylist)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: currentTheme.primary }}
              >
                Adicionar Músicas
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
            {playlistSongs.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id;
              const isBeingDragged = draggedSongIndex === idx;
              const isDropTarget = dragOverSongIndex === idx && draggedSongIndex !== idx;

              return (
                <div
                  key={`${song.id}-${idx}`}
                  draggable={!isFavoritesCollection}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-150 relative ${
                    isBeingDragged
                      ? 'opacity-40 scale-[0.98] bg-neutral-100 border border-dashed border-neutral-400'
                      : isDropTarget
                      ? 'bg-neutral-100/90 ring-2 ring-inset'
                      : isCurrent
                      ? 'bg-neutral-100/90'
                      : 'hover:bg-neutral-50'
                  }`}
                  style={{
                    boxShadow: isDropTarget ? `0 0 0 2px ${currentTheme.primary}` : undefined,
                  }}
                >
                  {/* Drag Handle (Desktop drag & Mobile Touch-drag) */}
                  {!isFavoritesCollection && (
                    <div
                      title="Arrastar para reordenar playlist"
                      aria-label="Arrastar para reordenar"
                      className="p-1.5 -ml-1.5 mr-1 text-neutral-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing touch-none select-none rounded-lg hover:bg-black/5"
                      onTouchStart={(e) => handleTouchStart(e, idx)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className="flex items-center gap-3 min-w-0 pr-2 cursor-pointer flex-1"
                    onClick={() => onPlaySong(song)}
                  >
                    <span className="text-xs font-mono text-neutral-400 w-5 text-center shrink-0">
                      {idx + 1}
                    </span>

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

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isCurrent ? 'font-bold' : 'text-neutral-900'
                        }`}
                        style={{ color: isCurrent ? currentTheme.primary : undefined }}
                      >
                        {song.title}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {song.artist} • {song.album}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-mono text-neutral-400 mr-1.5 hidden sm:inline">
                      {formatDuration(song.duration)}
                    </span>

                    {/* Manual reorder buttons (Accessible alternative) */}
                    {isManualReorderMode && (
                      <div className="flex items-center gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveSong(idx, 'up')}
                          className="p-1 rounded text-neutral-600 hover:bg-neutral-200 disabled:opacity-30"
                          title="Mover para cima"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === playlistSongs.length - 1}
                          onClick={() => moveSong(idx, 'down')}
                          className="p-1 rounded text-neutral-600 hover:bg-neutral-200 disabled:opacity-30"
                          title="Mover para baixo"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Contextual menu button */}
                    {onOpenSongMenu && (
                      <button
                        onClick={() => onOpenSongMenu(song)}
                        title="Mais opções"
                        className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}

                    {/* Remove from playlist button */}
                    {!isFavoritesCollection && (
                      <button
                        onClick={() =>
                          onRemoveSongFromPlaylist(selectedPlaylist.id, song.id)
                        }
                        title="Remover da playlist"
                        className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Export SAF Modal */}
        {exportModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
            onClick={() => setExportModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border bg-white"
              style={{ borderColor: `${currentTheme.outline}30` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText
                  className="w-5 h-5"
                  style={{ color: currentTheme.primary }}
                />
                <h3 className="text-base font-bold text-neutral-900">
                  Exportar Playlist
                </h3>
              </div>

              <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
                Utiliza o Storage Access Framework do Android (
                <code className="text-[10px] bg-neutral-100 px-1 py-0.5 rounded font-mono">
                  Intent.ACTION_CREATE_DOCUMENT
                </code>
                ) para salvar a lista formatada no diretório do seu dispositivo.
              </p>

              <div className="mb-4">
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                  Formato do Arquivo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('txt')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      exportFormat === 'txt'
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                        : 'border-neutral-200 text-neutral-700 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <span>Formato .TXT</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Título - Artista (Duração)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      exportFormat === 'csv'
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                        : 'border-neutral-200 text-neutral-700 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <span>Formato .CSV</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Valores separados por vírgula
                    </span>
                  </button>
                </div>
              </div>

              {/* Sample output preview */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 mb-4 text-[11px] font-mono text-neutral-600 overflow-x-auto">
                <span className="font-sans text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Exemplo de Linha Gerada:
                </span>
                {playlistSongs.length > 0 ? (
                  `${playlistSongs[0].title} - ${playlistSongs[0].artist} (${formatDuration(playlistSongs[0].duration)})`
                ) : (
                  'Título - Artista (03:45)'
                )}
              </div>

              {exportMessage && (
                <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                  {exportMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isExporting || playlistSongs.length === 0}
                  onClick={handleExport}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Salvando...' : 'Salvar Documento'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for deleting current playlist while in Detail View */}
        <ConfirmationModal
          isOpen={!!playlistToDelete}
          title="Excluir Playlist?"
          message={`Tem certeza que deseja excluir a playlist "${playlistToDelete?.name || ''}"? Esta ação removerá a lista persistente do Room Database, mas nenhum arquivo de áudio original será afetado.`}
          confirmLabel="Excluir Playlist"
          cancelLabel="Cancelar"
          isDestructive={true}
          currentTheme={currentTheme}
          onConfirm={() => {
            if (playlistToDelete) {
              onDeletePlaylist(playlistToDelete.id);
              setSelectedPlaylistId(null);
              setPlaylistToDelete(null);
            }
          }}
          onCancel={() => setPlaylistToDelete(null)}
        />
      </div>
    );
  }

  // 2. PLAYLISTS LIST VIEW
  const favoriteSongsCount = allSongs.filter((s) => s.isFavorite).length;

  return (
    <div id="playlists-tab-container" className="max-w-3xl mx-auto px-4 py-4 pb-32">
      {/* Informative Header Note: Playlist vs Fila */}
      <div
        className="mb-4 px-3 py-2.5 rounded-2xl text-[11px] leading-relaxed flex items-center gap-2.5 border"
        style={{
          backgroundColor: `${currentTheme.surfaceVariant}50`,
          borderColor: `${currentTheme.outline}20`,
          color: currentTheme.onPrimaryContainer,
        }}
      >
        <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
        <span>
          <strong>Playlists</strong> são coleções persistentes armazenadas no <strong>Room Database</strong>. A <strong>Fila</strong> é a lista temporária da sessão de áudio em execução.
        </span>
      </div>

      {/* Special Collection: FAVORITOS Pinned Card */}
      <div
        id="card-special-favorites"
        onClick={() => setSelectedPlaylistId('special_favorites')}
        className="mb-4 p-4 rounded-3xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 hover:shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between"
      >
        <div className="flex items-center gap-3.5 min-w-0 pr-2">
          <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 truncate">
                Favoritos
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                Coleção Especial
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">
              {favoriteSongsCount}{' '}
              {favoriteSongsCount === 1 ? 'música favoritada' : 'músicas favoritadas'} com persistência
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {favoriteSongsCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayQueue(allSongs.filter((s) => s.isFavorite));
              }}
              className="p-2.5 rounded-full bg-red-600 text-white shadow-xs hover:bg-red-700 active:scale-90"
              title="Reproduzir todos os favoritos"
            >
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </button>
          )}
          <span className="text-xs font-semibold text-red-600 hidden sm:inline">
            Abrir →
          </span>
        </div>
      </div>

      {/* Header & Create Button */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-neutral-900">
            Minhas Playlists
          </h2>
          <p className="text-xs text-neutral-500">Persistência local no banco Room</p>
        </div>

        <button
          id="btn-create-new-playlist"
          onClick={() => setIsCreatingNew(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
          style={{ backgroundColor: currentTheme.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Nova Playlist</span>
        </button>
      </div>

      {/* Create New Playlist Inline Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-2xl border mb-4 shadow-sm bg-white"
          style={{ borderColor: `${currentTheme.outline}30` }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Criar Nova Playlist
          </h3>
          <div className="flex items-center gap-2">
            <input
              id="input-new-playlist-name"
              type="text"
              placeholder="Ex: Treino, Foco, Viagem..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2"
            />
            <button
              type="submit"
              disabled={!newPlaylistName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 shadow-xs"
              style={{ backgroundColor: currentTheme.primary }}
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setNewPlaylistName('');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Playlists Cards */}
      {playlists.length === 0 ? (
        <div
          id="playlists-empty-state"
          className="text-center py-12 px-4 rounded-3xl border border-dashed my-2 text-neutral-500 bg-white"
          style={{
            borderColor: `${currentTheme.outline}40`,
          }}
        >
          <ListPlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-semibold text-neutral-800">
            Nenhuma playlist personalizada ainda
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
            Crie listas personalizadas para agrupar e ordenar suas faixas de áudio favoritas.
          </p>
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95"
            style={{ backgroundColor: currentTheme.primary }}
          >
            Criar Primeira Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {playlists.map((playlist) => {
            const count = playlist.songIds.length;
            return (
              <div
                key={playlist.id}
                id={`playlist-card-${playlist.id}`}
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className="group p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-[0.99] flex flex-col justify-between bg-white"
                style={{
                  borderColor: `${currentTheme.outline}20`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                      style={{
                        backgroundColor: currentTheme.secondaryContainer,
                        color: currentTheme.primary,
                      }}
                    >
                      <Music className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {new Date(playlist.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 truncate group-hover:underline">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {count} {count === 1 ? 'faixa' : 'faixas'} de áudio
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: currentTheme.primary }}
                  >
                    Abrir Playlist →
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistToDelete({
                        id: playlist.id,
                        name: playlist.name,
                      });
                    }}
                    className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors active:scale-95 cursor-pointer"
                    title="Excluir playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for deleting playlists (Card list view or Detail view) */}
      <ConfirmationModal
        isOpen={!!playlistToDelete}
        title="Excluir Playlist?"
        message={`Tem certeza que deseja excluir a playlist "${playlistToDelete?.name || ''}"? Esta ação removerá a lista persistente do Room Database, mas nenhum arquivo de áudio original será afetado.`}
        confirmLabel="Excluir Playlist"
        cancelLabel="Cancelar"
        isDestructive={true}
        currentTheme={currentTheme}
        onConfirm={() => {
          if (playlistToDelete) {
            onDeletePlaylist(playlistToDelete.id);
            if (selectedPlaylistId === playlistToDelete.id) {
              setSelectedPlaylistId(null);
            }
            setPlaylistToDelete(null);
          }
        }}
        onCancel={() => setPlaylistToDelete(null)}
      />
    </div>
  );
};
