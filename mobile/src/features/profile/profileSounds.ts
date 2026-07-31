import { Directory, File, Paths } from 'expo-file-system';

import { ProfileSoundOption } from './profileTypes';

const SAMPLE_RATE = 44100;
const WAV_HEADER_SIZE = 44;
const MAX_AMPLITUDE = 32767;
const TONE_DIRECTORY_NAME = 'bearing-sounds';

export const PROFILE_SOUND_OPTIONS: ProfileSoundOption[] = [
  {
    id: 'summit-chime',
    label: 'Summit Chime',
    description: 'Bright two-note chime for a clean timer finish.',
    sequence: [
      { frequency: 784, durationMs: 160, volume: 0.78 },
      { frequency: null, durationMs: 50 },
      { frequency: 1046.5, durationMs: 240, volume: 0.82 },
    ],
  },
  {
    id: 'signal-pulse',
    label: 'Signal Pulse',
    description: 'Short repeating pulse that works well before events.',
    sequence: [
      { frequency: 660, durationMs: 110, volume: 0.72 },
      { frequency: null, durationMs: 60 },
      { frequency: 660, durationMs: 110, volume: 0.72 },
      { frequency: null, durationMs: 60 },
      { frequency: 880, durationMs: 180, volume: 0.8 },
    ],
  },
  {
    id: 'steady-bell',
    label: 'Steady Bell',
    description: 'Warm bell-like rise for a calmer alert.',
    sequence: [
      { frequency: 523.25, durationMs: 160, volume: 0.66 },
      { frequency: null, durationMs: 45 },
      { frequency: 659.25, durationMs: 180, volume: 0.72 },
      { frequency: null, durationMs: 45 },
      { frequency: 783.99, durationMs: 240, volume: 0.78 },
    ],
  },
  {
    id: 'dawn-glow',
    label: 'Dawn Glow',
    description: 'Soft ascending tones with a lighter touch.',
    sequence: [
      { frequency: 440, durationMs: 150, volume: 0.56 },
      { frequency: null, durationMs: 40 },
      { frequency: 554.37, durationMs: 170, volume: 0.62 },
      { frequency: null, durationMs: 40 },
      { frequency: 659.25, durationMs: 220, volume: 0.68 },
    ],
  },
  {
    id: 'ember-drop',
    label: 'Ember Drop',
    description: 'Descending tone stack that feels more reflective.',
    sequence: [
      { frequency: 932.33, durationMs: 150, volume: 0.72 },
      { frequency: null, durationMs: 40 },
      { frequency: 783.99, durationMs: 170, volume: 0.68 },
      { frequency: null, durationMs: 40 },
      { frequency: 587.33, durationMs: 240, volume: 0.62 },
    ],
  },
];

export const DEFAULT_TIMER_SOUND_ID = 'summit-chime';
export const DEFAULT_REMINDER_SOUND_ID = 'signal-pulse';

const soundUriCache = new Map<string, string>();

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createToneSamples(sound: ProfileSoundOption): Int16Array {
  const totalSamples = sound.sequence.reduce(
    (count, segment) => count + Math.round((segment.durationMs / 1000) * SAMPLE_RATE),
    0,
  );
  const samples = new Int16Array(totalSamples);
  let sampleIndex = 0;

  sound.sequence.forEach((segment) => {
    const segmentSampleCount = Math.round((segment.durationMs / 1000) * SAMPLE_RATE);
    const amplitude = (segment.volume ?? 0.7) * MAX_AMPLITUDE;
    const fadeSampleCount = Math.min(
      Math.floor(SAMPLE_RATE * 0.008),
      Math.floor(segmentSampleCount / 2),
    );

    for (let localIndex = 0; localIndex < segmentSampleCount; localIndex += 1) {
      let envelope = 1;

      if (fadeSampleCount > 0) {
        if (localIndex < fadeSampleCount) {
          envelope = localIndex / fadeSampleCount;
        } else if (localIndex >= segmentSampleCount - fadeSampleCount) {
          envelope = (segmentSampleCount - localIndex) / fadeSampleCount;
        }
      }

      if (segment.frequency === null) {
        samples[sampleIndex] = 0;
      } else {
        const time = localIndex / SAMPLE_RATE;
        const value = Math.sin(2 * Math.PI * segment.frequency * time) * amplitude * envelope;
        samples[sampleIndex] = Math.max(-MAX_AMPLITUDE, Math.min(MAX_AMPLITUDE, Math.round(value)));
      }

      sampleIndex += 1;
    }
  });

  return samples;
}

function buildWaveBytes(sound: ProfileSoundOption): Uint8Array {
  const samples = createToneSamples(sound);
  const byteLength = WAV_HEADER_SIZE + samples.length * 2;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, byteLength - 8, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  samples.forEach((sample, index) => {
    view.setInt16(WAV_HEADER_SIZE + index * 2, sample, true);
  });

  return new Uint8Array(buffer);
}

function getSoundDirectory(): Directory {
  return new Directory(Paths.cache, TONE_DIRECTORY_NAME);
}

export function getProfileSoundOption(soundId: string): ProfileSoundOption {
  return PROFILE_SOUND_OPTIONS.find((option) => option.id === soundId) ?? PROFILE_SOUND_OPTIONS[0];
}

export async function ensureProfileSoundPreviewUri(soundId: string): Promise<string> {
  const cachedUri = soundUriCache.get(soundId);
  if (cachedUri) {
    return cachedUri;
  }

  const directory = getSoundDirectory();
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }

  const sound = getProfileSoundOption(soundId);
  const file = new File(directory, `${sound.id}.wav`);

  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
    file.write(buildWaveBytes(sound));
  }

  soundUriCache.set(soundId, file.uri);
  return file.uri;
}
