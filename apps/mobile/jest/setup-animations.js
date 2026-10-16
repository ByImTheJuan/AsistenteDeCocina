// Gestures and animations run in JavaScript under Jest: the native worklets
// runtime is replaced by its mock and Reanimated steps animations with the
// (fake) timers.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
require('react-native-reanimated').setUpTests();
require('react-native-gesture-handler/jestSetup');
