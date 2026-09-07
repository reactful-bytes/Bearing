import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import App from './App';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that development and release builds receive the expected
// React Native environment.
registerRootComponent(App);
