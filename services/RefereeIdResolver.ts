/**
 * RefereeIdResolver
 * Maps VIS NoReferee (vis_referee_no) or name+federation to database referees.id.
 * Uses anon Supabase client and caches results for the app session.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface RefereeIdentity {
  visRefereeNo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  federationCode?: string | null;
}

export class RefereeIdResolver {
  private static instance: RefereeIdResolver | null = null;
  private supabase: SupabaseClient | null = null;
  private cacheByVis = new Map<string, string>(); // vis_referee_no -> id
  private cacheByNameFed = new Map<string, string>(); // key: name|fed -> id

  private constructor() {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      this.supabase = createClient(url, key, { auth: { persistSession: false } });
    }
  }

  public static getInstance(): RefereeIdResolver {
    if (!RefereeIdResolver.instance) {
      RefereeIdResolver.instance = new RefereeIdResolver();
    }
    return RefereeIdResolver.instance;
  }

  private nameFedKey(first?: string | null, last?: string | null, fed?: string | null): string {
    const fn = (first || '').trim().toLowerCase();
    const ln = (last || '').trim().toLowerCase();
    const fc = (fed || '').trim().toUpperCase();
    return `${fn} ${ln}|${fc}`.trim();
  }

  /**
   * Resolve DB referees.id.
   */
  async resolve(identity: RefereeIdentity): Promise<string | null> {
    if (!this.supabase) return null;
    console.log('🧭 Resolver[referee_id] • input', {
      visRefereeNo: identity.visRefereeNo || null,
      firstName: identity.firstName || null,
      lastName: identity.lastName || null,
      federationCode: identity.federationCode || null,
    });

    // 1) By vis_referee_no if present
    const vis = identity.visRefereeNo?.trim();
    if (vis) {
      const cached = this.cacheByVis.get(vis);
      if (cached) return cached;
      try {
        const { data, error } = await this.supabase
          .from('referees')
          .select('id, vis_referee_no')
          .eq('vis_referee_no', vis)
          .limit(1)
          .maybeSingle();
        if (!error && data?.id) {
          const idStr = String(data.id);
          this.cacheByVis.set(vis, idStr);
          console.log('🧭 Resolver[referee_id] • by vis_referee_no', { vis, id: idStr });
          return idStr;
        }
      } catch {}
    }

    // 2) Fallback by name + federation
    const key = this.nameFedKey(identity.firstName, identity.lastName, identity.federationCode);
    if (key && this.cacheByNameFed.has(key)) {
      return this.cacheByNameFed.get(key)!;
    }

    if ((identity.firstName || identity.lastName) && this.supabase) {
      try {
        let q = this.supabase
          .from('referees')
          .select('id, first_name, last_name, federation_code')
          .ilike('first_name', (identity.firstName || '%'))
          .ilike('last_name', (identity.lastName || '%'))
          .limit(10);

        if (identity.federationCode) {
          q = q.eq('federation_code', identity.federationCode);
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          const idStr = String(data[0].id);
          this.cacheByNameFed.set(key, idStr);
          console.log('🧭 Resolver[referee_id] • by name+fed', { key, id: idStr });
          return idStr;
        }
      } catch {}
    }

    return null;
  }
}
