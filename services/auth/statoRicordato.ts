/**
 * L'ultimo stato di accesso conosciuto, leggibile senza caricare Supabase
 * (issue #103).
 *
 * ## Perche' esiste
 *
 * `AccessService.statoAccesso()` e' la risposta autorevole, ma per darla deve
 * costruire il client Supabase — e `@supabase/supabase-js` arriva con un
 * `import()` dinamico proprio perche' pesa: "il costo lo paga solo chi apre
 * `/accedi` o `/iscrizione`" (vedi il commento in testa ad `AccessService` e
 * "Web bundle weight" in CLAUDE.md).
 *
 * Il menu laterale sta su OGNI pagina. Se per decidere se mostrare la voce
 * "Stats" chiedesse a `statoAccesso()`, quel chunk finirebbe addosso a ogni
 * visitatore — loggato o no, interessato alle statistiche o no — annullando la
 * ragione per cui l'import e' dinamico.
 *
 * Qui si scrive quindi una copia minuscola dell'esito, e la si rilegge con la
 * sola AsyncStorage (che su web e' localStorage). Nessun import del client.
 *
 * ## Puo' essere STANTIA, ed e' accettabile
 *
 * Se l'autorizzazione viene revocata dopo l'ultimo accesso, questa copia
 * continua a dire "autorizzato" finche' qualcuno non ricalcola. La voce di menu
 * porterebbe allora a una pagina che rifiuta — che e' esattamente cio' che quella
 * pagina deve fare.
 *
 * La distinzione da tenere ferma: **il menu e' un'affordance, non un controllo
 * di sicurezza**. La barriera vera e' `is_authorized` sul database, valutata
 * dalla pagina a ogni apertura. Nessuna decisione di accesso si appoggia a
 * questo file.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StatoAccesso } from './AccessService';

const CHIAVE = 'beachref-accesso-ricordato';

/** La sola parte dello stato che al menu serve davvero. */
export type StatoRicordato = {
  stato: StatoAccesso['stato'];
  email: string | null;
};

/**
 * Registra l'esito appena calcolato. Non solleva mai: se la memoria non e'
 * disponibile, il menu mostrera' semplicemente la voce di accesso, che e' il
 * ripiego giusto.
 */
export async function ricorda(stato: StatoAccesso): Promise<void> {
  try {
    const daRicordare: StatoRicordato = {
      stato: stato.stato,
      email: 'email' in stato ? stato.email : null,
    };
    await AsyncStorage.setItem(CHIAVE, JSON.stringify(daRicordare));
  } catch {
    // Ricordare e' un'ottimizzazione, non un requisito.
  }
}

/** Dimentica tutto. Da chiamare all'uscita. */
export async function dimentica(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHIAVE);
  } catch {
    // Come sopra.
  }
}

/**
 * Rilegge l'ultimo esito noto. `null` quando non se ne sa niente — che e'
 * diverso da "anonimo": significa "non l'ho ancora chiesto a nessuno".
 */
export async function statoRicordato(): Promise<StatoRicordato | null> {
  try {
    const grezzo = await AsyncStorage.getItem(CHIAVE);
    if (!grezzo) return null;

    const letto = JSON.parse(grezzo) as StatoRicordato;
    return typeof letto?.stato === 'string' ? letto : null;
  } catch {
    return null;
  }
}
