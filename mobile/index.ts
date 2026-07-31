import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that development and release builds receive the expected
// React Native environment.
registerRootComponent(App);
