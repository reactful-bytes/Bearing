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

  it('tints alpha-mask brand artwork with an explicit color', () => {
    render(<AppIcon name="bearingMark" color="#22C55E" testID="bearing-mark-icon" />);

    expect(screen.getByTestId('bearing-mark-icon').findByType('Image').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ tintColor: '#22C55E' })]),
    );
  });

  it('uses the icon-library crop as primary artwork and retains SVG glyphs as secondary', () => {
    render(
      <>
        <AppIcon name="calendar" testID="calendar-icon" />
        <AppIcon name="calendarOutline" testID="calendar-outline-icon" />
      </>,
    );

    expect(screen.getByTestId('calendar-icon').findByType('Image')).toBeTruthy();

    expect(
      screen.getByTestId('calendar-outline-icon').findAllByProps({
        d: 'M7 2v4M17 2v4M3 9h18M7 13h.01M11 13h.01M15 13h.01M7 17h.01M11 17h.01M15 17h.01',
      }),
    ).not.toHaveLength(0);
  });
});
