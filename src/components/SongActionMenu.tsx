import React, { useState } from 'react';
import {
  X,
  Play,
  ListPlus,
  Heart,
  Music,
  Folder,
  Disc3,
  Trash2,
  FileAudio,
  Radio,
} from 'lucide-react';
import { Song, M3ThemePalette } from '../types';
import { formatDuration } from '../utils/exportHelper';
import { ConfirmationModal } from './ConfirmationModal';

interface SongActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  currentTheme: M3ThemePalette;
  onPlayNow: (song: Song) => void;
  onPlayNext: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onRemoveFromLibrary: (songId: string) => void;
}

export const SongActionMenu: React.FC<SongActionMenuProps> = ({
  isOpen,
  onClose,
  song,
  currentTheme,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onToggleFavorite,
  onRemoveFromLibrary,
}) => {
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  if (!isOpen || !song) return null;

  return (
    <>
      <div
        id="song-action-menu-backdrop"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          id="song-action-menu-card"
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200"
          style={{ borderColor: `${currentTheme.outline}30` }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Top Handle on Mobile */}
        <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Song Header Info */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative"
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
                <Music className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-neutral-900 truncate">
                  {song.title}
                </h3>
                <span
                  className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium"
                  style={{
                    backgroundColor: `${currentTheme.primary}15`,
                    color: currentTheme.primary,
                  }}
                >
                  {song.format}
                </span>
              </div>
              <p className="text-xs text-neutral-600 truncate mt-0.5">
                {song.artist}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {song.album} • {formatDuration(song.duration)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Items */}
        <div className="py-2 space-y-1">
          {/* Reproduzir agora */}
          <button
            onClick={() => {
              onPlayNow(song);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: currentTheme.primaryContainer,
                color: currentTheme.onPrimaryContainer,
              }}
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Reproduzir agora</p>
              <p className="text-[11px] font-normal text-neutral-500">
                Inicia a reprodução desta faixa imediatamente
              </p>
            </div>
          </button>

          {/* Tocar a seguir */}
          <button
            onClick={() => {
              onPlayNext(song);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-700">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Tocar a seguir</p>
              <p className="text-[11px] font-normal text-neutral-500">
                Coloca a música logo após a que está tocando
              </p>
            </div>
          </button>

          {/* Adicionar à fila */}
          <button
            onClick={() => {
              onAddToQueue(song);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-700">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Adicionar à fila</p>
              <p className="text-[11px] font-normal text-neutral-500">
                Insere ao final da lista de reprodução temporária
              </p>
            </div>
          </button>

          {/* Favoritar / Desfavoritar */}
          <button
            onClick={() => {
              onToggleFavorite(song);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: song.isFavorite ? '#FEE2E2' : '#F3F4F6',
                color: song.isFavorite ? '#DC2626' : '#4B5563',
              }}
            >
              <Heart
                className={`w-4 h-4 ${song.isFavorite ? 'fill-current' : ''}`}
              />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">
                {song.isFavorite ? 'Remover dos Favoritos' : 'Marcar como Favorito'}
              </p>
              <p className="text-[11px] font-normal text-neutral-500">
                Adiciona à coleção especial permanente de Favoritos
              </p>
            </div>
          </button>

          {/* Adicionar à playlist */}
          <button
            onClick={() => {
              onAddToPlaylist(song);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-700">
              <Disc3 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Adicionar à playlist</p>
              <p className="text-[11px] font-normal text-neutral-500">
                Salva em uma lista personalizada do Room Database
              </p>
            </div>
          </button>

          {/* Remover da biblioteca */}
          <button
            type="button"
            onClick={() => setConfirmRemoveOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors text-left active:scale-[0.99] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-red-700">Remover da biblioteca</p>
              <p className="text-[11px] font-normal text-red-500">
                Exclui do índice local (útil para músicas movidas ou deletadas)
              </p>
            </div>
          </button>
        </div>

        {/* Metadata Details */}
        <div className="mt-2 pt-3 border-t border-neutral-100 bg-neutral-50 p-3 rounded-2xl text-[11px] space-y-1.5 text-neutral-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Disc3 className="w-3.5 h-3.5" /> Álbum:
            </span>
            <span className="font-medium text-neutral-800 truncate max-w-[180px]">
              {song.album}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Folder className="w-3.5 h-3.5" /> Pasta:
            </span>
            <span className="font-mono text-neutral-800 text-[10px] truncate max-w-[180px]">
              {song.folder || '/Internal Storage/Music'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <FileAudio className="w-3.5 h-3.5" /> Arquivo:
            </span>
            <span className="font-mono text-neutral-800 text-[10px] truncate max-w-[180px]">
              {song.fileName}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Confirmation Modal for removing song from local index */}
    <ConfirmationModal
      isOpen={confirmRemoveOpen}
      title="Remover da Biblioteca?"
      message={`Deseja remover "${song.title}" da sua biblioteca? O arquivo no aparelho não será apagado, apenas a referência no aplicativo.`}
      confirmLabel="Remover"
      cancelLabel="Cancelar"
      isDestructive={true}
      currentTheme={currentTheme}
      onConfirm={() => {
        onRemoveFromLibrary(song.id);
        setConfirmRemoveOpen(false);
        onClose();
      }}
      onCancel={() => setConfirmRemoveOpen(false)}
    />
  </>
  );
};
