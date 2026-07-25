/**
 * Audit runner gate tests
 * Issue #42 (AC10)
 *
 * These are the regression tests for the bug that made the whole audit system
 * untrustworthy: a checker that failed produced the same output as a checker
 * that found nothing, and the run exited 0.
 *
 * Covered:
 *  - checker that fails               -> ERROR (exit 2)
 *  - checker with blocking findings   -> FAIL  (exit 1)
 *  - everything clean                 -> PASS  (exit 0)
 *  - ERROR wins over findings, and over --fail-on
 *  - baseline absorbs the known backlog but not regressions
 *  - the checker roster is complete and reports what is NOT running
 */

import {
  CheckerResult,
  CheckerStatus,
  AuditStatus,
  Finding,
  FindingType,
  FindingStatus,
  Severity,
} from '../../../scripts/audit/types';
import {
  evaluateGate,
  resolveRoster,
  createCheckers,
  allCheckerIds,
  filterBlockingFindings,
  parseCliArgs,
} from '../../../scripts/audit/run-audit';
import {
  buildBaseline,
  splitRegressions,
  budgetKey,
} from '../../../scripts/audit/tracking/baseline-manager';
import { ExitCode } from '../../../scripts/audit/utils/exit-code-manager';

// --- helpers ---------------------------------------------------------------

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: overrides.id ?? Math.random().toString(16).slice(2, 18),
    type: overrides.type ?? FindingType.TYPESCRIPT_ERROR,
    severity: overrides.severity ?? Severity.HIGH,
    message: overrides.message ?? 'Type error',
    file: overrides.file ?? 'services/Foo.ts',
    line: overrides.line ?? 1,
    status: overrides.status ?? FindingStatus.EXISTING,
    requiresManualReview: overrides.requiresManualReview ?? false,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
  };
}

function okChecker(id: string, findingCount = 0): CheckerResult {
  return {
    checkerId: id,
    checkerName: `${id} checker`,
    status: CheckerStatus.SUCCESS,
    durationMs: 1,
    findingCount,
  };
}

function brokenChecker(id: string, message = 'boom'): CheckerResult {
  return {
    checkerId: id,
    checkerName: `${id} checker`,
    status: CheckerStatus.ERROR,
    durationMs: 1,
    findingCount: 0,
    errorMessage: message,
  };
}

// --- the three states ------------------------------------------------------

describe('audit gate — PASS / FAIL / ERROR are distinct (AC2)', () => {
  it('returns PASS when every checker ran and nothing blocking was found', () => {
    const result = evaluateGate([], [okChecker('eslint')], null, {});

    expect(result.exitCode).toBe(ExitCode.PASS);
    expect(result.overallStatus).toBe(AuditStatus.PASS);
    expect(result.gate.regressionCount).toBe(0);
  });

  it('returns FAIL when a checker reports blocking findings', () => {
    const findings = [makeFinding({ severity: Severity.HIGH })];

    const result = evaluateGate(findings, [okChecker('eslint', 1)], null, {});

    expect(result.exitCode).toBe(ExitCode.FAIL);
    expect(result.overallStatus).toBe(AuditStatus.FAIL);
    expect(result.gate.regressionCount).toBe(1);
  });

  it('returns ERROR when a checker could not run (AC1)', () => {
    const result = evaluateGate([], [okChecker('typescript'), brokenChecker('eslint')], null, {});

    expect(result.exitCode).toBe(ExitCode.ERROR);
    expect(result.overallStatus).toBe(AuditStatus.ERROR);
  });

  it('never reports ERROR as PASS, even with zero findings', () => {
    const result = evaluateGate([], [brokenChecker('complexity')], null, {});

    expect(result.overallStatus).not.toBe(AuditStatus.PASS);
    expect(result.exitCode).not.toBe(ExitCode.PASS);
  });

  it('ERROR wins over --fail-on (the audit:ci escape hatch that used to exit 0)', () => {
    // audit:ci passes --fail-on=critical,high. Before #42 this routed around the
    // checker-error branch entirely, so a crashed checker still exited 0.
    const result = evaluateGate([], [brokenChecker('eslint')], null, {
      ci: true,
      failOn: 'critical,high',
    });

    expect(result.exitCode).toBe(ExitCode.ERROR);
    expect(result.overallStatus).toBe(AuditStatus.ERROR);
  });

  it('ERROR wins over blocking findings', () => {
    const findings = [makeFinding({ severity: Severity.CRITICAL })];

    const result = evaluateGate(findings, [brokenChecker('security')], null, {});

    expect(result.exitCode).toBe(ExitCode.ERROR);
  });

  it('honours custom --fail-on levels', () => {
    const findings = [makeFinding({ severity: Severity.MEDIUM })];

    expect(evaluateGate(findings, [okChecker('x', 1)], null, {}).exitCode).toBe(
      ExitCode.PASS
    );
    expect(
      evaluateGate(findings, [okChecker('x', 1)], null, { failOn: 'medium' })
        .exitCode
    ).toBe(ExitCode.FAIL);
  });
});

// --- baseline gating -------------------------------------------------------

describe('audit gate — frozen baseline (AC7)', () => {
  const knownFindings = [
    makeFinding({ file: 'services/Foo.ts', line: 10 }),
    makeFinding({ file: 'services/Foo.ts', line: 20 }),
    makeFinding({ file: 'app/index.tsx', line: 5 }),
  ];

  const baseline = buildBaseline(knownFindings, allCheckerIds(), [
    Severity.CRITICAL,
    Severity.HIGH,
  ]);

  it('freezes the backlog per (file, finding type)', () => {
    expect(baseline.total).toBe(3);
    expect(baseline.budgets[budgetKey(knownFindings[0]!)]).toBe(2);
  });

  it('PASSes when the findings are exactly the frozen backlog', () => {
    const result = evaluateGate(knownFindings, [okChecker('typescript', 3)], baseline, {});

    expect(result.exitCode).toBe(ExitCode.PASS);
    expect(result.gate.blockingFindingCount).toBe(3);
    expect(result.gate.baselinedCount).toBe(3);
    expect(result.gate.regressionCount).toBe(0);
  });

  it('is insensitive to line shifts within a baselined file', () => {
    const shifted = knownFindings.map((f) => makeFinding({ ...f, line: (f.line ?? 0) + 40 }));

    expect(evaluateGate(shifted, [okChecker('typescript', 3)], baseline, {}).exitCode).toBe(
      ExitCode.PASS
    );
  });

  it('FAILs when a baselined file gets one more finding of the same type', () => {
    const worse = [...knownFindings, makeFinding({ file: 'services/Foo.ts', line: 99 })];

    const result = evaluateGate(worse, [okChecker('typescript', 4)], baseline, {});

    expect(result.exitCode).toBe(ExitCode.FAIL);
    expect(result.gate.regressionCount).toBe(1);
    expect(result.gate.baselinedCount).toBe(3);
  });

  it('FAILs when a brand new file has a blocking finding', () => {
    const worse = [...knownFindings, makeFinding({ file: 'services/Brand.ts', line: 1 })];

    expect(evaluateGate(worse, [okChecker('typescript', 4)], baseline, {}).exitCode).toBe(
      ExitCode.FAIL
    );
  });

  it('PASSes when findings are removed (the backlog may shrink freely)', () => {
    const better = [knownFindings[0]!];

    const result = evaluateGate(better, [okChecker('typescript', 1)], baseline, {});

    expect(result.exitCode).toBe(ExitCode.PASS);
    expect(result.gate.regressionCount).toBe(0);
  });

  it('--no-baseline gates on the absolute count instead', () => {
    const result = evaluateGate(knownFindings, [okChecker('typescript', 3)], baseline, {
      noBaseline: true,
    });

    expect(result.gate.mode).toBe('absolute');
    expect(result.exitCode).toBe(ExitCode.FAIL);
  });

  it('treats everything as a regression when no baseline exists', () => {
    const { regressions, baselined } = splitRegressions(knownFindings, null);

    expect(regressions).toHaveLength(3);
    expect(baselined).toHaveLength(0);
  });

  it('only counts blocking severities as blocking', () => {
    const mixed = [
      makeFinding({ severity: Severity.HIGH }),
      makeFinding({ severity: Severity.MEDIUM }),
      makeFinding({ severity: Severity.LOW }),
    ];

    expect(
      filterBlockingFindings(mixed, [Severity.CRITICAL, Severity.HIGH])
    ).toHaveLength(1);
  });
});

// --- checker roster --------------------------------------------------------

describe('checker roster — nothing is silently absent (AC5)', () => {
  it('knows all 9 checkers', () => {
    expect(allCheckerIds()).toEqual([
      'typescript',
      'eslint',
      'complexity',
      'security',
      'architecture',
      'error-handling',
      'performance',
      'data-flow',
      'build',
    ]);
  });

  it('runs every checker by default', () => {
    const roster = resolveRoster();

    expect(roster.requested).toHaveLength(9);
    expect(roster.skipped).toHaveLength(0);
    expect(createCheckers(roster)).toHaveLength(9);
  });

  it('includes the security scanner by default (it never ran before #42)', () => {
    expect(resolveRoster().requested).toContain('security');
  });

  it('reports which checkers are NOT running for a reduced preset', () => {
    const roster = resolveRoster('quality');

    expect(roster.requested).toEqual(['typescript', 'eslint', 'complexity']);
    expect(roster.skipped).toContain('security');
    expect(roster.skipped).toHaveLength(6);
  });

  it('flags unknown checker ids instead of silently dropping them', () => {
    const roster = resolveRoster('typescript,nope');

    expect(roster.requested).toEqual(['typescript']);
    expect(roster.unknown).toEqual(['nope']);
  });

  it('de-duplicates overlapping selections', () => {
    const roster = resolveRoster('quality,eslint,typescript');

    expect(roster.requested).toEqual(['typescript', 'eslint', 'complexity']);
  });

  it('every registered checker instantiates and exposes id + check()', () => {
    for (const checker of createCheckers(resolveRoster())) {
      expect(typeof checker.id).toBe('string');
      expect(typeof checker.name).toBe('string');
      expect(typeof checker.check).toBe('function');
    }
  });
});

// --- CLI parsing -----------------------------------------------------------

describe('CLI parsing for the new gate flags', () => {
  it('parses --update-baseline and --no-baseline', () => {
    expect(parseCliArgs(['--update-baseline']).updateBaseline).toBe(true);
    expect(parseCliArgs(['--no-baseline']).noBaseline).toBe(true);
  });

  it('parses the flags used by npm run audit:ci', () => {
    const args = parseCliArgs(['--ci', '--checks=all', '--fail-on=critical,high']);

    expect(args.ci).toBe(true);
    expect(args.checks).toBe('all');
    expect(args.failOn).toBe('critical,high');
  });
});
