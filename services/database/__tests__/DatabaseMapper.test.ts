/**
 * DatabaseMapper — la conversione VIS ↔ database (issue #109).
 *
 * Queste otto funzioni sono il confine fra il dominio e le tabelle: tutto cio'
 * che entra nel database e tutto cio' che ne esce ci passa. Fino alla #109 non
 * avevano **nessun test**, mentre esisteva un file di 507 righe intitolato
 * "VIS-to-Database Sync Integration" che non le nominava nemmeno — asseriva su
 * oggetti letterali definiti in cima a se' stesso. E' stato sostituito da
 * questo.
 *
 * Il criterio qui e' il ROUND-TRIP: `dominio -> db -> dominio` deve restituire
 * cio' da cui si e' partiti, e dove non lo fa il test dice *cosa* si perde,
 * invece di asserire una versione addolcita del comportamento. Due perdite
 * sono documentate sotto e hanno una issue propria; non sono state "sistemate"
 * allargando l'assert.
 */

import {
  extractYearFromMatch,
  extractYearFromTournament,
  mapDbToMatch,
  mapDbToRefereeAssignment,
  mapDbToTournament,
  mapMatchToDb,
  mapRefereeAssignmentToDb,
  mapTournamentToDb,
} from '../DatabaseMapper';
import type { BeachMatchCore, RefereeAssignment } from '../../../types/match-v2';
import type { TournamentCore } from '../../../types/tournament-v2';
import type { DbMatch, DbTournament } from '../../../types/database';

const partita = (override: Partial<BeachMatchCore> = {}): BeachMatchCore =>
  ({
    id: 'match:111111',
    visNo: '111111',
    version: 1,
    lastUpdated: '2025-06-03T08:00:00Z',
    tournamentId: 'FIVB2025',
    matchCode: '111111',
    round: 'Round 1',
    phaseCode: 'R1',
    status: 'Scheduled',
    court: { number: '1', name: 'Court 1' },
    scheduledDateTime: '2025-06-03T10:00:00Z',
    team1: { name: 'Team A', federation: 'BRA', players: [] },
    team2: { name: 'Team B', federation: 'ITA', players: [] },
    ...override,
  }) as BeachMatchCore;

const torneo = (override: Partial<TournamentCore> = {}): TournamentCore =>
  ({
    id: 'tournament:12345',
    visNo: '12345',
    version: 1,
    lastUpdated: '2025-01-09T10:00:00Z',
    code: 'FIVB2025',
    name: 'FIVB World Tour 2025',
    gender: 'M',
    tournamentType: 'FIVB',
    dates: { startDate: '2025-06-01', endDate: '2025-06-07' },
    status: 'Scheduled',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    countryCode: 'BRA',
    ...override,
  }) as TournamentCore;

describe('DatabaseMapper', () => {
  describe('torneo: dominio -> db -> dominio', () => {
    it('conserva i campi che identificano il torneo', () => {
      const partenza = torneo();

      const riga = mapTournamentToDb(partenza);
      const ritorno = mapDbToTournament({
        ...riga,
        id: 1,
        created_at: '2025-01-09T10:00:00Z',
        updated_at: '2025-01-09T10:00:00Z',
      } as DbTournament);

      expect(ritorno.visNo).toBe(partenza.visNo);
      expect(ritorno.code).toBe(partenza.code);
      expect(ritorno.name).toBe(partenza.name);
      expect(ritorno.gender).toBe(partenza.gender);
      expect(ritorno.city).toBe(partenza.city);
      expect(ritorno.country).toBe(partenza.country);
      expect(ritorno.countryCode).toBe(partenza.countryCode);
      expect(ritorno.dates).toEqual(partenza.dates);
    });

    it('deriva id e title invece di inventarli', () => {
      const ritorno = mapDbToTournament({
        vis_no: '12345',
        code: 'FIVB2025',
        name: 'FIVB World Tour 2025',
        start_date: '2025-06-01',
        end_date: '2025-06-07',
        updated_at: '2025-01-09T10:00:00Z',
      } as DbTournament);

      expect(ritorno.id).toBe('tournament:12345');
      expect(ritorno.title).toBe('FIVB World Tour 2025');
      expect(ritorno.location).toBe(ritorno.city);
    });

    it('sostituisce i campi assenti con un default dichiarato, non con undefined', () => {
      const ritorno = mapDbToTournament({
        vis_no: '999',
        name: 'Torneo senza dettagli',
        start_date: '2025-06-01',
        end_date: '2025-06-07',
        updated_at: '2025-01-09T10:00:00Z',
      } as DbTournament);

      expect(ritorno.code).toBe('');
      expect(ritorno.gender).toBe('M');
      expect(ritorno.tournamentType).toBe('World Tour');
      expect(ritorno.status).toBe('Scheduled');
    });
  });

  describe('partita: dominio -> db -> dominio', () => {
    it('conserva identificativi, squadre e orario', () => {
      const partenza = partita();

      const riga = mapMatchToDb(partenza, 42);
      const ritorno = mapDbToMatch({
        ...riga,
        id: 1,
        created_at: '2025-06-03T08:00:00Z',
        updated_at: '2025-06-03T08:00:00Z',
      } as DbMatch);

      expect(ritorno.visNo).toBe(partenza.visNo);
      expect(ritorno.tournamentId).toBe(partenza.tournamentId);
      expect(ritorno.round).toBe(partenza.round);
      expect(ritorno.status).toBe(partenza.status);
      expect(ritorno.scheduledDateTime).toBe(partenza.scheduledDateTime);
      expect(ritorno.team1.name).toBe(partenza.team1.name);
      expect(ritorno.team2.name).toBe(partenza.team2.name);
      expect(ritorno.team1.federation).toBe(partenza.team1.federation);
      expect(ritorno.team2.federation).toBe(partenza.team2.federation);
    });

    it('scrive il codice torneo con l anno in coda, e lo rimuove al ritorno', () => {
      // Il suffisso esiste per il "João Pessoa bug": lo stesso codice torneo
      // viene riusato in stagioni diverse, e senza anno le partite di anni
      // diversi finiscono nello stesso gruppo.
      const riga = mapMatchToDb(partita({ scheduledDateTime: '2025-06-03T10:00:00Z' }), 42);
      expect(riga.tournament_code).toBe('FIVB2025_2025');

      const ritorno = mapDbToMatch({ ...riga, id: 1, updated_at: '' } as DbMatch);
      expect(ritorno.tournamentId).toBe('FIVB2025');
    });

    it('ricostruisce i set numerandoli, e conserva i punteggi', () => {
      const conRisultato = partita({
        result: {
          sets: [
            { setNumber: 1, team1Score: 21, team2Score: 19 },
            { setNumber: 2, team1Score: 21, team2Score: 17 },
          ],
        },
      } as Partial<BeachMatchCore>);

      const riga = mapMatchToDb(conRisultato, 42);
      expect(riga.sets).toEqual([
        { a: 21, b: 19 },
        { a: 21, b: 17 },
      ]);

      const ritorno = mapDbToMatch({ ...riga, id: 1, updated_at: '' } as DbMatch);
      expect(ritorno.result?.sets).toEqual([
        { setNumber: 1, team1Score: 21, team2Score: 19 },
        { setNumber: 2, team1Score: 21, team2Score: 17 },
      ]);
    });

    it('non inventa un risultato per una partita non giocata', () => {
      const riga = mapMatchToDb(partita(), 42);
      const ritorno = mapDbToMatch({ ...riga, id: 1, updated_at: '' } as DbMatch);

      expect(ritorno.result).toBeUndefined();
    });

    it('dichiara il campo pubblicato solo quando un campo c e davvero', () => {
      const con = mapMatchToDb(partita(), 42);
      expect(con.are_court_and_time_published).toBe(true);

      const senza = mapMatchToDb(partita({ court: undefined }), 42);
      expect(senza.are_court_and_time_published).toBe(false);
      expect(senza.court).toBeUndefined();
    });
  });

  // ── Le due perdite del round-trip ────────────────────────────────────────
  //
  // Documentate, non addolcite. Il test asserisce quello che il codice fa
  // OGGI: se qualcuno lo ripara, questi test diventano rossi ed e' il segnale
  // giusto — vanno aggiornati insieme al fix, non prima.

  describe('cosa il round-trip perde per strada', () => {
    it('collassa numero e nome del campo in un unico valore', () => {
      // `mapMatchToDb` scrive una colonna sola (`court`), preferendo il nome;
      // `mapDbToMatch` la rilegge dentro ENTRAMBI i campi. Un campo con
      // numero "1" e nome "Center Court" torna indietro con numero
      // "Center Court".
      const riga = mapMatchToDb(partita({ court: { number: '1', name: 'Center Court' } }), 42);
      expect(riga.court).toBe('Center Court');

      const ritorno = mapDbToMatch({ ...riga, id: 1, updated_at: '' } as DbMatch);
      expect(ritorno.court?.name).toBe('Center Court');
      expect(ritorno.court?.number).toBe('Center Court'); // era '1'
    });

    it('tronca il codice torneo al primo underscore', () => {
      // Il ritorno fa `split('_')[0]`, quindi un codice che contiene gia' un
      // underscore non sopravvive al giro.
      const riga = mapMatchToDb(partita({ tournamentId: 'FIVB_WT_2025' }), 42);
      expect(riga.tournament_code).toBe('FIVB_WT_2025_2025');

      const ritorno = mapDbToMatch({ ...riga, id: 1, updated_at: '' } as DbMatch);
      expect(ritorno.tournamentId).toBe('FIVB'); // era 'FIVB_WT_2025'
    });

    it('non riporta indietro i giocatori', () => {
      const riga = mapMatchToDb(partita(), 42);
      const ritorno = mapDbToMatch({ ...riga, id: 1, updated_at: '' } as DbMatch);

      // `mapDbToMatch` li lascia vuoti di proposito (vanno caricati a parte),
      // ed e' segnato con un TODO nel sorgente.
      expect(ritorno.team1.players).toEqual([]);
      expect(ritorno.team2.players).toEqual([]);
    });
  });

  describe('assegnazione arbitro', () => {
    it.each([
      ['1st Referee', 'FIRST'],
      ['2nd', 'SECOND'],
      ['Second Referee', 'SECOND'],
      ['Challenge Referee', 'CHALLENGE'],
    ])('riconosce il ruolo %s come %s', (ruolo, atteso) => {
      const riga = mapRefereeAssignmentToDb(1, 2, { role: ruolo } as RefereeAssignment);
      expect(riga.role).toBe(atteso);
    });

    it('ricade su FIRST quando il ruolo non e riconoscibile', () => {
      // Comportamento attuale, e vale la pena saperlo: un ruolo scritto in un
      // modo non previsto non viene segnalato, diventa un primo arbitro.
      const riga = mapRefereeAssignmentToDb(1, 2, { role: 'Referee 2' } as RefereeAssignment);
      expect(riga.role).toBe('FIRST');
    });

    it('compone il nome dai dati dell arbitro, e dichiara quando non li ha', () => {
      const conDati = mapDbToRefereeAssignment(
        { match_id: 1, referee_id: 77, role: 'FIRST' },
        { first_name: 'Jonathan', last_name: 'Lamprecht', federation_code: 'GER' }
      );
      expect(conDati.name).toBe('Jonathan Lamprecht');
      expect(conDati.visNo).toBe('77');
      expect(conDati.federation).toBe('GER');

      const senzaDati = mapDbToRefereeAssignment({ match_id: 1, referee_id: 77, role: 'FIRST' });
      expect(senzaDati.name).toBe('Unknown');
    });
  });

  describe('estrazione dell anno', () => {
    // L'anno serve al raggruppamento per stagione (il "João Pessoa bug"), non
    // e' un dettaglio di visualizzazione: sbagliarlo mette le partite nel
    // torneo dell'anno prima.
    it('legge l anno dalla data di inizio del torneo', () => {
      expect(extractYearFromTournament(torneo({ dates: { startDate: '2025-06-01', endDate: '2025-06-07' } }))).toBe(2025);
    });

    it('legge l anno dalla data della partita', () => {
      expect(extractYearFromMatch(partita({ scheduledDateTime: '2025-06-03T10:00:00Z' }))).toBe(2025);
    });

    it('legge l anno di una partita di fine dicembre', () => {
      expect(extractYearFromMatch(partita({ scheduledDateTime: '2025-12-31T12:00:00Z' }))).toBe(2025);
    });
  });
});
