/**
 * CommonJS stand-in for `expo/virtual/env`.
 *
 * `babel-preset-expo` rewrites every `process.env.EXPO_PUBLIC_*` access into an
 * import from `expo/virtual/env`. That virtual module ships as pure ESM, which
 * the jest transform pipeline cannot parse — so *any* file reading an env var
 * used to blow up at import time inside tests.
 *
 * `jest.config.js` maps `expo/virtual/env` onto this file, which exposes the
 * same `env` binding backed by the real `process.env` (populated by
 * `jest.env.js`). Nothing else changes: reads keep working, tests keep running.
 */
module.exports = {
  env: process.env,
  default: { env: process.env },
};
