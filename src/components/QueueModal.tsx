import React, { useState } from 'react';
import {
  X,
  ListMusic,
  Trash2,
  MoveUp,
  MoveDown,
  Volume2,
  Music,
  Sparkles,
  GripVertical,
  Shuffle,
  ArrowUpDown,
} from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import { Song, M3ThemePalette, SortField, SortDirection } from '../types';
import { formatDuration } from '../utils/exportHelper';
import { isSameQueueItem, shuffleArray } from '../utils/queue';
import { ConfirmationModal } from './ConfirmationModal';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTheme: M3ThemePalette;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onReorderQueue: (newQueue: Song[]) => void;
  onClearQueue: () => void;
}

interface QueueItemRowProps {
  song: Song;
  idx: number;
  totalLength: number;
  isCurrent: boolean;
  isPlaying: boolean;
  currentTheme: M3ThemePalette;
  onPlaySong: (song: Song) => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onRemoveFromQueue: (index: number) => void;
}

const QueueItemRow: React.FC<QueueItemRowProps> = ({
  song,
  idx,
  totalLength,
  isCurrent,
  isPlaying,
  currentTheme,
  onPlaySong,
  onMoveQueueItem,
  onRemoveFromQueue,
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={song}
      id={song.queueInstanceId || `${song.id}-${idx}`}
      dragListener={false}
      dragControls={dragControls}
      className={`py-2 px-2 flex items-center justify-between rounded-xl transition-colors duration-150 relative select-none bg-white ${
        isCurrent ? 'bg-neutral-100/90 font-medium' : 'hover:bg-neutral-50'
      }`}
      style={{
        boxShadow: isCurrent ? `0 0 0 1px ${currentTheme.primary}40` : undefined,
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#F8FAFC',
        zIndex: 50,
      }}
    >
      {/* Drag Handle (Optimized for Android Touch & Desktop Mouse via Pointer Events) */}
      <div
        title="Pressione e arraste para reordenar"
        aria-label="Arrastar para reordenar"
        className="p-2 -ml-1 mr-1 text-neutral-400 hover:text-neutral-700 active:text-neutral-900 cursor-grab active:cursor-grabbing touch-none select-none rounded-lg hover:bg-black/5 transition-transform"
        onPointerDown={(e) => {
          dragControls.start(e);
        }}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Left: Artwork + Song Info (clickable to play) */}
      <div
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer pr-2"
        onClick={() => onPlaySong(song)}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative"
          style={{
            backgroundColor: isCurrent
              ? currentTheme.primary
              : currentTheme.secondaryContainer,
            color: isCurrent ? '#FFFFFF' : currentTheme.primary,
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
          {isCurrent && isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-white animate-pulse" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs truncate ${
                isCurrent ? 'font-bold text-neutral-900' : 'text-neutral-800'
              }`}
              style={{
                color: isCurrent ? currentTheme.primary : undefined,
              }}
            >
              {song.title}
            </span>
            {isCurrent && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full uppercase"
                style={{
                  backgroundColor: currentTheme.primaryContainer,
                  color: currentTheme.onPrimaryContainer,
                }}
              >
                Tocando
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 truncate">
            {song.artist} • {song.album}
          </p>
        </div>
      </div>

      {/* Right: Duration + Quick Arrows (accessible fallback) + Remove */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px] font-mono text-neutral-400 mr-1 hidden sm:inline">
          {formatDuration(song.duration)}
        </span>

        {/* Move Up */}
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => onMoveQueueItem(idx, idx - 1)}
          className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 cursor-pointer"
          title="Mover para cima"
        >
          <MoveUp className="w-3.5 h-3.5" />
        </button>

        {/* Move Down */}
        <button
          type="button"
          disabled={idx === totalLength - 1}
          onClick={() => onMoveQueueItem(idx, idx + 1)}
          className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 cursor-pointer"
          title="Mover para baixo"
        >
          <MoveDown className="w-3.5 h-3.5" />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemoveFromQueue(idx)}
          className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          title="Remover da fila"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
};

export const QueueModal: React.FC<QueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  currentSong,
  isPlaying,
  currentTheme,
  onPlaySong,
  onRemoveFromQueue,
  onMoveQueueItem,
  onReorderQueue,
  onClearQueue,
}) => {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('custom');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  if (!isOpen) return null;

  // Sorting handlers for queue
  const handleSortQueue = (field: 'name' | 'artist' | 'duration') => {
    const newDir = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDir);

    const sorted = [...queue].sort((a, b) => {
      let comp = 0;
      if (field === 'name') comp = (a.title || '').localeCompare(b.title || '');
      if (field === 'artist') comp = (a.artist || '').localeCompare(b.artist || '');
      if (field === 'duration') comp = (a.duration || 0) - (b.duration || 0);
      return newDir === 'asc' ? comp : -comp;
    });

    onReorderQueue(sorted);
  };

  const handleShuffleQueue = () => {
    setSortField('custom');
    const shuffled = shuffleArray(queue);
    onReorderQueue(shuffled);
  };

  const handleReverseQueue = () => {
    setSortField('custom');
    const reversed = [...queue].reverse();
    onReorderQueue(reversed);
  };

  const handleReorder = (newQueue: Song[]) => {
    setSortField('custom');
    onReorderQueue(newQueue);
  };

  return (
    <>
      <div
        id="queue-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          id="queue-modal-card"
          className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden"
          style={{ borderColor: `${currentTheme.outline}30` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: currentTheme.secondaryContainer,
                  color: currentTheme.primary,
                }}
              >
                <ListMusic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">
                    Fila de Reprodução
                  </h3>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                    Temporária
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {queue.length} {queue.length === 1 ? 'música' : 'músicas'} na fila atual
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {queue.length > 0 && (
                <button
                  id="btn-clear-queue"
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-full text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="Limpar fila"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Informative Note: Fila vs Playlist */}
          <div
            className="my-2.5 px-3 py-2 rounded-xl text-[11px] leading-relaxed flex items-center gap-2 border"
            style={{
              backgroundColor: `${currentTheme.surfaceVariant}50`,
              borderColor: `${currentTheme.outline}20`,
              color: currentTheme.onPrimaryContainer,
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              Pressione o ícone <strong>⠿</strong> para <strong>arrastar e reordenar</strong> faixas, ou ordene pelos botões abaixo.
            </span>
          </div>

          {/* Sorting and Quick Action Controls for Queue */}
          {queue.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 px-1 py-1.5 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-neutral-500 font-medium px-1 hidden sm:inline">
                  Ordenar:
                </span>
                <button
                  type="button"
                  onClick={() => handleSortQueue('name')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    sortField === 'name'
                      ? 'bg-white shadow-xs font-bold text-neutral-900 border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                  style={{
                    color: sortField === 'name' ? currentTheme.primary : undefined,
                  }}
                >
                  Nome {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>

                <button
                  type="button"
                  onClick={() => handleSortQueue('artist')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    sortField === 'artist'
                      ? 'bg-white shadow-xs font-bold text-neutral-900 border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                  style={{
                    color: sortField === 'artist' ? currentTheme.primary : undefined,
                  }}
                >
                  Artista {sortField === 'artist' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>

                <button
                  type="button"
                  onClick={() => handleSortQueue('duration')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    sortField === 'duration'
                      ? 'bg-white shadow-xs font-bold text-neutral-900 border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                  style={{
                    color: sortField === 'duration' ? currentTheme.primary : undefined,
                  }}
                >
                  Duração {sortField === 'duration' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>

              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={handleReverseQueue}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                  title="Inverter ordem da fila"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleShuffleQueue}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                  title="Embaralhar fila"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Reorderable Queue List via Framer Motion Reorder */}
          <div className="flex-1 overflow-y-auto pr-1 py-1">
            {queue.length === 0 ? (
              <div className="py-16 text-center text-neutral-400">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-neutral-700">Fila vazia</p>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-xs mx-auto">
                  Adicione músicas da biblioteca usando o menu de ações ou toque um álbum.
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={queue}
                onReorder={handleReorder}
                className="divide-y divide-neutral-100"
              >
                {queue.map((song, idx) => (
                  <QueueItemRow
                    key={song.queueInstanceId || `${song.id}-${idx}`}
                    song={song}
                    idx={idx}
                    totalLength={queue.length}
                    isCurrent={isSameQueueItem(currentSong, song)}
                    isPlaying={isPlaying}
                    currentTheme={currentTheme}
                    onPlaySong={onPlaySong}
                    onMoveQueueItem={onMoveQueueItem}
                    onRemoveFromQueue={onRemoveFromQueue}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">
              Total:{' '}
              {formatDuration(queue.reduce((acc, curr) => acc + (curr.duration || 0), 0))}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: currentTheme.primary }}
            >
              Fechar Fila
            </button>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Popup for Clearing Queue */}
      <ConfirmationModal
        isOpen={confirmClearOpen}
        title="Limpar Fila de Reprodução?"
        message="Todas as músicas da fila temporária serão removidas, mantendo apenas a faixa atual se houver reprodução ativa."
        confirmLabel="Limpar Fila"
        cancelLabel="Cancelar"
        isDestructive={true}
        currentTheme={currentTheme}
        onConfirm={() => {
          onClearQueue();
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </>
  );
};
