// QUESTA suite prova `services/supabase` davvero, quindi deve disattivare il
// doppio globale.
//
// `jest.setup.js` sostituisce `./services/supabase` per TUTTE le suite, e in
// quel doppio `testSupabaseConnection` e' `jest.fn(() => Promise.resolve(true))`
// — una funzione che risponde sempre "connessione ok". Il file misurava quindi
// il proprio doppio: un caso passava senza significare nulla e l'altro non
// poteva passare in nessun modo, perche' nessun codice reale veniva eseguito.
jest.unmock('../supabase');

import { testSupabaseConnection, supabase } from '../supabase';

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({
          error: { code: 'PGRST116', message: 'relation "public._healthcheck" does not exist' }
        }))
      }))
    }))
  }))
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Supabase Service', () => {
  describe('testSupabaseConnection', () => {
    it('should return true when table does not exist (expected behavior)', async () => {
      const result = await testSupabaseConnection();
      expect(result).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // Si sostituisce il CLIENT GIA' COSTRUITO, non `createClient`.
      // `services/supabase.ts` costruisce il client all'importazione: quando
      // questo test gira, `createClient` e' stata chiamata da un pezzo e
      // `mockReturnValueOnce` non ha alcun effetto. Il test misurava quindi il
      // client sano del mock in cima al file, che risponde PGRST116 — cioe'
      // "connessione funzionante" — e pretendeva `false`.
      (supabase!.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({
            error: { code: 'CONNECTION_ERROR', message: 'Connection failed' }
          }))
        }))
      } as any);

      const result = await testSupabaseConnection();
      expect(result).toBe(false);
    });
  });
});