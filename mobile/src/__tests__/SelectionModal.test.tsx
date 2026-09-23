import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { SelectionModal } from '../components/ui/SelectionModal';

const options = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
];

describe('SelectionModal', () => {
  it('filters options and reports the selected value', () => {
    const onSelect = jest.fn();
    render(
      <SelectionModal
        visible
        title="Example"
        searchPlaceholder="Search examples"
        selectedValue="alpha"
        options={options}
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('2 options')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Example search'), 'bet');

    expect(screen.queryByLabelText('Select Example alpha')).toBeNull();
    fireEvent.press(screen.getByLabelText('Select Example beta'));

    expect(onSelect).toHaveBeenCalledWith('beta');
  });

  it('shows an empty state when no option matches', () => {
    render(
      <SelectionModal
        visible
        title="Example"
        searchPlaceholder="Search examples"
        selectedValue="alpha"
        options={options}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Example search'), 'missing');

    expect(screen.getByText('No results')).toBeTruthy();
    expect(screen.getByText('Try a different search.')).toBeTruthy();
  });
});
