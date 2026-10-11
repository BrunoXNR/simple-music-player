import { Song } from '../types';

/**
 * Creates a playable audio WAV Blob using the Web Audio API OfflineAudioContext.
 * This guarantees real, audible, offline music tracks for the local music player.
 */
/**
 * Generates an SVG data URI for album artwork based on album/artist strings
 */
export function generateAlbumArtwork(title: string, artist: string, album: string): string {
  // Deterministic color generation
  const hash = (title + artist + album).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 45) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue1}, 55%, 28%)"/>
        <stop offset="100%" stop-color="hsl(${hue2}, 65%, 15%)"/>
      </linearGradient>
      <radialGradient id="v" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.6"/>
      </radialGradient>
    </defs>
    <rect width="300" height="300" rx="24" fill="url(#g)"/>
    <rect width="300" height="300" rx="24" fill="url(#v)"/>
    <circle cx="150" cy="150" r="90" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <circle cx="150" cy="150" r="60" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <circle cx="150" cy="150" r="28" fill="rgba(255,255,255,0.2)"/>
    <text x="150" y="248" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="rgba(255,255,255,0.9)" text-anchor="middle">${album.slice(0, 24)}</text>
    <text x="150" y="268" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="rgba(255,255,255,0.65)" text-anchor="middle">${artist.slice(0, 28)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Fallback parser for missing metadata
 */
export function resolveSongMetadata(
  titleRaw?: string,
  artistRaw?: string,
  albumRaw?: string,
  fileName?: string
): { title: string; artist: string; album: string } {
  let title = (titleRaw || '').trim();
  let artist = (artistRaw || '').trim();
  let album = (albumRaw || '').trim();

  // If title is missing or empty, parse from filename
  if (!title && fileName) {
    const cleanFileName = fileName.replace(/\.[^/.]+$/, '');
    if (cleanFileName.includes(' - ')) {
      const parts = cleanFileName.split(' - ');
      if (!artist) artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    } else {
      title = cleanFileName;
    }
  }

  if (!title) title = fileName || 'Música sem título';
  if (!artist || artist === '<unknown>') artist = 'Artista desconhecido';
  if (!album || album === '<unknown>') album = 'Álbum desconhecido';

  return { title, artist, album };
}

export async function createSynthTrack(
  title: string,
  artist: string,
  album: string,
  folder: string,
  genre: 'ambient' | 'piano' | 'chill' | 'lofi',
  durationSeconds: number,
  baseFrequency: number
): Promise<Song> {
  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const offlineCtx = new OfflineAudioContext(numChannels, totalSamples, sampleRate);

  // Simple harmonious melodic chords generator
  const chords = [
    [baseFrequency, baseFrequency * 1.25, baseFrequency * 1.5], // Major / Minor tonic
    [baseFrequency * 0.89, baseFrequency * 1.12, baseFrequency * 1.33], // Subdominant
    [baseFrequency * 1.33, baseFrequency * 1.66, baseFrequency * 2.0], // Dominant
    [baseFrequency * 0.75, baseFrequency * 1.0, baseFrequency * 1.25], // Bass anchor
  ];

  const chordDuration = durationSeconds / chords.length;

  chords.forEach((chord, chordIdx) => {
    const startTime = chordIdx * chordDuration;
    chord.forEach((freq, noteIdx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = genre === 'piano' ? 'triangle' : genre === 'lofi' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Add gentle arpeggio offset
      const noteStart = startTime + (noteIdx * 0.25);
      const noteEnd = startTime + chordDuration;

      // Filter for warmth
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(genre === 'lofi' ? 800 : 1800, noteStart);

      // Envelope: Soft attack, slow decay
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(noteEnd, durationSeconds));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(noteStart);
      osc.stop(Math.min(noteEnd, durationSeconds));
    });
  });

  // Render the audio
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);
  const url = URL.createObjectURL(wavBlob);

  const artworkUrl = generateAlbumArtwork(title, artist, album);

  // Stable id derived from the title so favorites, playlists and queue survive reloads/rescans
  const stableId = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  return {
    id: `local_synth_${stableId}`,
    title,
    artist,
    album,
    folder,
    artworkUrl,
    duration: Math.round(durationSeconds),
    url,
    fileName: `${title.toLowerCase().replace(/\s+/g, '_')}.wav`,
    format: 'wav',
    size: wavBlob.size,
    dateAdded: Date.now() - Math.floor(Math.random() * 10000000),
    isFavorite: false,
  };
}

/**
 * Converts an AudioBuffer into standard RIFF WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const numSamples = buffer.length;
  const dataByteLength = numSamples * blockAlign;
  const headerByteLength = 44;
  const totalByteLength = headerByteLength + dataByteLength;
  
  const arrayBuffer = new ArrayBuffer(totalByteLength);
  const view = new DataView(arrayBuffer);
  
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  
  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length minus RIFF identifier and length bytes */
  view.setUint32(4, 36 + dataByteLength, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, dataByteLength, true);
  
  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Prepares initial sample local files matching Android MediaStore scan
 */
export async function getInitialLocalAudioFiles(): Promise<Song[]> {
  try {
    const tracks = await Promise.all([
      createSynthTrack('Nordic Aurora', 'Minimalist Ambient', 'Northern Horizons', '/Music/Ambient', 'ambient', 38, 220),
      createSynthTrack('Midnight Transit', 'Lo-Fi Chillhop', 'Night City Sessions', '/Music/Lo-Fi', 'lofi', 42, 196),
      createSynthTrack('Solitude in D Minor', 'Klara Sylvan', 'Classical Studies', '/Music/Classical', 'piano', 34, 293),
      createSynthTrack('Pulse & Rhythm', 'Acoustic Studies', 'Northern Horizons', '/Music/Ambient', 'chill', 46, 261),
      createSynthTrack('Echo Chamber', 'Hertz & Silence', 'Deep Resonance', '/Download/Audio', 'ambient', 36, 174),
    ]);
    return tracks;
  } catch (err) {
    console.warn('Audio synthesis fallback', err);
    // Fallback stub if Web Audio Offline context has issues in restricted sandbox
    return [
      {
        id: 'fallback_1',
        title: 'Sample Track 1',
        artist: 'Local Artist',
        album: 'Internal Storage',
        folder: '/Music',
        duration: 180,
        url: '',
        fileName: 'sample_track_1.mp3',
        format: 'mp3',
        size: 3200000,
        dateAdded: Date.now(),
        isFavorite: false,
      }
    ];
  }
}
