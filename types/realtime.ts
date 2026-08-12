/**
 * Tipi condivisi del sottosistema realtime.
 *
 * ## Perche' questo file esiste (issue #94)
 *
 * `ConnectionState` viveva in `services/RealtimePerformanceMonitor.ts`, che
 * importa `RealtimeSubscriptionService`, che a sua volta importava
 * `ConnectionState` dal primo. Un ciclo — e non uno benigno:
 *
 * ```
 * RealtimePerformanceMonitor.ts
 *   riga 10:  import { RealtimeSubscriptionService } from './RealtimeSubscriptionService'
 *   riga 13:  export enum ConnectionState { ... }        <-- DOPO l'import
 *
 * RealtimeSubscriptionService.ts
 *   riga  5:  import { ConnectionState } from './RealtimePerformanceMonitor'
 *   riga 48:  private static connectionState = ConnectionState.DISCONNECTED
 * ```
 *
 * Chi viene importato per primo decide l'esito. Importando il monitor per
 * primo, alla riga 10 il modulo si ferma per valutare il subscription service,
 * che alla riga 48 dereferenzia `ConnectionState` — un enum che il monitor non
 * ha ancora dichiarato, perche' e' tre righe piu' sotto. Risultato:
 * `TypeError: Cannot read properties of undefined (reading 'DISCONNECTED')`
 * durante l'inizializzazione degli statici.
 *
 * Un commento nel monitor sosteneva "Avoid circular dependency by using
 * type-only import". Non era vero: un enum e' un **valore**, e la riga 48 lo
 * dereferenzia a tempo di valutazione del modulo. Un `import type` sarebbe
 * stato cancellato dal transpiler e avrebbe prodotto lo stesso undefined.
 *
 * La rottura era visibile solo come suite che non caricava, ma **non e' un
 * problema di test**: in produzione l'esito dipende dall'ordine con cui il
 * bundler valuta i moduli, cioe' da quale schermata l'utente apre per prima.
 *
 * Questo modulo non importa nulla. E' l'unica proprieta' che conta: un file
 * foglia non puo' partecipare a un ciclo.
 */

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}
