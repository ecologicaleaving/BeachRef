/**
 * TournamentCodeResolver
 * Production-ready resolver to obtain database `tournament_code` from various inputs.
 * Resolution order:
 * 1) Explicit tournamentCode param
 * 2) Derive from passed matchData (first match's tournament_code)
 * 3) Lookup via Supabase (events/tournaments) using VIS NoEvent (visNo)
 *
 * Caches successful resolutions in-memory during app session to avoid repeated lookups.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TournamentContextInput {
  tournamentCode?: string | null;
  visNo?: string | null; // VIS NoEvent
  matchDataJson?: string | null; // JSON string of matches passed via navigation
}

export class TournamentCodeResolver {
  private static instance: TournamentCodeResolver | null = null;
  private cache = new Map<string, string>(); // key: visNo, value: tournament_code
  private supabase: SupabaseClient | null = null;

  private constructor() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      this.supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    }
  }

  public static getInstance(): TournamentCodeResolver {
    if (!TournamentCodeResolver.instance) {
      TournamentCodeResolver.instance = new TournamentCodeResolver();
    }
    return TournamentCodeResolver.instance;
  }

  /**
   * Resolve tournament_code using layered strategy.
   */
  async resolve(input: TournamentContextInput): Promise<string | null> {
    // Resolving tournament code
    // 1) Explicit code wins
    if (input.tournamentCode && input.tournamentCode.trim()) {
      // Using explicit tournament code
      return input.tournamentCode.trim();
    }

    // 2) Extract from match data if provided
    const codeFromMatches = this.extractFromMatches(input.matchDataJson);
    if (codeFromMatches) {
      // Extracted tournament code from matches
      return codeFromMatches;
    }

    // 3) Use VIS NoEvent to lookup in cache or DB
    const visNo = input.visNo?.trim();
    if (!visNo) return null;

    if (this.cache.has(visNo)) {
      const cached = this.cache.get(visNo)!;
      // Retrieved tournament code from cache
      return cached;
    }

    const code = await this.lookupInSupabase(visNo);
    if (code) this.cache.set(visNo, code);
    // Retrieved tournament code from database
    return code;
  }

  private extractFromMatches(matchDataJson?: string | null): string | null {
    if (!matchDataJson) return null;
    try {
      const matches = JSON.parse(matchDataJson);
      if (Array.isArray(matches) && matches.length > 0) {
        const first = matches.find((m: any) => m?.tournament_code) || matches[0];
        const code = first?.tournament_code || first?.tournamentCode;
        if (code && typeof code === 'string' && code.trim()) return code.trim();
      }
    } catch {
      // ignore malformed
    }
    return null;
  }

  /**
   * Supabase lookup strategies (anon safe, RLS must allow read):
   * - Try events table by vis_event_no to join tournaments
   * - Fallback: tournaments table by vis_tournament_no or direct code match
   */
  private async lookupInSupabase(visNo: string): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      // Strategy A: events table with vis_event_no linking to tournaments
      const { data: events, error } = await this.supabase
        .from('events')
        .select('tournaments(tournament_code), tournament_code, vis_event_no')
        .eq('vis_event_no', visNo)
        .limit(1)
        .maybeSingle();

      if (!error && events) {
        const code = (events as any).tournament_code || (events as any)?.tournaments?.tournament_code;
        if (code && typeof code === 'string') return code;
      }
    } catch {
      // ignore and try fallback
    }

    try {
      // Strategy B: tournaments table may store vis_tournament_no
      const { data: t, error } = await this.supabase
        .from('tournaments')
        .select('tournament_code, vis_tournament_no')
        .or(`vis_tournament_no.eq.${visNo},tournament_code.eq.${visNo}`)
        .limit(1)
        .maybeSingle();
      if (!error && t?.tournament_code) return t.tournament_code;
    } catch {
      // ignore
    }

    return null;
  }
}
