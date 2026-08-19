import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { WeekTimeline, positionOverlappingEvents } from '../components/calendar/WeekTimeline';
import { CalendarEvent, createUnpublishedMetadata } from '../features/calendar/calendarTypes';

function makeEvent(
  id: string,
  title: string,
  startAt: Date,
  endAt: Date,
  allDay = false,
): CalendarEvent {
  return {
    ownership: 'bearing',
    id,
    userId: 'user-1',
    title,
    description: '',
    startAt,
    endAt,
    timezone: 'UTC',
    allDay,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    goalId: null,
    stepId: null,
    status: 'scheduled',
    publication: createUnpublishedMetadata(),
    createdAt: startAt,
    updatedAt: startAt,
  };
}

describe('WeekTimeline', () => {
  const weekStart = new Date(2026, 6, 19);

  it('renders Sunday through Saturday and opens a selected day', () => {
    const onSelectDate = jest.fn();

    render(
      <WeekTimeline
        weekStart={weekStart}
        events={[]}
        onPressEvent={jest.fn()}
        onSelectDate={onSelectDate}
        uiState="empty"
      />,
    );

    expect(screen.getByText('Sun')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
    expect(screen.getByTestId('week-timeline-scroll').props.stickyHeaderIndices).toEqual([0]);
    fireEvent.press(screen.getByLabelText('Wednesday, July 22, 2026'));
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 6, 22));
  });

  it('renders timed and all-day events in their week columns', () => {
    const timed = makeEvent(
      'timed',
      'Planning block',
      new Date(2026, 6, 21, 9),
      new Date(2026, 6, 21, 10),
    );
    const allDay = makeEvent(
      'all-day',
      'Launch day',
      new Date(2026, 6, 23),
      new Date(2026, 6, 24),
      true,
    );

    render(
      <WeekTimeline
        weekStart={weekStart}
        events={[timed, allDay]}
        onPressEvent={jest.fn()}
        onSelectDate={jest.fn()}
        uiState="ready"
      />,
    );

    expect(screen.getByTestId('week-event-timed')).toBeTruthy();
    expect(screen.getByText('Launch day')).toBeTruthy();
  });

  it('places simultaneous events in separate lanes', () => {
    const first = makeEvent('first', 'First', new Date(2026, 6, 21, 9), new Date(2026, 6, 21, 10));
    const second = makeEvent(
      'second',
      'Second',
      new Date(2026, 6, 21, 9, 30),
      new Date(2026, 6, 21, 10, 30),
    );

    expect(positionOverlappingEvents([first, second])).toEqual([
      { event: first, lane: 0, laneCount: 2 },
      { event: second, lane: 1, laneCount: 2 },
    ]);
  });
});
