module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|react-navigation|react-native-calendars|react-native-vector-icons|@react-native-async-storage/async-storage|expo|@expo(nent)?/.*)',
  ],
};
