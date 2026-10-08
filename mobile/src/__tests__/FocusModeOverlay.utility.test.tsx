import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as expoAudio from 'expo-audio';
import { StyleSheet } from 'react-native';

import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { focusModeColors } from '../components/calendar/focusModeColors';
import {
  CalendarDisplayEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
import * as profileSounds from '../features/profile/profileSounds';
import { FocusDndService } from '../services/focus/androidFocusDndService';

const mockPlayer = {
  loop: false,
  pause: jest.fn(),
  play: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(async () => undefined),
};

function makeEvent(): CalendarDisplayEvent {
  const now = new Date();
  const startAt = new Date(now.getTime() - 60 * 60 * 1000);
  const endAt = new Date(now.getTime() + 60 * 60 * 1000);
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
    sourceTaskId: null,
    status: 'scheduled',
    goalId: null,
    milestoneId: null,
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

function makeDndService(): jest.Mocked<FocusDndService> {
  return {
    isAvailable: false,
    hasPolicyAccess: jest.fn(async () => false),
    openPolicyAccessSettings: jest.fn(async () => undefined),
    beginPriorityMode: jest.fn(async () => false),
    endPriorityMode: jest.fn(async () => false),
  };
}

function renderFocusMode(
  events: CalendarDisplayEvent[] = [],
  onUpdateTimerSound?: (soundId: string) => Promise<void>,
  onClose = jest.fn(),
) {
  return render(
    <FocusModeOverlay
      visible
      events={events}
      timerSoundId="steady-bell"
      onUpdateTimerSound={onUpdateTimerSound}
      onClose={onClose}
      onSaveIdeaDump={jest.fn(async () => undefined)}
      dndService={makeDndService()}
    />,
  );
}

beforeEach(() => {
  mockPlayer.loop = false;
  mockPlayer.pause.mockClear();
  mockPlayer.play.mockClear();
  mockPlayer.replace.mockClear();
  mockPlayer.seekTo.mockClear();
  jest.mocked(expoAudio.useAudioPlayer).mockReturnValue(mockPlayer as never);
  jest.spyOn(profileSounds, 'ensureProfileSoundPreviewUri').mockResolvedValue('file:///tone.wav');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('FocusModeOverlay utility sheets', () => {
  it('uses dark circular icon-only buttons for the Focus utilities', () => {
    renderFocusMode();

    for (const label of ['Session Details', 'Focus Environment', 'Focus Settings']) {
      const button = screen.getByRole('button', { name: label });
      const style = StyleSheet.flatten(button.props.style);

      expect(style).toMatchObject({
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: focusModeColors.utilityButtonBackground,
      });
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('shows scheduled event context and current session statistics', () => {
    const view = renderFocusMode([makeEvent()]);

    fireEvent.press(screen.getByRole('button', { name: 'Session Details' }));

    const title = screen.getByRole('header', { name: 'Session Details' });
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      color: expect.any(String),
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('focus-utility-sheet').props.style).backgroundColor,
    ).toBe(focusModeColors.sheetBackground);
    expect(focusModeColors.sheetBackground).not.toBe(focusModeColors.surface);
    const startRow = view.UNSAFE_getByProps({ testID: 'focus-detail-row-Scheduled start' });
    expect(StyleSheet.flatten(startRow.props.style)).toMatchObject({ minHeight: 48 });
    expect(StyleSheet.flatten(startRow.props.style).backgroundColor).toBeUndefined();
    expect(screen.getByText('Linked event')).toBeTruthy();
    expect(screen.getByText('Scheduled duration')).toBeTruthy();
    expect(screen.getByText('02:00:00')).toBeTruthy();
    expect(screen.getByText('Session elapsed')).toBeTruthy();
    expect(screen.getByText('Ideas captured')).toBeTruthy();
  });

  it('shows linked task context in uppercase', () => {
    const taskEvent = { ...makeEvent(), sourceTaskId: 'task-1' };
    renderFocusMode([taskEvent]);

    fireEvent.press(screen.getByRole('button', { name: 'Session Details' }));

    expect(StyleSheet.flatten(screen.getByText('LINKED TASK').props.style)).toEqual(
      StyleSheet.flatten(screen.getByText('Schedule').props.style),
    );
    expect(screen.queryByText('Linked task')).toBeNull();
  });

  it('explains when a session has no linked event or scheduled end', () => {
    renderFocusMode();

    fireEvent.press(screen.getByRole('button', { name: 'Session Details' }));

    expect(
      screen.getByText('No linked event or scheduled end for this focus session.'),
    ).toBeTruthy();
    expect(screen.getAllByText('Deep Work').length).toBeGreaterThan(1);
    expect(screen.getByText('Session elapsed')).toBeTruthy();
  });

  it('previews and saves a profile tone while keeping the alert toggle session-only', async () => {
    const onUpdateTimerSound = jest.fn(async () => undefined);
    renderFocusMode([], onUpdateTimerSound);

    fireEvent.press(screen.getByRole('button', { name: 'Focus Settings' }));
    const soundRow = screen.getByTestId('focus-sound-row-steady-bell');
    expect(StyleSheet.flatten(soundRow.props.style).backgroundColor).toBeUndefined();
    expect(StyleSheet.flatten(soundRow.props.style).borderRadius).toBeUndefined();
    expect(StyleSheet.flatten(soundRow.props.style).gap).toBeGreaterThan(8);
    expect(
      StyleSheet.flatten(screen.getByTestId('focus-sound-preview-face-summit-chime').props.style),
    ).toMatchObject({
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: focusModeColors.sheetRaised,
    });
    expect(StyleSheet.flatten(screen.getByText('Summit Chime').props.style)).toMatchObject({
      color: focusModeColors.sheetText,
      textAlign: 'left',
      textTransform: 'uppercase',
    });
    expect(StyleSheet.flatten(screen.getByText('Steady Bell').props.style).color).toBe(
      focusModeColors.greenLight,
    );
    const toneTitleStyle = StyleSheet.flatten(screen.getByText('Timer-end tone').props.style);
    expect(
      StyleSheet.flatten(screen.getByText('Show end-of-session alert').props.style),
    ).toMatchObject({
      color: toneTitleStyle.color,
      fontSize: toneTitleStyle.fontSize,
      fontWeight: toneTitleStyle.fontWeight,
      lineHeight: toneTitleStyle.lineHeight,
      textTransform: toneTitleStyle.textTransform,
    });
    expect(
      screen.getByText('Saved to Focus Preferences and used for future sessions.'),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Preview sound Summit Chime' }));
      await Promise.resolve();
    });
    expect(profileSounds.ensureProfileSoundPreviewUri).toHaveBeenCalledWith('summit-chime');

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: 'Select timer tone Summit Chime' }));
      await Promise.resolve();
    });
    expect(onUpdateTimerSound).toHaveBeenCalledWith('summit-chime');

    fireEvent(screen.getByTestId('focus-end-alert-toggle'), 'valueChange', false);
    expect(screen.getByTestId('focus-end-alert-toggle').props.value).toBe(false);
    expect(onUpdateTimerSound).toHaveBeenCalledTimes(1);
  });

  it('uses the timer-end tone title style for Focus Environment controls', () => {
    renderFocusMode();

    fireEvent.press(screen.getByRole('button', { name: 'Focus Environment' }));
    const environmentTitleStyle = StyleSheet.flatten(
      screen.getByText('Do Not Disturb').props.style,
    );
    fireEvent.press(screen.getByTestId('focus-utility-sheet-backdrop'));
    fireEvent.press(screen.getByRole('button', { name: 'Focus Settings' }));
    const toneTitleStyle = StyleSheet.flatten(screen.getByText('Timer-end tone').props.style);

    expect(environmentTitleStyle).toMatchObject({
      color: toneTitleStyle.color,
      fontSize: toneTitleStyle.fontSize,
      fontWeight: toneTitleStyle.fontWeight,
      lineHeight: toneTitleStyle.lineHeight,
      textTransform: toneTitleStyle.textTransform,
    });
  });

  it('dismisses Session Details without ending the active focus session', () => {
    const onClose = jest.fn();
    const view = renderFocusMode([], undefined, onClose);

    fireEvent.press(screen.getByRole('button', { name: 'Session Details' }));
    fireEvent.press(view.UNSAFE_getByProps({ testID: 'focus-utility-sheet-backdrop' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps sheet scrolling edge-aligned and exposes the drag handle without a close button', () => {
    const view = renderFocusMode();

    fireEvent.press(screen.getByRole('button', { name: 'Session Details' }));

    const scrollView = view.UNSAFE_getByProps({ testID: 'focus-utility-scroll' });
    const viewportStyle = StyleSheet.flatten(scrollView.props.style);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(viewportStyle.marginHorizontal).toBeLessThan(0);
    expect(contentStyle.paddingHorizontal).toBeGreaterThan(0);
    expect(contentStyle.paddingBottom).toBeGreaterThan(0);
    expect(view.UNSAFE_getByProps({ testID: 'focus-utility-sheet-drag-handle' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
