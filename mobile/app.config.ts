import type { ExpoConfig } from 'expo/config';

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleIosUrlScheme = googleIosClientId?.endsWith('.apps.googleusercontent.com')
  ? `com.googleusercontent.apps.${googleIosClientId.slice(0, -'.apps.googleusercontent.com'.length)}`
  : 'com.googleusercontent.apps.configure-bearing-ios-client';

const config: ExpoConfig = {
  name: 'Bearing',
  slug: 'bearing',
  version: '1.0.0',
  scheme: 'bearing',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  plugins: [
    './plugins/withAndroidDnd',
    'expo-dev-client',
    'expo-asset',
    'expo-audio',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#061B3A',
        image: './assets/logoBlueBackground.png',
        imageWidth: 220,
        resizeMode: 'contain',
      },
    ],
    'expo-sharing',
    'expo-web-browser',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }],
    [
      'expo-calendar',
      {
        calendarPermission:
          'Bearing uses calendar access to show calendars you choose and publish events when requested.',
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.reactfulbytes.bearing',
  },
  android: {
    package: 'com.reactfulbytes.bearing',
    permissions: [
      'android.permission.ACCESS_NOTIFICATION_POLICY',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#E6F4FE',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    appEnv,
    eas: {
      projectId: '44aae1b2-85c1-4dc3-a99d-0ae8579a7b2b',
    },
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
    google: {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: googleIosClientId,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    },
  },
};

export default config;
