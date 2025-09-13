module.exports = function(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated plugin (must be last)
      'react-native-reanimated/plugin'
    ],
    env: {
      production: {
        plugins: [
          // Transform private class fields only in production
          '@babel/plugin-transform-private-methods',
          '@babel/plugin-transform-private-property-in-object',
          '@babel/plugin-transform-class-properties'
        ]
      }
    }
  };
};