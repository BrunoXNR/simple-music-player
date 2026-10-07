import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Play,
  RotateCw,
  FolderOpen,
  Volume2,
  FileAudio,
  Heart,
  MoreVertical,
  Disc3,
  Folder,
  User,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Song, SortField, SortDirection, M3ThemePalette, LibraryFilter } from '../types';
import { formatDuration } from '../utils/exportHelper';

interface SongsTabProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTheme: M3ThemePalette;
  isScanning: boolean;
  onPlaySong: (song: Song) => void;
  onPlayQueue: (songs: Song[]) => void;
  onRescan: () => void;
  onOpenAddFiles: () => void;
  onOpenSongMenu: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onLoadSamples: () => void;
}

export const SongsTab: React.FC<SongsTabProps> = ({
  songs,
  currentSong,
  isPlaying,
  currentTheme,
  isScanning,
  onPlaySong,
  onPlayQueue,
  onRescan,
  onOpenAddFiles,
  onOpenSongMenu,
  onToggleFavorite,
  onLoadSamples,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');

  // Drill-down selection for Artist / Album / Folder
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Filter and Sort by title, artist, album, and fileName
  const filteredAndSortedSongs = useMemo(() => {
    let list = songs.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q)) ||
        s.fileName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Apply sub-filters
      if (libraryFilter === 'favorites') {
        return !!s.isFavorite;
      }
      if (selectedArtist) {
        return s.artist.toLowerCase() === selectedArtist.toLowerCase();
      }
      if (selectedAlbum) {
        return s.album.toLowerCase() === selectedAlbum.toLowerCase();
      }
      if (selectedFolder) {
        return (s.folder || '/Music').toLowerCase() === selectedFolder.toLowerCase();
      }

      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'artist') {
        comparison = a.artist.localeCompare(b.artist);
      } else if (sortField === 'duration') {
        comparison = a.duration - b.duration;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [
    songs,
    searchQuery,
    sortField,
    sortDirection,
    libraryFilter,
    selectedArtist,
    selectedAlbum,
    selectedFolder,
  ]);

  // Aggregations for Artists, Albums, Folders
  const artistsList = useMemo(() => {
    const map = new Map<string, Song[]>();
    songs.forEach((s) => {
      const art = s.artist || 'Artista desconhecido';
      if (!map.has(art)) map.set(art, []);
      map.get(art)!.push(s);
    });
    return Array.from(map.entries()).map(([artist, trackList]) => ({
      name: artist,
      count: trackList.length,
      duration: trackList.reduce((acc, c) => acc + c.duration, 0),
      songs: trackList,
    }));
  }, [songs]);

  const albumsList = useMemo(() => {
    const map = new Map<string, { album: string; artist: string; artwork?: string; songs: Song[] }>();
    songs.forEach((s) => {
      const alb = s.album || 'Álbum desconhecido';
      if (!map.has(alb)) {
        map.set(alb, {
          album: alb,
          artist: s.artist,
          artwork: s.artworkUrl,
          songs: [],
        });
      }
      map.get(alb)!.songs.push(s);
    });
    return Array.from(map.values());
  }, [songs]);

  const foldersList = useMemo(() => {
    const map = new Map<string, Song[]>();
    songs.forEach((s) => {
      const fold = s.folder || '/Internal Storage/Music';
      if (!map.has(fold)) map.set(fold, []);
      map.get(fold)!.push(s);
    });
    return Array.from(map.entries()).map(([folder, trackList]) => ({
      path: folder,
      count: trackList.length,
      songs: trackList,
    }));
  }, [songs]);

  const handleSelectSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortMenu(false);
  };

  const sortLabel = useMemo(() => {
    const dir = sortDirection === 'asc' ? '↑' : '↓';
    if (sortField === 'name') return `Nome ${dir}`;
    if (sortField === 'artist') return `Artista ${dir}`;
    if (sortField === 'duration') return `Duração ${dir}`;
    return 'Ordenar';
  }, [sortField, sortDirection]);

  // Reset drill-down
  const handleBackToGroup = () => {
    setSelectedArtist(null);
    setSelectedAlbum(null);
    setSelectedFolder(null);
  };

  return (
    <div id="songs-tab-container" className="max-w-3xl mx-auto px-4 py-3 pb-32">
      {/* Search & Sort Bar */}
      <div className="flex items-center gap-2 mb-3">
        {/* Search Input */}
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full border transition-colors focus-within:ring-2"
          style={{
            backgroundColor: currentTheme.surfaceVariant,
            borderColor: `${currentTheme.outline}30`,
          }}
        >
          <Search className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            id="input-search-songs"
            type="text"
            placeholder="Buscar por título, artista, álbum ou arquivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Sort Menu Button */}
        <div className="relative">
          <button
            id="btn-sort-songs"
            onClick={() => setShowSortMenu((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border shadow-xs transition-colors active:scale-95 whitespace-nowrap"
            style={{
              backgroundColor: currentTheme.surfaceVariant,
              borderColor: `${currentTheme.outline}30`,
              color: currentTheme.onPrimaryContainer,
            }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortLabel}</span>
          </button>

          {/* Sort Dropdown Popup */}
          {showSortMenu && (
            <div
              id="sort-dropdown-menu"
              className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl border py-1.5 z-40 bg-white"
              style={{ borderColor: `${currentTheme.outline}30` }}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Ordenar Biblioteca Por
              </div>
              <button
                onClick={() => handleSelectSort('name')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 flex items-center justify-between text-neutral-800"
              >
                <span>Título (Nome A-Z)</span>
                {sortField === 'name' && (
                  <span className="font-mono text-[11px]">
                    {sortDirection === 'asc' ? 'A→Z' : 'Z→A'}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleSelectSort('artist')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 flex items-center justify-between text-neutral-800"
              >
                <span>Artista</span>
                {sortField === 'artist' && (
                  <span className="font-mono text-[11px]">
                    {sortDirection === 'asc' ? 'A→Z' : 'Z→A'}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleSelectSort('duration')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 flex items-center justify-between text-neutral-800"
              >
                <span>Duração (Tempo)</span>
                {sortField === 'duration' && (
                  <span className="font-mono text-[11px]">
                    {sortDirection === 'asc' ? 'Mais curtas' : 'Mais longas'}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Library Sub-Filter Chips (No new bottom tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none select-none">
        {[
          { key: 'all', label: 'Todas as Músicas' },
          { key: 'artists', label: 'Artistas' },
          { key: 'albums', label: 'Álbuns' },
          { key: 'folders', label: 'Pastas' },
          { key: 'favorites', label: 'Favoritos ♥' },
        ].map((chip) => {
          const isActive = libraryFilter === chip.key && !selectedArtist && !selectedAlbum && !selectedFolder;
          return (
            <button
              key={chip.key}
              onClick={() => {
                setLibraryFilter(chip.key as LibraryFilter);
                handleBackToGroup();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'text-white shadow-xs font-semibold'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200'
              }`}
              style={{
                backgroundColor: isActive ? currentTheme.primary : undefined,
                borderColor: isActive ? currentTheme.primary : undefined,
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Drill-down Breadcrumb header */}
      {(selectedArtist || selectedAlbum || selectedFolder) && (
        <div className="flex items-center gap-2 mb-3 px-1 py-1.5 bg-neutral-100/70 rounded-xl">
          <button
            onClick={handleBackToGroup}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-black px-2 py-1 rounded-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>
          <span className="text-neutral-300">/</span>
          <span className="text-xs font-bold text-neutral-900 truncate">
            {selectedArtist || selectedAlbum || selectedFolder}
          </span>
          <span className="text-[11px] text-neutral-500 ml-auto mr-2">
            {filteredAndSortedSongs.length} faixas
          </span>
        </div>
      )}

      {/* Action and Rescan Bar */}
      <div className="flex items-center justify-between py-1 mb-2 px-1 text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800">
            {filteredAndSortedSongs.length}{' '}
            {filteredAndSortedSongs.length === 1 ? 'Música' : 'Músicas'}
          </span>
          <span className="text-[11px] text-neutral-400">(.mp3, .wav)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-trigger-rescan"
            onClick={onRescan}
            disabled={isScanning}
            className="flex items-center gap-1 hover:text-neutral-900 transition-colors p-1 rounded-md active:scale-95"
            title="Reindexar MediaStore e detectar novas músicas"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Reindexando...' : 'Reescanear'}</span>
          </button>

          <button
            id="btn-import-local-files"
            onClick={onOpenAddFiles}
            className="flex items-center gap-1 font-medium hover:underline p-1 rounded-md"
            style={{ color: currentTheme.primary }}
            title="Importar arquivos .mp3 e .wav do armazenamento"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {/* 1. ARTISTS LIST VIEW */}
      {libraryFilter === 'artists' && !selectedArtist && (
        <div className="space-y-1.5">
          {artistsList.map((art) => (
            <div
              key={art.name}
              onClick={() => setSelectedArtist(art.name)}
              className="p-3 bg-white rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-xs cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: currentTheme.secondaryContainer,
                    color: currentTheme.primary,
                  }}
                >
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-neutral-900 truncate">
                    {art.name}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    {art.count} {art.count === 1 ? 'música' : 'músicas'} •{' '}
                    {formatDuration(art.duration)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayQueue(art.songs);
                }}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-black"
                title="Tocar todas deste artista"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. ALBUMS LIST VIEW */}
      {libraryFilter === 'albums' && !selectedAlbum && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {albumsList.map((alb) => (
            <div
              key={alb.album}
              onClick={() => setSelectedAlbum(alb.album)}
              className="p-3 bg-white rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md cursor-pointer flex flex-col justify-between transition-all group"
            >
              <div className="aspect-square w-full rounded-xl overflow-hidden mb-2 bg-neutral-100 shadow-xs relative">
                {alb.artwork ? (
                  <img
                    src={alb.artwork}
                    alt={alb.album}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <Disc3 className="w-10 h-10" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayQueue(alb.songs);
                  }}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                  style={{
                    backgroundColor: currentTheme.primary,
                    color: '#fff',
                  }}
                  title="Reproduzir álbum"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-neutral-900 truncate">
                  {alb.album}
                </h4>
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                  {alb.artist}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {alb.songs.length} faixas
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. FOLDERS LIST VIEW */}
      {libraryFilter === 'folders' && !selectedFolder && (
        <div className="space-y-1.5">
          {foldersList.map((fold) => (
            <div
              key={fold.path}
              onClick={() => setSelectedFolder(fold.path)}
              className="p-3 bg-white rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-xs cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: currentTheme.secondaryContainer,
                    color: currentTheme.primary,
                  }}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-mono font-bold text-neutral-900 truncate">
                    {fold.path}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {fold.count} {fold.count === 1 ? 'arquivo' : 'arquivos'} de áudio
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayQueue(fold.songs);
                }}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-black"
                title="Tocar pasta"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4. DEFAULT TRACKS LIST VIEW (All, Favorites, or Selected Artist/Album/Folder) */}
      {(libraryFilter === 'all' ||
        libraryFilter === 'favorites' ||
        selectedArtist ||
        selectedAlbum ||
        selectedFolder) && (
        <>
          {filteredAndSortedSongs.length === 0 ? (
            <div
              id="songs-empty-state"
              className="text-center py-16 px-4 rounded-3xl border border-dashed my-4 bg-white"
              style={{
                borderColor: `${currentTheme.outline}30`,
              }}
            >
              <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-30 text-neutral-500" />
              <h3 className="text-base font-semibold text-neutral-800">
                {libraryFilter === 'favorites'
                  ? 'Nenhum favorito adicionado'
                  : searchQuery
                  ? `Nenhum resultado para "${searchQuery}"`
                  : 'Nenhum arquivo de áudio encontrado'}
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-5">
                {libraryFilter === 'favorites'
                  ? 'Toque no ícone de coração em qualquer música para salvá-la nos seus Favoritos.'
                  : searchQuery
                  ? 'Verifique os termos digitados ou limpe a busca.'
                  : 'Adicione suas músicas locais (.mp3, .wav) ou recarregue as faixas de teste.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-full text-xs font-semibold border text-neutral-700 hover:bg-neutral-50"
                  >
                    Limpar Busca
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onOpenAddFiles}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      Selecionar Arquivos Locais
                    </button>
                    <button
                      onClick={onLoadSamples}
                      className="px-4 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95"
                      style={{
                        borderColor: currentTheme.outline,
                        color: currentTheme.onPrimaryContainer,
                      }}
                    >
                      Carregar Músicas de Exemplo
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div id="songs-list-items" className="divide-y divide-neutral-100 bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
              {filteredAndSortedSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    id={`song-item-${song.id}`}
                    className={`group flex items-center justify-between py-2.5 px-3 transition-colors cursor-pointer ${
                      isCurrent ? 'bg-neutral-100/90' : 'hover:bg-neutral-50'
                    }`}
                    onClick={() => onPlaySong(song)}
                  >
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform overflow-hidden shadow-xs relative"
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
                          <FileAudio className="w-5 h-5" />
                        )}

                        {/* Status Overlay */}
                        {isCurrent && isPlaying ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Volume2 className="w-4 h-4 text-white animate-pulse" />
                          </div>
                        ) : isCurrent ? (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isCurrent ? 'text-neutral-900' : 'text-neutral-800'
                            }`}
                            style={{
                              color: isCurrent ? currentTheme.primary : undefined,
                            }}
                          >
                            {song.title}
                          </p>
                          {song.unavailable && (
                            <span className="flex items-center gap-0.5 text-[9px] text-red-600 bg-red-50 px-1 py-0.2 rounded font-medium">
                              <AlertCircle className="w-2.5 h-2.5" /> Indisponível
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {song.artist} • {song.album}
                        </p>
                      </div>
                    </div>

                    {/* Right: Format pill, duration, favorite, more options */}
                    <div
                      className="flex items-center gap-1 sm:gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium hidden sm:inline"
                        style={{
                          backgroundColor: `${currentTheme.primary}12`,
                          color: currentTheme.primary,
                        }}
                      >
                        {song.format}
                      </span>

                      <span className="text-xs font-mono text-neutral-400 w-11 text-right">
                        {formatDuration(song.duration)}
                      </span>

                      {/* Favorite Button */}
                      <button
                        onClick={() => onToggleFavorite(song)}
                        title={
                          song.isFavorite
                            ? 'Remover dos favoritos'
                            : 'Adicionar aos favoritos'
                        }
                        className={`p-1.5 rounded-full transition-colors active:scale-90 ${
                          song.isFavorite
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            song.isFavorite ? 'fill-current' : ''
                          }`}
                        />
                      </button>

                      {/* Contextual Action Menu Button */}
                      <button
                        id={`btn-song-menu-${song.id}`}
                        onClick={() => onOpenSongMenu(song)}
                        title="Ações da música (Fila, Playlist, etc.)"
                        className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 active:scale-90 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
