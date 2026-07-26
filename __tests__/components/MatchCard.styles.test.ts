/**
 * Issue #73, defect 4 — `MatchCard` referenced three style keys that its
 * stylesheet never defined: `setScoreText`, `currentSetScoreText` and
 * `liveIndicatorText`.
 *
 * `StyleSheet.create` does not complain about a missing key: `styles.foo` is
 * `undefined`, React Native ignores it, and the element renders unstyled. The
 * set scores on every match card were therefore drawn with default text
 * styling and the current set was not visually distinguishable — a silent
 * visual defect that only `tsc` was reporting.
 *
 * The mirror image was also true: `setScore` and `currentSetScore` *are* text
 * styles (fontSize/fontWeight/color) but were applied to a `View`.
 *
 * This test reads the file and checks every `styles.X` reference resolves to a
 * key in the `StyleSheet.create({...})` literal. It fails on `master` with the
 * three names above.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const FILE = path.resolve(__dirname, '..', '..', 'components', 'entities', 'Match', 'MatchCard.tsx');

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

/** Keys of every `StyleSheet.create({ ... })` object literal in the file. */
function definedStyleKeys(sf: ts.SourceFile): Set<string> {
  const keys = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'create' &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'StyleSheet' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      for (const prop of (node.arguments[0] as ts.ObjectLiteralExpression).properties) {
        const name = prop.name;
        if (!name) continue;
        if (ts.isIdentifier(name)) keys.add(name.text);
        else if (ts.isStringLiteral(name)) keys.add(name.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return keys;
}

/** Every `styles.X` read in the file, with its line number. */
function referencedStyleKeys(sf: ts.SourceFile): { name: string; line: number }[] {
  const refs: { name: string; line: number }[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'styles'
    ) {
      refs.push({
        name: node.name.text,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return refs;
}

describe('MatchCard stylesheet (issue #73)', () => {
  const sf = parse(FILE);
  const defined = definedStyleKeys(sf);
  const referenced = referencedStyleKeys(sf);

  it('has a non-trivial stylesheet and actually uses it (self-check)', () => {
    expect(defined.size).toBeGreaterThan(50);
    expect(referenced.length).toBeGreaterThan(50);
  });

  it('every styles.X it reads is defined in its StyleSheet', () => {
    const missing = referenced
      .filter(r => !defined.has(r.name))
      .map(r => `MatchCard.tsx:${r.line} → styles.${r.name}`);

    expect(missing).toEqual([]);
  });
});
