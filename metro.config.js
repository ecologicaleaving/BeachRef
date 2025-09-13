const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure package exports for SDK 53 with TanStack Query compatibility
// Temporarily enable package exports to fix TanStack Query import issues
config.resolver.unstable_enablePackageExports = true;

// Configure transform options to handle modern JS syntax
config.transformer.getTransformOptions = async (entryPoints, options, getDependenciesOf) => {
  const isWeb = options.platform === 'web';

  return {
    transform: {
      experimentalImportSupport: false,
      inlineRequires: !isWeb,
      // Enable require.context for Expo Router
      unstable_allowRequireContext: true,
    },
    // Ensure web builds use appropriate transforms
    ...(isWeb && {
      unstable_transformProfile: 'hermes-stable'
    })
  };
};

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable minification with safer settings for private class fields
  config.transformer.minifierConfig = {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    warnings: false,
  };

  // Asset optimization
  config.transformer.assetRegistryPath = 'react-native/Libraries/Image/AssetRegistry';

  // Disable Hermes completely for web platform compatibility
  config.transformer.hermesParser = false;
  config.transformer.unstable_allowRequireContext = true;

  // Cache settings disabled due to Node.js 22 compatibility issues
  // config.cacheStores = [
  //   {
  //     name: 'filesystem',
  //     options: {
  //       directory: '.metro-cache',
  //       maxFileSize: 50 * 1024 * 1024, // 50 MB
  //     },
  //   },
  // ];
}

// Exclude test files and stories from production bundle
config.resolver.blacklistRE = /(.*\/__tests__\/.*|.*\.test\.(ts|tsx|js|jsx)|.*\.stories\.(ts|tsx|js|jsx))$/;

module.exports = config;