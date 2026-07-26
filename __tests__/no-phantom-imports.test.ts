/**
 * AC5 of issue #71 / AC6 of issue #73, frozen.
 *
 * Three separate outages in this repository had the same shape: a module
 * reached for a member of another module that was not there.
 *
 * - #43 — `app/_layout.tsx` called `NotificationService.getInstance()` on a
 *   default export that was already an instance. A `try/catch` degraded the
 *   TypeError to a warning and push notifications were silently dead for months.
 * - #71 — `hooks/useAnalyticsSettings.ts` called `LocalStorageManager.getInstance()`,
 *   a static that does not exist. `/analytics-dashboard` and `/analytics-settings`
 *   rendered as blank pages.
 * - #73 — `services/RealtimeSubscriptionService.ts` default-imported
 *   `RefereeAssignmentsService`, which only has a named export, so the binding
 *   was `undefined` and every assignment-notification path threw.
 *
 * `tsc` reported all three. They were unreadable inside ~2500 unclassified
 * errors. This test extracts precisely that family and holds it at zero, so the
 * fourth occurrence fails a commit instead of a route.
 *
 * What it checks: for every *relative* import in the application source, the
 * imported binding must actually be exported by the target module — including
 * `default`. Bare-specifier imports (npm packages) are out of scope; they are
 * `node_modules` typings, not our code.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** Application source. Tests, mocks, scripts and Deno edge functions are not it. */
const SCANNED_DIRS = ['app', 'components', 'hooks', 'lib', 'screens', 'services', 'utils'];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.d.ts'];

const SKIPPED_DIR_NAMES = new Set(['node_modules', '__tests__', '__mocks__', 'coverage']);

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIPPED_DIR_NAMES.has(entry.name)) continue;
      yield* walk(full);
      continue;
    }

    const ext = path.extname(entry.name);
    if (ext === '.ts' || ext === '.tsx') yield full;
  }
}

/** Resolve a relative specifier the way Metro/TS do: exact, then extensions, then /index. */
function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);

  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map(ext => base + ext),
    // Platform-specific overrides count as providing the module's shape.
    base + '.web.ts',
    base + '.web.tsx',
    ...SOURCE_EXTENSIONS.map(ext => path.join(base, 'index' + ext)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const sourceFileCache = new Map<string, ts.SourceFile>();

function parse(file: string): ts.SourceFile {
  const cached = sourceFileCache.get(file);
  if (cached) return cached;

  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  sourceFileCache.set(file, sf);
  return sf;
}

const exportCache = new Map<string, Set<string> | null>();

/**
 * Names a module exports. `null` means "cannot be determined statically" —
 * the module re-exports from a package (`export * from 'some-lib'`), so any
 * name could legitimately come through and we must not accuse it.
 */
function exportedNames(file: string, seen = new Set<string>()): Set<string> | null {
  if (seen.has(file)) return new Set();
  seen.add(file);

  const cached = exportCache.get(file);
  if (cached !== undefined) return cached;

  const sf = parse(file);
  const names = new Set<string>();
  let opaque = false;

  const hasExportModifier = (node: ts.Node): boolean =>
    !!(ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));

  const hasDefaultModifier = (node: ts.Node): boolean =>
    !!(ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword));

  for (const statement of sf.statements) {
    // export default <expr>;
    if (ts.isExportAssignment(statement)) {
      names.add('default');
      continue;
    }

    // export { a, b as c } [from './x'];  |  export * from './x';  |  export * as ns from './x'
    if (ts.isExportDeclaration(statement)) {
      const spec = statement.moduleSpecifier;
      const specText =
        spec && ts.isStringLiteral(spec) ? spec.text : null;

      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const el of statement.exportClause.elements) names.add(el.name.text);
        continue;
      }

      if (statement.exportClause && ts.isNamespaceExport(statement.exportClause)) {
        names.add(statement.exportClause.name.text);
        continue;
      }

      // `export * from '...'`
      if (specText) {
        if (specText.startsWith('.')) {
          const target = resolveRelative(file, specText);
          if (!target) {
            opaque = true;
            continue;
          }
          const inherited = exportedNames(target, seen);
          if (inherited === null) {
            opaque = true;
            continue;
          }
          inherited.forEach(n => n !== 'default' && names.add(n));
        } else {
          // star-re-export from a package: unknowable here
          opaque = true;
        }
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;

    if (hasDefaultModifier(statement)) {
      names.add('default');
      // `export default class Foo` also exports nothing else
    }

    if (
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      const name = (statement as { name?: ts.Node }).name;
      if (name && ts.isIdentifier(name as ts.Node)) names.add((name as ts.Identifier).text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        collectBindingNames(decl.name, names);
      }
    }
  }

  const result = opaque ? null : names;
  exportCache.set(file, result);
  return result;
}

function collectBindingNames(name: ts.BindingName, into: Set<string>): void {
  if (ts.isIdentifier(name)) {
    into.add(name.text);
    return;
  }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const el of name.elements) {
      if (ts.isBindingElement(el)) collectBindingNames(el.name, into);
    }
  }
}

interface Violation {
  file: string;
  line: number;
  specifier: string;
  imported: string;
  available: string[];
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];

  for (const dir of SCANNED_DIRS) {
    for (const file of walk(path.join(PROJECT_ROOT, dir))) {
      const sf = parse(file);

      for (const statement of sf.statements) {
        if (!ts.isImportDeclaration(statement)) continue;
        if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

        const specifier = statement.moduleSpecifier.text;
        if (!specifier.startsWith('.')) continue; // packages are out of scope

        const clause = statement.importClause;
        if (!clause) continue; // side-effect import
        if (clause.isTypeOnly) continue; // erased before runtime

        const target = resolveRelative(file, specifier);
        if (!target) continue; // asset / unresolvable: not this test's business

        const available = exportedNames(target);
        if (available === null) continue; // module is opaque, cannot judge

        const wanted: string[] = [];
        if (clause.name) wanted.push('default');
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const el of clause.namedBindings.elements) {
            if (el.isTypeOnly) continue;
            wanted.push((el.propertyName ?? el.name).text);
          }
        }
        // `import * as ns` always succeeds

        for (const name of wanted) {
          if (available.has(name)) continue;
          const { line } = sf.getLineAndCharacterOfPosition(statement.getStart(sf));
          violations.push({
            file: path.relative(PROJECT_ROOT, file).split(path.sep).join('/'),
            line: line + 1,
            specifier,
            imported: name,
            available: [...available].sort(),
          });
        }
      }
    }
  }

  return violations;
}

describe('no phantom imports (issues #43 / #71 / #73)', () => {
  const violations = collectViolations();

  it('every relative import names a binding the target module actually exports', () => {
    const report = violations
      .map(
        v =>
          `${v.file}:${v.line} imports ${v.imported === 'default' ? 'default' : `{ ${v.imported} }`}` +
          ` from '${v.specifier}', which does not export it.` +
          (v.available.length ? ` Exports: ${v.available.slice(0, 12).join(', ')}` : ' It exports nothing.')
      )
      .join('\n');

    expect(report).toBe('');
  });

  it('recognises a module that has no default export (self-check)', () => {
    // Guards the detector itself: RefereeAssignmentsService is the #73 case and
    // must keep having no default export, otherwise this test proves nothing.
    const target = path.join(PROJECT_ROOT, 'services', 'RefereeAssignmentsService.ts');
    const exports = exportedNames(target);
    expect(exports).not.toBeNull();
    expect(exports!.has('RefereeAssignmentsService')).toBe(true);
    expect(exports!.has('default')).toBe(false);
  });
});
