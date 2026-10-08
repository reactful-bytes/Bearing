/* global jest */

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const sharedValues = [];
  const animatedStyles = [];

  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (Component) => Component },
    cancelAnimation: jest.fn(),
    Easing: {
      linear: (value) => value,
      quad: (value) => value,
      out: (easing) => easing,
    },
    runOnJS: (callback) => callback,
    useAnimatedStyle: (createStyle) => {
      animatedStyles.push(createStyle);
      return createStyle();
    },
    useSharedValue: (initialValue) => {
      const sharedValueRef = React.useRef(null);
      if (!sharedValueRef.current) {
        sharedValueRef.current = {
          value: initialValue,
          set(value) {
            this.value = value;
          },
        };
        sharedValues.push(sharedValueRef.current);
      }
      return sharedValueRef.current;
    },
    __getSharedValues: () => sharedValues,
    __getAnimatedStyles: () => animatedStyles,
    withSpring: (value) => value,
    withTiming: (value, _configuration, callback) => {
      callback?.(true);
      return value;
    },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  let latestGesture;
  const createPanGesture = () => {
    const gesture = {};
    const setOption = (name) => (value) => {
      gesture[name] = value;
      return gesture;
    };
    Object.assign(gesture, {
      enabled: setOption('enabledValue'),
      activeOffsetX: setOption('activeOffsetXValue'),
      activeOffsetY: setOption('activeOffsetYValue'),
      failOffsetX: setOption('failOffsetXValue'),
      failOffsetY: setOption('failOffsetYValue'),
      onUpdate: setOption('onUpdateCallback'),
      onEnd: setOption('onEndCallback'),
      onFinalize: setOption('onFinalizeCallback'),
    });
    latestGesture = gesture;
    return gesture;
  };

  return {
    Gesture: { Pan: createPanGesture },
    GestureDetector: ({ children }) => React.createElement(React.Fragment, null, children),
    GestureHandlerRootView: View,
    __getLatestPanGesture: () => latestGesture,
  };
});

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
