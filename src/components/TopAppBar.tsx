import React from 'react';
import { Palette, ShieldAlert, ShieldCheck, Code2, FolderPlus, ListMusic } from 'lucide-react';
import { M3ThemePalette } from '../types';

interface TopAppBarProps {
  currentTheme: M3ThemePalette;
  onCycleTheme: () => void;
  onOpenPermissions: () => void;
  onOpenCode: () => void;
  onAddFiles: () => void;
  onOpenQueue?: () => void;
  queueCount?: number;
  permissionGranted: boolean;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTheme,
  onCycleTheme,
  onOpenPermissions,
  onOpenCode,
  onAddFiles,
  onOpenQueue,
  queueCount = 0,
  permissionGranted,
}) => {
  return (
    <header
      id="top-app-bar"
      className="sticky top-0 z-30 px-4 py-3 border-b transition-colors"
      style={{
        backgroundColor: currentTheme.surface,
        borderColor: `${currentTheme.outline}20`,
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-lg font-semibold tracking-tight"
              style={{ color: currentTheme.onPrimaryContainer }}
            >
              Minimalist Music
            </h1>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{
                backgroundColor: currentTheme.secondaryContainer,
                color: currentTheme.primary,
              }}
            >
              M3 Local
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-normal">
            AndroidX Media3 • MediaStore
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Queue Shortcut Button */}
          {onOpenQueue && (
            <button
              id="btn-top-open-queue"
              onClick={onOpenQueue}
              title={`Fila de reprodução (${queueCount} faixas)`}
              className="p-2 rounded-full transition-colors hover:bg-black/5 active:scale-95 relative"
              style={{ color: currentTheme.primary }}
            >
              <ListMusic className="w-5 h-5" />
              {queueCount > 0 && (
                <span
                  className="absolute top-1 right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  {queueCount > 99 ? '99+' : queueCount}
                </span>
              )}
            </button>
          )}

          {/* File Picker trigger */}
          <button
            id="btn-scan-files"
            onClick={onAddFiles}
            title="Scan / Add local .mp3 or .wav audio files"
            className="p-2 rounded-full transition-colors hover:bg-black/5 active:scale-95"
            style={{ color: currentTheme.primary }}
          >
            <FolderPlus className="w-5 h-5" />
          </button>

          {/* Dynamic Color Palette Switcher */}
          <button
            id="btn-cycle-theme"
            onClick={onCycleTheme}
            title={`Current Theme: ${currentTheme.label} (Click to switch Material 3 palette)`}
            className="p-2 rounded-full transition-colors hover:bg-black/5 active:scale-95 flex items-center gap-1"
            style={{ color: currentTheme.primary }}
          >
            <Palette className="w-5 h-5" />
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-xs"
              style={{ backgroundColor: currentTheme.primary }}
            />
          </button>

          {/* MediaStore Permission status */}
          <button
            id="btn-permission-status"
            onClick={onOpenPermissions}
            title={
              permissionGranted
                ? 'Storage Permissions: Granted (READ_MEDIA_AUDIO)'
                : 'Storage Permissions: Needs Attention'
            }
            className="p-2 rounded-full transition-colors hover:bg-black/5 active:scale-95"
            style={{
              color: permissionGranted ? currentTheme.primary : '#DC2626',
            }}
          >
            {permissionGranted ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </button>

          {/* Android Kotlin Source Code reference */}
          <button
            id="btn-view-android-code"
            onClick={onOpenCode}
            title="View Native Android Kotlin (Compose + Media3) Code"
            className="px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            style={{
              backgroundColor: currentTheme.primaryContainer,
              color: currentTheme.onPrimaryContainer,
            }}
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">Kotlin Source</span>
          </button>
        </div>
      </div>
    </header>
  );
};
