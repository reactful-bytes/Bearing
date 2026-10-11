import type { ExpoConfig } from 'expo/config';

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const firebaseEnv = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const missingFirebaseEnv = Object.entries(firebaseEnv)
  .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
  .map(([key]) => key);

if (missingFirebaseEnv.length > 0) {
  throw new Error(
    `Missing required Firebase build environment values: ${missingFirebaseEnv.join(', ')}`,
  );
}

const firebaseConfig = {
  apiKey: firebaseEnv.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: firebaseEnv.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: firebaseEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: firebaseEnv.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: firebaseEnv.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: firebaseEnv.EXPO_PUBLIC_FIREBASE_APP_ID!,
};
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
  userInterfaceStyle: 'automatic',
  plugins: [
    './plugins/withAndroidDnd',
    'expo-dev-client',
    'expo-asset',
    'expo-audio',
    [
      'expo-navigation-bar',
      {
        enforceContrast: false,
        hidden: false,
        style: 'light',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B162E',
        image: './assets/launch-mark-white.png',
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
      ...firebaseConfig,
    },
    google: {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: googleIosClientId,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    },
  },
};

export default config;
