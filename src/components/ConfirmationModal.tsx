import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { M3ThemePalette } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  currentTheme?: M3ThemePalette;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  isDestructive = true,
  currentTheme,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        id="confirmation-modal-card"
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border flex flex-col animate-in zoom-in-95 duration-150"
        style={{ borderColor: currentTheme ? `${currentTheme.outline}30` : '#E5E7EB' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-red-50 text-red-600 border border-red-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-base font-bold text-neutral-900 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95 transition-all flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-neutral-900 hover:bg-black'
            }`}
            style={
              !isDestructive && currentTheme
                ? { backgroundColor: currentTheme.primary }
                : undefined
            }
          >
            {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
