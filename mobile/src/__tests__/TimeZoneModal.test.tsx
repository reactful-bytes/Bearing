import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TimeZoneModal } from '../components/ui/TimeZoneModal';

describe('TimeZoneModal', () => {
  it('searches and selects a time zone from the neutral option list', () => {
    const onSelect = jest.fn();
    render(<TimeZoneModal visible selectedValue="UTC" onClose={jest.fn()} onSelect={onSelect} />);

    fireEvent.changeText(screen.getByLabelText('Time zone search'), 'New York');
    fireEvent.press(screen.getByLabelText('Select Time zone America/New_York'));

    expect(onSelect).toHaveBeenCalledWith('America/New_York');
  });
});
