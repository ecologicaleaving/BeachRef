const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to fix white screen issues with SDK 53
// This resolves the "dual package hazard" where both ESM and CommonJS 
// versions of libraries get loaded simultaneously
config.resolver.unstable_enablePackageExports = false;

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable minification
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