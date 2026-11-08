import { readFileSync } from 'fs';
import { resolve } from 'path';
import { categoryLabel, shortCategoryLabel, phaseLabel, invitationReasonLabel } from '../../utils/englishLabels';

const migration = (name: string) => readFileSync(resolve(__dirname, '../../supabase/migrations', name), 'utf8');

describe('English database presentation contracts', () => {
  it('covers the category vocabulary emitted by the current database migration', () => {
    const rawCategories = [...migration('033_world_tour.sql').matchAll(/WHEN '\d+'\s+THEN '([^']+)'/g)]
      .map(match => match[1]!);
    expect(rawCategories.length).toBeGreaterThan(30);
    const labels = rawCategories.map(categoryLabel);
    expect(labels.every(label => typeof label === 'string' && label.length > 0)).toBe(true);
    expect(labels.join(' ')).not.toMatch(/Giochi|Campionati|Qualificazione|Mondiali|Zonale|nazionale|formazione|stelle|stella/);
    expect(labels).toContain('Olympic Games');
    for (let stars = 1; stars <= 5; stars++) {
      expect(labels).toContain(`World Tour ${stars} ${stars === 1 ? 'star' : 'stars'}`);
    }
  });

  it('keeps proper names, future categories and raw grouping keys intact', () => {
    const rows = [{ category: 'Giochi Olimpici', matches: 2 }, { category: 'BPT Elite16', matches: 3 }];
    const displayed = rows.map(row => ({ ...row, label: categoryLabel(row.category) }));
    expect(displayed.map(row => row.category)).toEqual(['Giochi Olimpici', 'BPT Elite16']);
    expect(displayed.map(row => row.label)).toEqual(['Olympic Games', 'BPT Elite16']);
    for (const value of ['Future tour', 'constructor', '__proto__']) {
      expect(categoryLabel(value)).toBe(value);
    }
    expect(categoryLabel(null)).toBe('Other');
    expect(categoryLabel(undefined)).toBe('Other');
  });

  it('uses compact English headings for narrow category columns', () => {
    expect(shortCategoryLabel('Mondiali U21')).toBe('U21 World Champs');
    expect(shortCategoryLabel('Qualificazione olimpica')).toBe('Olympic Qual.');
    expect(shortCategoryLabel('BPT Elite16')).toBe('Elite16');
  });

  it('covers the phase vocabulary emitted by the current database migration', () => {
    const sqlFunction = migration('036_fase_normalizzata.sql').split('AS $$')[1]!.split('$$;')[0]!;
    const rawPhases = [...new Set([...sqlFunction.matchAll(/(?:THEN|ELSE) '([^']+)'/g)].map(match => match[1]!))];
    expect(rawPhases.length).toBeGreaterThan(10);
    for (const raw of rawPhases) {
      const displayed = phaseLabel(raw);
      expect(typeof displayed).toBe('string');
      expect(displayed.length).toBeGreaterThan(0);
      // Pool is already English; every other current schema phase needs translation.
      if (raw !== 'Pool') expect(displayed).not.toBe(raw);
    }
    expect(phaseLabel('Finale 3o posto')).toBe('Bronze medal match');
  });

  it('preserves incoming English VIS rounds and handles missing or unknown rounds', () => {
    for (const value of ['Pool A', 'Future round', 'constructor', '__proto__']) {
      expect(phaseLabel(value)).toBe(value);
    }
    expect(phaseLabel(null)).toBe('—');
    expect(phaseLabel(undefined)).toBe('—');
    expect(phaseLabel('Senza fase')).toBe('No round');
  });
});

describe('English invitation result contracts', () => {
  it('covers every reason returned by the invitation RPC without changing its raw values', () => {
    const reasons = [...migration('028_accesso_riservato.sql').matchAll(/ok := (true|false); reason := '([^']+)'/g)];
    expect(reasons.length).toBeGreaterThan(5);
    const unknown = invitationReasonLabel(undefined);
    for (const [, ok, raw] of reasons) {
      const displayed = invitationReasonLabel(raw);
      expect(displayed).not.toBe(raw);
      expect(displayed).not.toBe(unknown);
      expect(displayed).toMatch(ok === 'true' ? /registered/i : /code|sign in/i);
    }
  });

  it('uses a generic English fallback for missing, future and inherited-property results', () => {
    for (const raw of [null, undefined, '', 'future database error', 'constructor', '__proto__']) {
      expect(invitationReasonLabel(raw)).toBe('Unable to verify the invitation code. Please try again.');
    }
  });
});
