/**
 * Issue #65, AC3/AC4/AC7 — `/notification-settings` crashed in production with
 * `useTheme must be used within a ThemeProvider`.
 *
 * ## Why this test is shaped the way it is
 *
 * Rendering the screen itself is not available here: `jest.env.js` loads
 * `requireActual('react-native')`, and the first `StyleSheet.create` at module
 * scope hits `__fbBatchedBridgeConfig is not set, cannot invoke native
 * modules`. That is the same reason `jest.config.js` ignores every
 * `__tests__/**\/*.tsx`. A React Native renderer is a separate piece of
 * infrastructure and out of scope for this issue.
 *
 * So instead of rendering the screen, this test reproduces the *exact* failing
 * call: it reads which module the screen imports `useTheme` from, mounts a
 * probe component that calls that hook with **no provider above it** — which is
 * how every route in this app is mounted — and asserts it returns the token
 * shape the screen goes on to read.
 *
 * On master this fails with the literal production message, because the screen
 * imported `theme/ThemeContext` (context-backed, throws unmounted, returns
 * `{ tokens, ... }`) while reading `theme.colors.*` (the shape of
 * `hooks/useTheme`). Both halves of the defect are covered: the throw, and the
 * shape mismatch that would have hit one line later.
 *
 * Written in `.ts`, not `.tsx`, so it is not swallowed by
 * `testPathIgnorePatterns`.
 */

import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import renderer from 'react-test-renderer';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * The theme-consuming files that made up this bug. Each entry is a source file
 * and the directory its relative imports resolve against.
 */
const THEME_CONSUMERS = [
  'app/notification-settings.tsx',
  'components/notifications/QuietHoursConfig.tsx',
  'components/notifications/ReminderConfig.tsx',
  'components/notifications/NotificationTestPanel.tsx',
];

/** `import { useTheme } from '<specifier>'` — the live one, comments stripped. */
function useThemeImportOf(relativeFile: string): string {
  const source = fs
    .readFileSync(path.join(PROJECT_ROOT, relativeFile), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !/^\s*(\/\/|\*)/.test(line))
    .join('\n');

  const match = source.match(/import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`No \`useTheme\` import found in ${relativeFile}`);
  }
  return match[1] as string;
}

/** Every `theme.colors.<token>` the file reads. */
function colorTokensReadBy(relativeFile: string): string[] {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, relativeFile), 'utf8');
  return [...new Set([...source.matchAll(/\btheme\.colors\.([A-Za-z0-9_]+)/g)].map(m => m[1] as string))];
}

/** Calls `hook()` inside a real render, with nothing wrapping it. */
function callHookUnwrapped<T>(hook: () => T): T {
  let captured: T | undefined;
  let thrown: unknown;

  const Probe = () => {
    try {
      captured = hook();
    } catch (error) {
      thrown = error;
    }
    return null;
  };

  renderer.act(() => {
    renderer.create(React.createElement(Probe));
  });

  if (thrown) throw thrown;
  return captured as T;
}

describe('notification screens have a usable theme without a provider (issue #65)', () => {
  it.each(THEME_CONSUMERS)('%s: useTheme() does not throw when mounted bare', (file) => {
    const specifier = useThemeImportOf(file);
    const resolved = path.resolve(PROJECT_ROOT, path.dirname(file), specifier);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useTheme } = require(resolved);

    // On master this line throws:
    //   Error: useTheme must be used within a ThemeProvider
    const theme = callHookUnwrapped(() => useTheme());

    expect(theme).toBeDefined();
    expect(theme.colors).toBeDefined();
  });

  it.each(THEME_CONSUMERS)('%s: every theme.colors token it reads resolves to a colour', (file) => {
    const specifier = useThemeImportOf(file);
    const resolved = path.resolve(PROJECT_ROOT, path.dirname(file), specifier);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useTheme } = require(resolved);
    const theme = callHookUnwrapped(() => useTheme());

    const tokens = colorTokensReadBy(file);
    expect(tokens.length).toBeGreaterThan(0);

    const unresolved = tokens.filter(
      token => typeof theme.colors[token] !== 'string' || !theme.colors[token].startsWith('#')
    );

    expect(unresolved).toEqual([]);
  });

  it('the context-backed useTheme still guards itself', () => {
    // The fix must not have been "make the error go away by weakening the
    // provider check". `theme/ThemeContext` is still strict; it is simply no
    // longer what these screens import, and it is now mounted at the root.
    const { useTheme } = require('../../theme/ThemeContext');

    expect(() => callHookUnwrapped(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
  });

  it('ThemeProvider is mounted in the only layout the app has', () => {
    // AC4: the composition, not a local patch. `app/_layout.tsx` is the sole
    // layout file in the project, so mounting it there covers every route.
    const layouts = fs
      .readdirSync(path.join(PROJECT_ROOT, 'app'))
      .filter(name => name.startsWith('_layout.'));

    expect(layouts).toEqual(['_layout.tsx']);

    const layout = fs.readFileSync(path.join(PROJECT_ROOT, 'app', '_layout.tsx'), 'utf8');

    expect(layout).toMatch(/import\s*\{[^}]*\bThemeProvider\b[^}]*\}\s*from\s*['"]\.\.\/theme\/ThemeContext['"]/);
    expect(layout).toMatch(/<ThemeProvider>/);
    expect(layout).toMatch(/<\/ThemeProvider>/);
  });
});
