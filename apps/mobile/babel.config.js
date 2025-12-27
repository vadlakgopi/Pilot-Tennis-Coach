module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin removed - not used in code
      // If you add reanimated later, uncomment: 'react-native-reanimated/plugin',
    ],
  };
};



