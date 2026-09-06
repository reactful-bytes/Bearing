import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { icons } from '../../design/icons';
import { AppIcon } from './AppIcon';

describe('AppIcon', () => {
  it.each(Object.keys(icons))('renders the %s registry entry', (name) => {
    render(<AppIcon name={name as keyof typeof icons} testID={`icon-${name}`} />);

    expect(screen.getByTestId(`icon-${name}`)).toBeTruthy();
  });

  it('uses a requested size and exposes labeled icons to assistive technology', () => {
    render(
      <AppIcon
        name="focus"
        size={32}
        accessibilityLabel="Start focus session"
        testID="focus-icon"
      />,
    );

    const icon = screen.getByTestId('focus-icon');

    expect(icon.props.accessibilityRole).toBe('image');
    expect(icon.props.accessibilityLabel).toBe('Start focus session');
    expect(icon.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 32, height: 32 })]),
    );
  });
});
