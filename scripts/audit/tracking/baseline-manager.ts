/**
 * Frozen Baseline Manager
 * Feature: 002-production-refactoring — issue #42 (AC7)
 *
 * WHY THIS EXISTS
 * ---------------
 * The audit inherits thousands of pre-existing findings (~2.7k TypeScript
 * errors, ~380 ESLint errors). Two obvious options are both wrong:
 *
 *   a) Classify them low enough that they never block — that is exactly the bug
 *      #42 is about (`typescript-error` was mapped to Medium "for deployment
 *      flexibility", which made the gate structurally incapable of blocking).
 *   b) Block on all of them — nobody could commit anything, and the hooks would
 *      be bypassed with --no-verify within a day, which is the same as having
 *      no gate at all.
 *
 * So findings are classified honestly (TypeScript errors are High again) and the
 * *gate* is what tolerates history: the known backlog is frozen into
 * `.audit-baseline.json`, and only findings in excess of that budget — i.e.
 * regressions — fail the build. The backlog can then only shrink: the baseline
 * is regenerated with `npm run audit:baseline`, and since it is committed, any
 * increase is visible in the diff and reviewable.
 *
 * BUDGET GRANULARITY
 * ------------------
 * The budget is a count per (file, finding type), not a set of finding IDs.
 * Finding IDs hash the line number, so adding one line at the top of a file
 * would invalidate every ID below it and report hundreds of phantom
 * regressions. A per-file/per-type count is insensitive to line shifts while
 * still catching "this file got worse" and "this new file is broken".
 */

import * as fs from 'fs/promises';
import { Finding, Severity } from '../types';
import { AUDIT_CONFIG, getBaselinePath } from '../config';

/** Current on-disk format version */
export const BASELINE_VERSION = 1;

export interface AuditBaseline {
  version: number;

  /** ISO timestamp of when the baseline was generated */
  generatedAt: string;

  /** Checker ids the baseline was generated from — a baseline is only valid for these */
  checkers: string[];

  /** Severity levels the baseline covers */
  severities: string[];

  /** Human note explaining the file */
  note: string;

  /** Budget: "<file>::<findingType>" -> number of tolerated findings */
  budgets: Record<string, number>;

  /** Total tolerated findings (sum of budgets), for quick reading */
  total: number;
}

/**
 * Budget key for a finding. Line number deliberately excluded.
 */
export function budgetKey(finding: Finding): string {
  return `${finding.file.replace(/\\/g, '/')}::${finding.type}`;
}

/**
 * Build a baseline document from a set of findings.
 *
 * @param findings - The blocking-severity findings to freeze
 * @param checkers - Checker ids that produced them
 * @param failOnSeverities - Severities considered blocking
 */
export function buildBaseline(
  findings: Finding[],
  checkers: string[],
  failOnSeverities: Severity[]
): AuditBaseline {
  const budgets: Record<string, number> = {};

  for (const finding of findings) {
    const key = budgetKey(finding);
    budgets[key] = (budgets[key] ?? 0) + 1;
  }

  const sortedBudgets: Record<string, number> = {};
  for (const key of Object.keys(budgets).sort()) {
    sortedBudgets[key] = budgets[key]!;
  }

  return {
    version: BASELINE_VERSION,
    generatedAt: new Date().toISOString(),
    checkers: [...checkers].sort(),
    severities: failOnSeverities.map((s) => s.toString()),
    note:
      'Frozen backlog of pre-existing blocking findings (issue #42). ' +
      'The audit gate blocks only on findings IN EXCESS of these per-file/per-type counts. ' +
      'Regenerate with `npm run audit:baseline`. This number should only ever go down.',
    budgets: sortedBudgets,
    total: findings.length,
  };
}

/**
 * Load the frozen baseline. Returns null when no baseline exists yet.
 * A malformed or wrong-version baseline is an error, not a silent fallback —
 * silently treating it as "no baseline" would either block everything or
 * tolerate everything, and both are the kind of dishonesty #42 is about.
 */
export async function loadBaseline(): Promise<AuditBaseline | null> {
  const baselinePath = getBaselinePath();

  let raw: string;
  try {
    raw = await fs.readFile(baselinePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let parsed: AuditBaseline;
  try {
    parsed = JSON.parse(raw) as AuditBaseline;
  } catch (error) {
    throw new Error(
      `Audit baseline at ${AUDIT_CONFIG.baselineFile} is not valid JSON: ${(error as Error).message}`
    );
  }

  if (parsed.version !== BASELINE_VERSION) {
    throw new Error(
      `Audit baseline at ${AUDIT_CONFIG.baselineFile} has version ${parsed.version}, expected ${BASELINE_VERSION}. Regenerate it with \`npm run audit:baseline\`.`
    );
  }

  if (!parsed.budgets || typeof parsed.budgets !== 'object') {
    throw new Error(
      `Audit baseline at ${AUDIT_CONFIG.baselineFile} has no "budgets" object.`
    );
  }

  return parsed;
}

/**
 * Persist a baseline document.
 */
export async function saveBaseline(baseline: AuditBaseline): Promise<string> {
  const baselinePath = getBaselinePath();
  await fs.writeFile(
    baselinePath,
    JSON.stringify(baseline, null, 2) + '\n',
    'utf-8'
  );
  return baselinePath;
}

export interface RegressionSplit {
  /** Findings in excess of the frozen budget — these fail the build */
  regressions: Finding[];

  /** Findings covered by the frozen budget — reported but not blocking */
  baselined: Finding[];
}

/**
 * Split blocking findings into "already known" and "regression".
 *
 * @param blockingFindings - Findings at a blocking severity
 * @param baseline - Frozen baseline, or null when none exists (everything is then a regression)
 */
export function splitRegressions(
  blockingFindings: Finding[],
  baseline: AuditBaseline | null
): RegressionSplit {
  if (!baseline) {
    return { regressions: [...blockingFindings], baselined: [] };
  }

  const remaining = new Map<string, number>(Object.entries(baseline.budgets));
  const regressions: Finding[] = [];
  const baselined: Finding[] = [];

  // Stable order so the same run always designates the same findings as
  // regressions when a file's count grows.
  const ordered = [...blockingFindings].sort((a, b) => {
    const byFile = a.file.localeCompare(b.file);
    if (byFile !== 0) return byFile;
    const byType = a.type.localeCompare(b.type);
    if (byType !== 0) return byType;
    return (a.line ?? 0) - (b.line ?? 0);
  });

  for (const finding of ordered) {
    const key = budgetKey(finding);
    const budget = remaining.get(key) ?? 0;

    if (budget > 0) {
      remaining.set(key, budget - 1);
      baselined.push(finding);
    } else {
      regressions.push(finding);
    }
  }

  return { regressions, baselined };
}
