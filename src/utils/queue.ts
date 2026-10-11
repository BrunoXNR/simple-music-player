import { Song } from '../types';

/**
 * Unbiased Fisher-Yates shuffle (returns a new array)
 */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Wraps a library song as a queue entry with its own unique instance key,
 * so the same song can appear more than once in the queue.
 */
export function createQueueItem(song: Song): Song {
  return {
    ...song,
    queueInstanceId: `${song.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
}

/**
 * Compares queue entries by instance when both have one, otherwise by song id.
 */
export function isSameQueueItem(a: Song | null | undefined, b: Song | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.queueInstanceId && b.queueInstanceId) return a.queueInstanceId === b.queueInstanceId;
  return a.id === b.id;
}

/**
 * Finds the position of a song in the queue: exact instance first, then by song id.
 */
export function findQueueIndex(queue: Song[], song: Song | null | undefined): number {
  if (!song) return -1;
  const exact = queue.findIndex((s) => isSameQueueItem(s, song));
  return exact !== -1 ? exact : queue.findIndex((s) => s.id === song.id);
}
