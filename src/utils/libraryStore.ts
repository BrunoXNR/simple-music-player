import { Song } from '../types';

/**
 * Persists user-imported audio files in IndexedDB so they survive page reloads
 * (blob URLs created with URL.createObjectURL die with the page).
 */

const DB_NAME = 'minimalist_music_library';
const DB_VERSION = 1;
const STORE_NAME = 'user_tracks';

interface StoredTrack {
  id: string;
  song: Omit<Song, 'url' | 'isFavorite' | 'unavailable' | 'queueInstanceId'>;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runInStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = operation(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadUserTracks(): Promise<Song[]> {
  const records = await runInStore<StoredTrack[]>('readonly', (store) => store.getAll());
  return records.map((record) => ({
    ...record.song,
    url: URL.createObjectURL(record.blob),
    isFavorite: false,
  }));
}

export async function saveUserTrack(song: Song, blob: Blob): Promise<void> {
  const { url, isFavorite, unavailable, queueInstanceId, ...songData } = song;
  await runInStore('readwrite', (store) => store.put({ id: song.id, song: songData, blob }));
}

export async function deleteUserTrack(id: string): Promise<void> {
  await runInStore('readwrite', (store) => store.delete(id));
}

/**
 * Small deterministic string hash (djb2), used to derive stable ids for imported files
 */
export function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

const SUPPORTED_FORMATS: Song['format'][] = ['mp3', 'wav', 'm4a', 'ogg', 'flac'];

export function detectAudioFormat(fileName: string): Song['format'] {
  const ext = fileName.split('.').pop()?.toLowerCase() as Song['format'] | undefined;
  return ext && SUPPORTED_FORMATS.includes(ext) ? ext : 'mp3';
}

/**
 * Reads the real duration (in seconds) of an audio URL; resolves 0 if unreadable
 */
export function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      resolve(isFinite(probe.duration) && probe.duration > 0 ? Math.round(probe.duration) : 0);
    };
    probe.onerror = () => resolve(0);
    probe.src = url;
  });
}
