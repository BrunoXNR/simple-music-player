import React, { useState } from 'react';
import { X, Copy, Check, FileCode, FolderGit2 } from 'lucide-react';
import { ANDROID_FILES, AndroidFile } from '../utils/androidCodeData';
import { M3ThemePalette } from '../types';

interface AndroidCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: M3ThemePalette;
}

export const AndroidCodeModal: React.FC<AndroidCodeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
}) => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(ANDROID_FILES[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="android-code-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="android-code-modal-card"
        className="w-full max-w-4xl bg-neutral-900 text-neutral-100 rounded-3xl shadow-2xl border border-neutral-700 flex flex-col h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: currentTheme.primaryContainer,
                color: currentTheme.onPrimaryContainer,
              }}
            >
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Native Android Source (Kotlin + Jetpack Compose)
              </h3>
              <p className="text-[11px] text-neutral-400">
                Media3 ExoPlayer • MediaStore • Room DB • SAF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar + Editor */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* File selector list */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-950 p-2 overflow-y-auto shrink-0">
            <p className="text-[10px] uppercase font-semibold text-neutral-500 px-2 py-1 tracking-wider">
              Project Architecture
            </p>
            <div className="space-y-1 mt-1">
              {ANDROID_FILES.map((file) => {
                const isSelected = selectedFile.name === file.name;
                return (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      isSelected
                        ? 'bg-neutral-800 text-white font-semibold shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <FileCode
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-teal-400' : 'text-neutral-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate leading-tight">{file.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                        {file.language.toUpperCase()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-900 overflow-hidden">
            <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between text-xs">
              <span className="font-mono text-neutral-400 text-[11px] truncate">
                {selectedFile.path}
              </span>
              <span className="text-neutral-400 text-[11px] hidden sm:inline">
                {selectedFile.description}
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-neutral-200 bg-[#0D1117] selection:bg-teal-900">
              <pre className="tab-4">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
