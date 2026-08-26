/* global jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: (props) => React.createElement(View, props),
    DateTimePickerAndroid: {
      open: jest.fn(),
      dismiss: jest.fn(async () => true),
    },
  };
});

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioPlayer: jest.fn(() => ({
    loop: false,
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(async () => undefined),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    didJustFinish: false,
    error: null,
    playing: false,
  })),
}));
