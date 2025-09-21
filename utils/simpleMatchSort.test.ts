import { compareWithinDay } from './simpleMatchSort';

const m = (id: string, t: number, gender: 'M'|'W'|'X'='M') => ({
  id, scheduledEpoch: t, gender
});

describe('compareWithinDay', () => {
  test('ordina per tempo crescente indipendentemente da sortOrder', () => {
    const a = m('a', 8 * 3600_000);   // 08:00
    const b = m('b', 9.5 * 3600_000); // 09:30
    const c = m('c', 11 * 3600_000);  // 11:00

    const arr = [c, a, b].sort(compareWithinDay);
    expect(arr.map(x => x.id)).toEqual(['a', 'b', 'c']);
  });

  test('fallback: se tempo uguale, ordina per gender M < W < X', () => {
    const t = 10 * 3600_000;
    const x = m('x', t, 'X');
    const w = m('w', t, 'W');
    const male = m('m', t, 'M');

    const arr = [x, male, w].sort(compareWithinDay);
    expect(arr.map(x => x.id)).toEqual(['m', 'w', 'x']);
  });

  test('fallback: se manca tempo, non spostare chi ha tempo definito', () => {
    const withTime = m('t', 12 * 3600_000, 'M');
    const noTime = { id: 'n', gender: 'W' as const };

    const arr = [noTime, withTime].sort(compareWithinDay);
    expect(arr[0].id).toBe('t');
  });

  test('tie-breaker stabile su id', () => {
    const t = 10 * 3600_000;
    const a = m('a', t, 'M');
    const b = m('b', t, 'M');

    const arr = [b, a].sort(compareWithinDay);
    expect(arr.map(x => x.id)).toEqual(['a', 'b']);
  });
});