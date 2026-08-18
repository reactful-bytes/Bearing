import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { EventDateTimePickerField } from '../components/calendar/EventDateTimePickerField.web';

describe('EventDateTimePickerField web fallback', () => {
  it('emits the browser date input value', () => {
    const onChange = jest.fn();
    render(
      <EventDateTimePickerField
        label="Start date"
        accessibilityLabel="Start date"
        mode="date"
        value="2026-08-04"
        dateValue="2026-08-04"
        timeValue="09:00"
        timezone="UTC"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Start date');
    expect(input.props.type).toBe('date');
    fireEvent(input, 'change', { currentTarget: { value: '2026-08-05' } });

    expect(onChange).toHaveBeenCalledWith('2026-08-05');
  });

  it('defaults time controls to a 12-hour language hint', () => {
    render(
      <EventDateTimePickerField
        label="Start time"
        accessibilityLabel="Start time"
        mode="time"
        value="09:00"
        dateValue="2026-08-04"
        timeValue="09:00"
        timezone="UTC"
        locale="en-GB"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Start time').props.lang).toBe('en-US');
  });

  it('supports 24-hour time selection and clearing', () => {
    const onChange = jest.fn();
    render(
      <EventDateTimePickerField
        label="Recurrence end date"
        accessibilityLabel="Recurrence end date"
        mode="time"
        value="14:30"
        dateValue="2026-08-04"
        timeValue="14:30"
        timezone="UTC"
        locale="en-US"
        timeFormat="24-hour"
        allowClear
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Recurrence end date');
    expect(input.props).toEqual(expect.objectContaining({ type: 'time', lang: 'en-GB', step: 60 }));
    fireEvent(input, 'change', { currentTarget: { value: '16:45' } });
    fireEvent.press(screen.getByLabelText('Clear recurrence end date'));

    expect(onChange).toHaveBeenNthCalledWith(1, '16:45');
    expect(onChange).toHaveBeenNthCalledWith(2, '');
  });
});
