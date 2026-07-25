const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure package exports for SDK 53 with TanStack Query compatibility
// Temporarily enable package exports to fix TanStack Query import issues
config.resolver.unstable_enablePackageExports = true;

// Platform-specific module resolution
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub out native-only modules on web to prevent RCTNetworking errors
  if (platform === 'web') {
    if (moduleName === '@sentry/react-native' || moduleName === 'react-native-network-logger') {
      return {
        filePath: require.resolve('./empty-module-stub.js'),
        type: 'sourceFile',
      };
    }
  }

  // Use default resolution for all other modules
  return context.resolveRequest(context, moduleName, platform);
};

// Alias fbjs to React 19 compatible replacement
config.resolver.alias = {
  'fbjs': require.resolve('./fbjs-replacement'),
};

// Add source extensions to resolve .js files in ES modules (for fast-xml-parser)
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'js', 'jsx', 'json', 'ts', 'tsx'];

// Configure transform options to handle modern JS syntax
config.transformer.getTransformOptions = async (entryPoints, options, getDependenciesOf) => {
  const isWeb = options.platform === 'web';

  return {
    transform: {
      experimentalImportSupport: false,
      // Inline requires on every platform, web included (issue #38). Without it
      // the ~1200 modules of the web entry chunk are all *executed* at boot,
      // which is where the 2.1 s of LCP render delay went; with it a module's
      // factory runs the first time one of its exports is actually read. It has
      // always been on for native, so the codebase already tolerates it.
      inlineRequires: true,
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
      // `keep_fnames: true` used to be set here. It preserves every function and
      // class name in the output — ~1500 modules' worth of identifiers that the
      // browser has to parse — and nothing in this codebase reads `fn.name` or
      // `constructor.name` at runtime (issue #38: the only `.name ===` checks are
      // on built-in `Error` objects, whose names are not minified). React
      // component names in DevTools come from `displayName`, which is set
      // explicitly where it matters.
      keep_fnames: false,
    },
    output: {
      // `ascii_only: true` escapes every non-ASCII character as \uXXXX, turning
      // each emoji/accented character in a string literal into 6-12 bytes. The
      // bundle is served as UTF-8 with an explicit charset, so the escaping buys
      // nothing (issue #38).
      ascii_only: false,
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