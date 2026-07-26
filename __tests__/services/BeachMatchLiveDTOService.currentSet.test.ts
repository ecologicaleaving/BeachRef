/**
 * Issue #73, defect 3 — "the score of the set in progress never appears on
 * /match-detail".
 *
 * The screen read `liveData.currentSet` / `liveData.points`; the DTO declares
 * them at `score.currentSet` / `score.points`. Fixing the key alone would not
 * have shown anything, because **nothing ever assigned those two fields**: they
 * were declared on `BeachMatchLiveDTO` and populated by no code path. The set
 * in progress was therefore never identified — `/match-detail` pinned "(Live)"
 * to set 1 and never rendered `IN SET n`.
 *
 * `status.state` is the authority: the VIS status code maps to `InSet1..InSet5`.
 * These tests fail on `master`, where `deriveCurrentSet` does not exist and
 * `score.currentSet` is `undefined` for a running match.
 */

import { BeachMatchLiveDTOService } from '../../services/BeachMatchLiveDTOService';
import { createMinimalBeachMatchLiveDTO } from '../../types/beach-match-live-dto';
import type { BeachMatchLiveDTO } from '../../types/beach-match-live-dto';

function dtoInSet(state: string, sets: { setNo: number; home: number; away: number }[]): BeachMatchLiveDTO {
  const dto = createMinimalBeachMatchLiveDTO(1234) as BeachMatchLiveDTO;
  dto.status.state = state as BeachMatchLiveDTO['status']['state'];
  dto.score.sets = sets;
  return dto;
}

describe('BeachMatchLiveDTOService.deriveCurrentSet (issue #73)', () => {
  const service = BeachMatchLiveDTOService.getInstance();

  it('identifies the set in progress from the match status', () => {
    const dto = dtoInSet('InSet2', [
      { setNo: 1, home: 21, away: 18 },
      { setNo: 2, home: 12, away: 9 },
    ]);

    service.deriveCurrentSet(dto);

    expect(dto.score.currentSet).toBe(2);
  });

  it('exposes the running score of that set at score.points', () => {
    const dto = dtoInSet('InSet2', [
      { setNo: 1, home: 21, away: 18 },
      { setNo: 2, home: 12, away: 9 },
    ]);

    service.deriveCurrentSet(dto);

    expect(dto.score.points).toEqual({ home: 12, away: 9 });
  });

  it('handles a set that has started but is not yet in score.sets', () => {
    const dto = dtoInSet('InSet3', [
      { setNo: 1, home: 21, away: 18 },
      { setNo: 2, home: 19, away: 21 },
    ]);

    service.deriveCurrentSet(dto);

    expect(dto.score.currentSet).toBe(3);
    expect(dto.score.points).toBeNull();
  });

  it.each(['Scheduled', 'ReadyToStart', 'Finished', 'OfficialResult'])(
    'reports no current set when the match is %s',
    state => {
      const dto = dtoInSet(state, [
        { setNo: 1, home: 21, away: 18 },
        { setNo: 2, home: 21, away: 15 },
      ]);

      service.deriveCurrentSet(dto);

      expect(dto.score.currentSet).toBeUndefined();
      expect(dto.score.points).toBeNull();
    }
  );

  it.each([
    ['InSet1', 1],
    ['InSet2', 2],
    ['InSet3', 3],
  ])('maps %s to set %i', (state, expected) => {
    const dto = dtoInSet(state, []);
    service.deriveCurrentSet(dto);
    expect(dto.score.currentSet).toBe(expected);
  });
});
