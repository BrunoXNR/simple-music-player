import React, { useState, useRef } from 'react';
import {
  X,
  ListMusic,
  Trash2,
  MoveUp,
  MoveDown,
  Play,
  Volume2,
  Music,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { Song, M3ThemePalette } from '../types';
import { formatDuration } from '../utils/exportHelper';
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
  onClearQueue: () => void;
}

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
  onClearQueue,
}) => {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Touch drag state for mobile devices
  const touchStartYRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onMoveQueueItem(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers for mobile drag handle
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || touchStartIndexRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    const threshold = 40; // Approx item height in pixels

    if (Math.abs(diff) > threshold) {
      const steps = Math.round(diff / threshold);
      const newTarget = Math.max(
        0,
        Math.min(queue.length - 1, touchStartIndexRef.current + steps)
      );
      if (newTarget !== dragOverIndex) {
        setDragOverIndex(newTarget);
      }
    }
  };

  const handleTouchEnd = () => {
    if (
      touchStartIndexRef.current !== null &&
      dragOverIndex !== null &&
      touchStartIndexRef.current !== dragOverIndex
    ) {
      onMoveQueueItem(touchStartIndexRef.current, dragOverIndex);
    }
    touchStartYRef.current = null;
    touchStartIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
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
            A <strong>Fila</strong> controla a ordem da sessão de áudio em tempo real. Para salvar uma lista permanente, use <strong>Playlists</strong>.
          </span>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 pr-1 py-1">
          {queue.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <Music className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-neutral-700">Fila vazia</p>
              <p className="text-xs text-neutral-400 mt-0.5 max-w-xs mx-auto">
                Adicione músicas da biblioteca usando o menu de ações ou toque um álbum.
              </p>
            </div>
          ) : (
            queue.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id;
              const isBeingDragged = draggedIndex === idx;
              const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;

              return (
                <div
                  key={`${song.id}-${idx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`py-2 px-2 flex items-center justify-between rounded-xl transition-all duration-150 relative ${
                    isBeingDragged
                      ? 'opacity-40 scale-[0.98] bg-neutral-100 border border-dashed border-neutral-400'
                      : isDropTarget
                      ? 'bg-neutral-100/90 ring-2 ring-inset'
                      : isCurrent
                      ? 'bg-neutral-100/90 font-medium'
                      : 'hover:bg-neutral-50'
                  }`}
                  style={{
                    boxShadow: isDropTarget ? `0 0 0 2px ${currentTheme.primary}` : undefined,
                  }}
                >
                  {/* Drag Handle (Desktop drag & Mobile Touch-drag) */}
                  <div
                    title="Arrastar para reordenar"
                    aria-label="Arrastar para reordenar"
                    className="p-1.5 -ml-1 mr-1 text-neutral-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing touch-none select-none rounded-lg hover:bg-black/5"
                    onTouchStart={(e) => handleTouchStart(e, idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
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

                  {/* Right: Duration + Quick Arrows (fallback) + Remove */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] font-mono text-neutral-400 mr-1 hidden sm:inline">
                      {formatDuration(song.duration)}
                    </span>

                    {/* Move Up */}
                    <button
                      disabled={idx === 0}
                      onClick={() => onMoveQueueItem(idx, idx - 1)}
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                      title="Mover para cima"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      disabled={idx === queue.length - 1}
                      onClick={() => onMoveQueueItem(idx, idx + 1)}
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                      title="Mover para baixo"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => onRemoveFromQueue(idx)}
                      className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remover da fila"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">
            Total:{' '}
            {formatDuration(queue.reduce((acc, curr) => acc + curr.duration, 0))}
          </span>
          <button
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
