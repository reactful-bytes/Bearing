import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import Svg from 'react-native-svg';

import { icons } from '../design/icons';
import { AppIcon } from '../components/ui/AppIcon';

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

  it('renders Tabler icons as SVG and retains the Bearing mark as image artwork', () => {
    render(
      <>
        <AppIcon name="calendar" testID="calendar-icon" />
        <AppIcon name="calendarOutline" testID="calendar-outline-icon" />
      </>,
    );

    expect(screen.getByTestId('calendar-icon').findByType(Svg)).toBeTruthy();
    expect(screen.getByTestId('calendar-outline-icon').findByType(Svg)).toBeTruthy();
  });

  it('renders the focus and idea icons as Tabler SVG icons', () => {
    render(
      <>
        <AppIcon name="focus" testID="focus-custom-icon" />
        <AppIcon name="idea" testID="idea-custom-icon" />
      </>,
    );

    expect(screen.getByTestId('focus-custom-icon').findByType(Svg)).toBeTruthy();
    expect(screen.getByTestId('idea-custom-icon').findByType(Svg)).toBeTruthy();
  });
});
