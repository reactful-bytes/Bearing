import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Appearance, Text } from 'react-native';

import { ThemeProvider, useTheme } from '../design/ThemeProvider';
import { useThemedStyles } from '../design/useThemedStyles';

function ThemeProbe() {
  const { isHydrated, preference, setPreference, theme } = useTheme();
  const styles = useThemedStyles((activeTheme) => ({
    text: { color: activeTheme.colors.text },
  }));

  return (
    <>
      <Text
        testID="theme-probe"
        style={styles.text}
      >{`${preference}:${theme.colors.background}:${isHydrated}`}</Text>
      <Text testID="set-light" onPress={() => void setPreference('light')}>
        Set light
      </Text>
    </>
  );
}

describe('ThemeProvider', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('uses dark as the provider-free default', () => {
    render(<ThemeProbe />);

    expect(screen.getByTestId('theme-probe')).toHaveTextContent('dark:#061220:true');
  });

  it('restores a persisted light preference after hydration', async () => {
    await AsyncStorage.setItem('@bearing/theme-preference', 'light');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-probe')).toHaveTextContent('light:#F4F8FA:true');
    });
  });

  it('persists a changed preference', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByTestId('set-light').props.onPress();
    });

    expect(await AsyncStorage.getItem('@bearing/theme-preference')).toBe('light');
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });
});
