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
  const disposedRef = useRef(false);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      try {
        player.pause();
      } catch {
        return;
      }
    };
  }, [player]);

  useEffect(() => {
    if (disposedRef.current) return;

    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  }, []);

  useEffect(() => {
    if (disposedRef.current) return;

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
        if (disposedRef.current) return;

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
        if (disposedRef.current) return;
        setPlayingSoundId(null);
        setPreviewError(error instanceof Error ? error.message : 'Failed to preview sound.');
      }
    },
    [player],
  );

  const stopPreview = useCallback((): void => {
    if (disposedRef.current) return;
    try {
      player.pause();
    } catch {
      return;
    }
    setPlayingSoundId(null);
  }, [player]);

  return {
    playingSoundId,
    previewError,
    previewSound,
    stopPreview,
  };
}
