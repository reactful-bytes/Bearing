import { useCallback, useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { ensureProfileSoundPreviewUri } from './profileSounds';

export type UseSoundPreviewReturn = {
  playingSoundId: string | null;
  previewError: string | null;
  previewSound: (soundId: string) => Promise<void>;
  stopPreview: () => void;
};

export function useSoundPreview(): UseSoundPreviewReturn {
  const player = useAudioPlayer(null, { updateInterval: 150 });
  const status = useAudioPlayerStatus(player);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const activeSoundUriRef = useRef<string | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  }, []);

  useEffect(() => {
    if (status.error) {
      setPreviewError(status.error);
      setPlayingSoundId(null);
    }

    if (!status.playing && status.didJustFinish) {
      setPlayingSoundId(null);
    }
  }, [status.didJustFinish, status.error, status.playing]);

  const previewSound = useCallback(
    async (soundId: string): Promise<void> => {
      setPreviewError(null);

      try {
        const soundUri = await ensureProfileSoundPreviewUri(soundId);

        if (activeSoundUriRef.current === soundUri) {
          await player.seekTo(0);
          player.play();
        } else {
          player.pause();
          activeSoundUriRef.current = soundUri;
          player.replace(soundUri);
          player.play();
        }

        setPlayingSoundId(soundId);
      } catch (error) {
        setPlayingSoundId(null);
        setPreviewError(error instanceof Error ? error.message : 'Failed to preview sound.');
      }
    },
    [player],
  );

  const stopPreview = useCallback((): void => {
    player.pause();
    setPlayingSoundId(null);
  }, [player]);

  return {
    playingSoundId,
    previewError,
    previewSound,
    stopPreview,
  };
}
