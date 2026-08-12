/**
 * Lo stato di accesso per la NAVIGAZIONE (issue #103).
 *
 * Legge la copia locale scritta da `AccessService.statoAccesso()`, e non
 * importa `@supabase/supabase-js`: e' l'intero punto. Questo hook gira nel menu
 * laterale, che sta su ogni pagina, mentre il client Supabase arriva con un
 * `import()` dinamico apposta per non pesare su chi non accede.
 *
 * Cio' che restituisce serve a decidere QUALI VOCI MOSTRARE. Non e' un
 * controllo di autorizzazione: quello lo fa `is_authorized` sul database, che
 * la pagina statistiche valuta a ogni apertura. Vedi `statoRicordato.ts`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { statoRicordato, type StatoRicordato } from '../services/auth/statoRicordato';

export type AccessoRicordato = {
  /** `null` finche' la lettura non e' finita, o se non si sa niente. */
  stato: StatoRicordato | null;
  /** C'e' una sessione Google, autorizzata o meno. */
  autenticato: boolean;
  /** Puo' vedere le statistiche. */
  autorizzato: boolean;
  /** Rilegge la copia locale. Da chiamare all'apertura del menu. */
  rileggi: () => void;
};

export function useAccessoRicordato(): AccessoRicordato {
  const [stato, setStato] = useState<StatoRicordato | null>(null);

  // La lettura e' asincrona e il menu si smonta senza preavviso: senza questa
  // guardia, una `setStato` in ritardo arriverebbe a componente gia' andato.
  const montato = useRef(true);

  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
    };
  }, []);

  const rileggi = useCallback(() => {
    statoRicordato().then(letto => {
      if (montato.current) setStato(letto);
    });
  }, []);

  useEffect(() => {
    rileggi();
  }, [rileggi]);

  return {
    stato,
    autenticato: stato?.stato === 'autorizzato' || stato?.stato === 'autenticato_non_autorizzato',
    autorizzato: stato?.stato === 'autorizzato',
    rileggi,
  };
}
