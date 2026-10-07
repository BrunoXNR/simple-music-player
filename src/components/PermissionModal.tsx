import React from 'react';
import { ShieldAlert, ShieldCheck, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { M3ThemePalette } from '../types';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionGranted: boolean;
  onTogglePermission: () => void;
  currentTheme: M3ThemePalette;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  permissionGranted,
  onTogglePermission,
  currentTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="permission-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="permission-modal-card"
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border"
        style={{ borderColor: `${currentTheme.outline}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: permissionGranted
                  ? currentTheme.secondaryContainer
                  : '#FEE2E2',
                color: permissionGranted ? currentTheme.primary : '#DC2626',
              }}
            >
              {permissionGranted ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Storage & Media Permissions
              </h3>
              <p className="text-xs text-neutral-500">
                Android Permission Architecture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clear Explanation Cards */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 mb-1">
              <CheckCircle2
                className="w-4 h-4 shrink-0"
                style={{ color: currentTheme.primary }}
              />
              <span>Android 13+ (API 33+): READ_MEDIA_AUDIO</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed pl-6">
              Granular audio permission that grants read access specifically to
              audio files (.mp3, .wav) without requesting access to photos or videos.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 mb-1">
              <CheckCircle2
                className="w-4 h-4 shrink-0"
                style={{ color: currentTheme.primary }}
              />
              <span>Legacy Android 12 & below: READ_EXTERNAL_STORAGE</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed pl-6">
              Allows querying the Android MediaStore content resolver for external
              shared storage media.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 mb-1">
              <HelpCircle className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>Why is this required?</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed pl-6">
              Without media permission, Android blocks applications from discovering
              local audio files on internal storage or SD cards.
            </p>
          </div>
        </div>

        {/* Status Toggle & Action */}
        <div
          className="p-4 rounded-2xl border flex items-center justify-between mb-5"
          style={{
            backgroundColor: currentTheme.surfaceVariant,
            borderColor: `${currentTheme.outline}30`,
          }}
        >
          <div>
            <p className="text-xs font-bold text-neutral-900">
              Permission Status
            </p>
            <p className="text-[11px] text-neutral-600">
              {permissionGranted
                ? 'Granted: MediaStore indexing enabled'
                : 'Denied: Storage access blocked'}
            </p>
          </div>

          <button
            id="btn-toggle-permission-status"
            type="button"
            onClick={onTogglePermission}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs active:scale-95 ${
              permissionGranted
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {permissionGranted ? 'Granted ✓' : 'Grant Access'}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-semibold text-white shadow-xs"
            style={{ backgroundColor: currentTheme.primary }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
