import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { LocaleModal } from '../components/ui/LocaleModal';

describe('LocaleModal', () => {
  it('searches and selects a locale from the neutral option list', () => {
    const onSelect = jest.fn();
    render(<LocaleModal visible selectedValue="en-US" onClose={jest.fn()} onSelect={onSelect} />);

    fireEvent.changeText(screen.getByLabelText('Locale search'), 'German (Germany)');
    fireEvent.press(screen.getByLabelText('Select Locale de-DE'));

    expect(onSelect).toHaveBeenCalledWith('de-DE');
  });
});
