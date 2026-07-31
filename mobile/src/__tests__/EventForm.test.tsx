import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { EventForm } from '../components/calendar/EventForm';

describe('EventForm', () => {
  it('submits supported all-day and advanced event fields', async () => {
    const onSave = jest.fn(async () => undefined);
    render(
      <EventForm
        active
        initialDate={new Date('2026-07-31T09:00:00.000Z')}
        initialValues={{ timezone: 'UTC' }}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Event title'), 'Release planning');
    fireEvent.changeText(screen.getByLabelText('Event description'), 'Prepare the release');
    fireEvent(screen.getByLabelText('All-day event'), 'valueChange', true);
    fireEvent.press(screen.getByLabelText('Show advanced event fields'));
    fireEvent.changeText(screen.getByLabelText('Event location'), 'Office');
    fireEvent.press(screen.getByText('Weekly'));
    fireEvent.changeText(screen.getByLabelText('Recurrence interval'), '2');
    fireEvent.changeText(screen.getByLabelText('Recurrence occurrences'), '3');
    fireEvent.changeText(screen.getByLabelText('Alarm offsets'), '-60, -15');
    fireEvent.press(screen.getByText('Free'));
    fireEvent.changeText(screen.getByLabelText('Event URL'), 'https://example.com/release');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Release planning',
        description: 'Prepare the release',
        allDay: true,
        timezone: 'UTC',
        location: 'Office',
        recurrenceRule: expect.objectContaining({
          frequency: 'weekly',
          interval: 2,
          occurrenceCount: 3,
        }),
        alarms: [
          { absoluteAt: null, relativeOffsetMinutes: -60 },
          { absoluteAt: null, relativeOffsetMinutes: -15 },
        ],
        availability: 'free',
        url: 'https://example.com/release',
      }),
    );
  });
});
