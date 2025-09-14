/**
 * Fallback Tournament Service
 * Provides sample tournament data when VIS API is not accessible
 */

import { TournamentCore, TournamentType, GenderType, TournamentStatus, generateTournamentId } from '../types/tournament-v2';

export class FallbackTournamentService {
  static getSampleTournaments(): TournamentCore[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tournament1: TournamentCore = {
      id: generateTournamentId('1234', 'BWC2025', GenderType.MIXED, TournamentType.FIVB),
      visNo: '1234',
      version: 1,
      lastUpdated: now.toISOString(),
      name: 'FIVB Beach Volleyball World Championship 2025',
      code: 'BWC2025',
      gender: GenderType.MIXED,
      tournamentType: TournamentType.FIVB,
      status: TournamentStatus.UPCOMING,
      dates: {
        startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
        endDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // +14 days
      },
      city: 'Rio de Janeiro',
      country: 'Brazil',
      countryCode: 'BRA',
      venue: 'Copacabana Beach',
      NoEvent: '1234'
    };

    const tournament2: TournamentCore = {
      id: generateTournamentId('1235', 'HAM2025', GenderType.MIXED, TournamentType.BPT),
      visNo: '1235',
      version: 1,
      lastUpdated: now.toISOString(),
      name: 'Elite16 Hamburg 2025',
      code: 'HAM2025',
      gender: GenderType.MIXED,
      tournamentType: TournamentType.BPT,
      status: TournamentStatus.ACTIVE,
      dates: {
        startDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // -2 days (started)
        endDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // +2 days
      },
      city: 'Hamburg',
      country: 'Germany',
      countryCode: 'GER',
      venue: 'Hamburg Beach Court',
      NoEvent: '1235'
    };

    const tournament3: TournamentCore = {
      id: generateTournamentId('1236', 'VIE2024', GenderType.MIXED, TournamentType.BPT),
      visNo: '1236',
      version: 1,
      lastUpdated: now.toISOString(),
      name: 'Beach Pro Tour Vienna 2024',
      code: 'VIE2024',
      gender: GenderType.MIXED,
      tournamentType: TournamentType.BPT,
      status: TournamentStatus.COMPLETED,
      dates: {
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // -30 days
        endDate: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(), // -25 days
      },
      city: 'Vienna',
      country: 'Austria',
      countryCode: 'AUT',
      venue: 'Donauinsel Beach Arena',
      NoEvent: '1236'
    };

    const tournament4: TournamentCore = {
      id: generateTournamentId('1237', 'WBG2025', GenderType.MIXED, TournamentType.FIVB),
      visNo: '1237',
      version: 1,
      lastUpdated: now.toISOString(),
      name: 'World Beach Games 2025',
      code: 'WBG2025',
      gender: GenderType.MIXED,
      tournamentType: TournamentType.FIVB,
      status: TournamentStatus.UPCOMING,
      dates: {
        startDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), // +60 days
        endDate: new Date(today.getTime() + 67 * 24 * 60 * 60 * 1000).toISOString(), // +67 days
      },
      city: 'Bali',
      country: 'Indonesia',
      countryCode: 'IDN',
      venue: 'Bali Beach Complex',
      NoEvent: '1237'
    };

    return [tournament1, tournament2, tournament3, tournament4];
  }

  static async getTournaments(): Promise<TournamentCore[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.getSampleTournaments();
  }
}