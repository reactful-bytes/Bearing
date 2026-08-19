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
    fireEvent.press(screen.getByLabelText('Open first alert selector'));
    fireEvent.press(screen.getByLabelText('Select first alert 60 minutes before'));
    fireEvent.press(screen.getByLabelText('Open second alert selector'));
    fireEvent.press(screen.getByLabelText('Select second alert 15 minutes before'));
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
      { publishToDevice: false },
    );
  });

  it('offers a default-off linked copy only when a publication calendar is available', async () => {
    const onSave = jest.fn(async () => undefined);
    render(
      <EventForm
        active
        initialDate={new Date('2026-07-31T09:00:00.000Z')}
        publicationCalendarTitle="Work"
        onSave={onSave}
      />,
    );

    const publicationSwitch = screen.getByLabelText('Add to Work');
    expect(publicationSwitch.props.value).toBe(false);
    fireEvent(publicationSwitch, 'valueChange', true);
    fireEvent.changeText(screen.getByLabelText('Event title'), 'Publish me');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Publish me' }), {
      publishToDevice: true,
    });
  });

  it('uses date and time picker selections with the chosen 24-hour display', async () => {
    const onSave = jest.fn(async () => undefined);
    render(
      <EventForm
        active
        initialDate={new Date('2026-07-31T09:00:00.000Z')}
        initialValues={{ timezone: 'UTC' }}
        locale="en-US"
        timeFormat="24-hour"
        onSave={onSave}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Event title'), 'Picker planning');
    fireEvent.press(screen.getByLabelText('Start date'));
    fireEvent(
      screen.getByTestId('Start date picker'),
      'valueChange',
      { nativeEvent: { timestamp: Date.UTC(2026, 7, 4, 10, 0), utcOffset: 0 } },
      new Date('2026-08-04T10:00:00.000Z'),
    );
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByLabelText('Start time'));
    fireEvent(
      screen.getByTestId('Start time picker'),
      'valueChange',
      { nativeEvent: { timestamp: Date.UTC(2026, 7, 4, 14, 30), utcOffset: 0 } },
      new Date('2026-08-04T14:30:00.000Z'),
    );
    fireEvent.press(screen.getByText('Done'));

    expect(screen.getByText('14:30')).toBeTruthy();
  });
});
