import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppScreen } from './AppScreen';

describe('AppScreen', () => {
  it('renders static content with page padding and safe-area edges', () => {
    render(
      <AppScreen testID="screen">
        <Text>Static content</Text>
      </AppScreen>,
    );

    expect(screen.getByTestId('screen').props.edges).toEqual(
      expect.objectContaining({
        top: 'additive',
        right: 'additive',
        left: 'additive',
      }),
    );
    expect(screen.getByTestId('screen-content').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingHorizontal: 16, paddingVertical: 20 }),
      ]),
    );
  });

  it('renders scroll content with keyboard-safe taps', () => {
    render(
      <AppScreen mode="scroll" testID="screen">
        <Text>Scrollable content</Text>
      </AppScreen>,
    );

    expect(screen.getByTestId('screen-scroll').props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('leaves unmanaged content unpadded for virtualized lists', () => {
    render(
      <AppScreen mode="unmanaged" testID="screen">
        <Text>Managed by list</Text>
      </AppScreen>,
    );

    expect(screen.getByTestId('screen-content').props.style).toBeUndefined();
  });
});
