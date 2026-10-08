import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as expoAudio from 'expo-audio';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useState } from 'react';

import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { focusModeColors } from '../components/calendar/focusModeColors';
import {
  CalendarDisplayEvent,
  createUnpublishedMetadata,
} from '../features/calendar/calendarTypes';
import { FocusDndService } from '../services/focus/androidFocusDndService';

const mockTimerPlayer = {
  loop: false,
  pause: jest.fn(),
  play: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(async () => undefined),
};

function makeActiveEvent(): CalendarDisplayEvent {
  const startAt = new Date('2026-08-25T11:00:00.000Z');
  const endAt = new Date('2026-08-25T13:00:00.000Z');
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
    hasPolicyAccess: jest.fn(async () => true),
    openPolicyAccessSettings: jest.fn(async () => undefined),
    beginPriorityMode: jest.fn(async () => true),
    endPriorityMode: jest.fn(async () => true),
  };
}

function renderFocusMode(
  onClose = jest.fn(),
  events: CalendarDisplayEvent[] = [makeActiveEvent()],
) {
  return render(
    <FocusModeOverlay
      visible
      events={events}
      onClose={onClose}
      onSaveIdeaDump={jest.fn(async () => undefined)}
      dndService={makeDndService()}
    />,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-08-25T12:00:00.000Z'));
  mockTimerPlayer.loop = false;
  mockTimerPlayer.pause.mockClear();
  mockTimerPlayer.play.mockClear();
  mockTimerPlayer.replace.mockClear();
  mockTimerPlayer.seekTo.mockClear();
  jest.mocked(expoAudio.useAudioPlayer).mockReturnValue(mockTimerPlayer as never);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('FocusModeOverlay hold-to-exit', () => {
  it('shows the combined active-session content', () => {
    renderFocusMode();

    expect(screen.getByText('FOCUS MODE')).toBeTruthy();
    expect(screen.getByText('Deep Work')).toBeTruthy();
    expect(screen.getByText('01:00:00')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('01:00:00').props.style).fontSize).toBe(52);
    expect(StyleSheet.flatten(screen.getByTestId('focus-timer').props.style)).toMatchObject({
      flexGrow: 1,
      justifyContent: 'center',
    });
    expect(screen.getByText('Time remaining')).toBeTruthy();
    expect(screen.getByText('Quick Idea Dump')).toBeTruthy();
    expect(screen.getByText('End Time')).toBeTruthy();
    expect(screen.getByText('Distraction protection')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hold to return to calendar' })).toBeTruthy();
    expect(screen.queryByText('Hold to exit Focus Mode')).toBeNull();
    expect(StyleSheet.flatten(screen.getByText('Quick Idea Dump').props.style).textTransform).toBe(
      'none',
    );
    expect(
      StyleSheet.flatten(screen.getByLabelText('Idea dump input').props.style).borderWidth,
    ).toBe(0);
    const ideaInput = screen.getByLabelText('Idea dump input');
    expect(StyleSheet.flatten(ideaInput.props.style).backgroundColor).toBe(
      focusModeColors.surfaceRaised,
    );
    expect(StyleSheet.flatten(ideaInput.parent?.props.style).backgroundColor).toBe(
      focusModeColors.surfaceRaised,
    );
  });

  it('keeps the active scroll viewport full-width and applies gutters to its content', () => {
    renderFocusMode();

    const scrollView = screen.getByTestId('focus-session-scroll');
    const viewportStyle = StyleSheet.flatten(scrollView.props.style);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(viewportStyle.paddingHorizontal).toBeUndefined();
    expect(contentStyle.paddingHorizontal).toBeGreaterThan(0);
  });

  it('uses Deep Work and a no-timer placeholder without a linked event', () => {
    renderFocusMode(jest.fn(), []);

    expect(screen.getByText('Deep Work')).toBeTruthy();
    expect(screen.getByText('--:--:--')).toBeTruthy();
    expect(screen.getByText('Time remaining')).toBeTruthy();
  });

  it('fills the button during a hold and resets when released early', () => {
    const onClose = jest.fn();
    renderFocusMode(onClose, []);
    const exitButton = screen.getByRole('button', { name: 'Hold to return to calendar' });

    fireEvent(exitButton, 'layout', { nativeEvent: { layout: { width: 320, height: 56 } } });
    fireEvent(exitButton, 'pressIn');
    act(() => jest.advanceTimersByTime(1500));

    expect(exitButton.props.accessibilityValue.now).toBe(50);

    fireEvent(exitButton, 'pressOut');

    expect(
      screen.getByRole('button', { name: 'Hold to return to calendar' }).props.accessibilityValue
        .now,
    ).toBe(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('exits at three seconds and keeps press handlers safe after finger lift', () => {
    const onClose = jest.fn();
    renderFocusMode(onClose, []);
    const exitButton = screen.getByRole('button', { name: 'Hold to return to calendar' });

    fireEvent(exitButton, 'pressIn');
    act(() => jest.advanceTimersByTime(2999));

    expect(onClose).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));

    expect(onClose).not.toHaveBeenCalled();
    expect(exitButton.props.accessibilityValue.now).toBe(100);

    fireEvent(exitButton, 'pressOut');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(exitButton.props.accessibilityValue.now).toBe(100);

    fireEvent(exitButton, 'pressIn');
    act(() => jest.advanceTimersByTime(1500));
    expect(exitButton.props.accessibilityValue.now).toBe(50);
    fireEvent(exitButton, 'pressOut');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(exitButton.props.accessibilityValue.now).toBe(0);
  });

  it('allows the finished view action on its first press after hold release', () => {
    const onDone = jest.fn();

    function FocusExitHarness() {
      const [finished, setFinished] = useState(false);

      return finished ? (
        <Pressable testID="focus-done" onPress={onDone}>
          <Text>Done</Text>
        </Pressable>
      ) : (
        <FocusModeOverlay
          visible
          events={[]}
          onClose={() => setFinished(true)}
          onSaveIdeaDump={jest.fn(async () => undefined)}
          dndService={makeDndService()}
        />
      );
    }

    render(<FocusExitHarness />);
    const exitButton = screen.getByRole('button', { name: 'Hold to return to calendar' });

    fireEvent(exitButton, 'pressIn');
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByTestId('focus-done')).toBeNull();

    fireEvent(exitButton, 'pressOut');
    fireEvent.press(screen.getByTestId('focus-done'));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
