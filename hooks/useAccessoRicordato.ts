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

  /**
   * `statoRicordato()` inghiotte gia' i propri errori e restituisce `null`,
   * quindi il ramo di errore non dovrebbe scattare mai. C'e' lo stesso perche'
   * la posta e' il menu di OGNI pagina: se un giorno quella funzione imparasse
   * a rifiutare, un rifiuto non gestito qui diventerebbe un errore in console
   * su tutto il sito. `null` significa "non so niente", e il menu ripiega sulla
   * voce di accesso — che e' il ripiego giusto.
   */
  const rileggi = useCallback(() => {
    const leggi = async () => {
      try {
        const letto = await statoRicordato();
        if (montato.current) setStato(letto);
      } catch {
        if (montato.current) setStato(null);
      }
    };

    void leggi();
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
