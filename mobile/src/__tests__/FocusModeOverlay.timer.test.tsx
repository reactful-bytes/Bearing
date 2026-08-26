import { act, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as expoAudio from 'expo-audio';
import { Alert } from 'react-native';

import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import {
  CalendarDisplayEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
import * as profileSounds from '../features/profile/profileSounds';

const mockTimerPlayer = {
  loop: false,
  pause: jest.fn(),
  play: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(async () => undefined),
};
const mockSetAudioModeAsync = jest.fn(async () => undefined);

function makeActiveEvent(startAt: Date, endAt: Date): CalendarDisplayEvent {
  return {
    id: 'event-1',
    ownership: 'bearing',
    userId: 'user-1',
    title: 'Deep Work',
    description: '',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    status: 'scheduled',
    goalId: null,
    stepId: null,
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-08-25T12:00:00.000Z'));
  mockTimerPlayer.loop = false;
  mockTimerPlayer.pause.mockClear();
  mockTimerPlayer.play.mockClear();
  mockTimerPlayer.replace.mockClear();
  mockTimerPlayer.seekTo.mockClear();
  mockSetAudioModeAsync.mockClear();
  jest.mocked(expoAudio.setAudioModeAsync).mockImplementation(mockSetAudioModeAsync);
  jest.mocked(expoAudio.useAudioPlayer).mockReturnValue(mockTimerPlayer as never);
  jest.spyOn(profileSounds, 'ensureProfileSoundPreviewUri').mockResolvedValue('file:///timer.wav');
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('FocusModeOverlay timer completion', () => {
  it('exits, loops the selected sound, and stops it when OK is pressed', async () => {
    const onClose = jest.fn();
    let okAction: (() => void) | undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      expect(title).toBe('Deep Work block finished');
      expect(message).toBeUndefined();
      okAction = buttons?.find((button) => button.text === 'OK')?.onPress;
    });
    const startAt = new Date('2026-08-25T11:59:00.000Z');
    const endAt = new Date('2026-08-25T12:00:01.000Z');

    render(
      <FocusModeOverlay
        visible
        events={[makeActiveEvent(startAt, endAt)]}
        timerSoundId="steady-bell"
        onClose={onClose}
        onSaveIdeaDump={jest.fn(async () => undefined)}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(profileSounds.ensureProfileSoundPreviewUri).toHaveBeenCalledWith('steady-bell');
    expect(mockTimerPlayer.loop).toBe(true);
    expect(mockTimerPlayer.replace).toHaveBeenCalledWith('file:///timer.wav');
    expect(mockTimerPlayer.play).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(okAction).toBeDefined();

    await act(async () => {
      okAction?.();
      await Promise.resolve();
    });

    expect(mockTimerPlayer.loop).toBe(false);
    expect(mockTimerPlayer.pause).toHaveBeenCalledTimes(1);
    expect(mockTimerPlayer.seekTo).toHaveBeenCalledWith(0);
  });
});
