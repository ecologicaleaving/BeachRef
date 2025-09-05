# VIS Cache Guidelines (v0.1)

> Guida operativa per ottimizzare cache, polling e consumi su app Expo (iOS/Android/Web) che integra il VIS WebService (Beach Volley).

---

## 1) Principi chiave

* **Read‑heavy, write‑none**: i dati VIS sono *solo lettura* lato client → sfrutta caching aggressivo con invalidazioni mirate.
* **Adattivo allo stato**: intervalli di refresh dipendono da `Status` (Scheduled/Running/Finished) e dallo *screen focus* (foreground/background).
* **Payload minimo**: riduci i `Fields` all’essenziale per migliorare hit ratio e latenza.
* **Batching consapevole**: raggruppa più `<Request>` quando la UI ne ha bisogno *insieme*; evita batch troppo grandi su mobile.
* **Coerenza UI prima di freschezza assoluta**: preferisci *stale‑while‑revalidate* con timestamp “ultimo aggiornamento”.

---

## 2) Classi di risorsa e policy consigliate

| Risorsa                       | Dinamicità  | Chiave cache (React Query)             | `staleTime` | `gcTime` |                                `refetchInterval` (FG) | Note invalidazione                                          |
| ----------------------------- | ----------- | -------------------------------------- | ----------: | -------: | ----------------------------------------------------: | ----------------------------------------------------------- |
| **TournamentList**            | bassa       | `["vis","tournaments",{range,status}]` |     60–120s |    5–15m |                                         off (onFocus) | Invalida quando cambia finestra temporale o filtro `Status` |
| **TournamentDetail**          | bassa       | `["vis","tournament",{no}]`            |     60–120s |   10–20m |                                                   off | Invalida quando Tournament entra/esce da `Running`          |
| **RoundList**                 | bassa       | `["vis","rounds",{noTournament}]`      |         60s |      10m |                                                   off | Invalida insieme a TournamentDetail                         |
| **MatchList (by Tournament)** | media       | `["vis","matches",{noTournament}]`     |         15s |    5–10m |                        10s se Running, altrimenti off | Stop polling se tutto `Finished`                            |
| **MatchDetail (LIVE)**        | alta        | `["vis","match",{no}]`                 |        2–5s |     1–5m | 3–5s se Running; 30–60s se Scheduled; off se Finished | Sospendere in background                                    |
| **EventMeta**                 | bassa       | `["vis","event",{no}]`                 |       5–10m |   20–30m |                                                   off |                                                             |
| **EventRefereeList**          | molto bassa | `["vis","event","referees",{noEvent}]` |       5–10m |   30–60m |                                                   off | Aggiorna solo in giornate di gara                           |

**FG** = Foreground. In background usare `refetchInterval: false`.

---

## 3) Chiavi, normalizzazione e deduplica

* **Chiavi stabili**: includi solo parametri che influenzano davvero il payload (es. `{noTournament}`), evita oggetti non serializzabili.
* **Normalizza ID**: `No` sempre stringa; niente numeri se l’API alterna tipizzazione.
* **Structural sharing**: quando aggiorni `MatchDetail`, deriva `MatchListItem` con merge *non distruttivo* per evitare re-render massivi.
* **Hash punteggio**: calcola `scoreHash = sha1(SetScore|RallyScore|ServingTeam)` per aggiornare la UI solo su cambiamento reale.

---

## 4) Regole di polling adattivo

* **Running** → *alta frequenza*: 3–5s su `MatchDetail`, 10s su `MatchList`.
* **Scheduled** → *bassa frequenza*: 30–60s, in avvicinamento all’orario di `StartDateTime` riduci a 10–15s negli ultimi 5 minuti.
* **Finished** → *stop* polling, mantieni dati in cache.
* **Screen focus/AppState**: usa FocusManager (React Query) + `AppState` Expo per sospendere il polling in background.
* **NetInfo**: se offline, disabilita retry e polling; mostra banner offline con ultimo timestamp valido.

---

## 5) Errori, retry ed *error caching*

* **Retry con backoff**: 0.5s → 1s → 2s (max 3). Se fallisce: mostra cache + banner “Connessione instabile”.
* **Error boundary per risorsa**: non propagare l’errore di `MatchDetail` al resto della pagina torneo.
* **Error caching**: memorizza l’errore per 10–30s per evitare martellamento quando la rete è giù.

---

## 6) Prefetch, cache warming e *navigation hints*

* **Hover/Intent prefetch (Web)**: prefetch `MatchDetail` quando il cursore passa su una card (Web only).
* **On navigate**: entrando in “Tournament → MatchList”, prefetch `RoundList` e i `MatchDetail` *solo* dei match `Running`.
* **Warm on app start**: carica `TournamentList` con `status=Running,Scheduled` al boot (cache 60–120s).

---

## 7) CDN/Proxy (opzionale) e Edge caching

Se usi un **proxy serverless** (Netlify/Vercel/Cloudflare Worker):

* **Cache‑Control** lato edge:

  * `TournamentList`: `max-age=60, s-maxage=120, stale-while-revalidate=60`
  * `MatchList`: `max-age=10, s-maxage=15`
  * `MatchDetail`: `max-age=2, s-maxage=5` (solo quando `Running`)
* **Surrogate keys**: `tournament:{no}`, `match:{no}`, `event:{no}` per invalidazioni mirate.
* **Do not cache errors** oltre 10s.
* **CORS**: termina CORS al proxy, non esporre segreti sul client.

---

## 8) Implementazione con TanStack Query (snippet)

```ts
// queryClient comune
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      staleTime: 0,
      gcTime: 5 * 60_000,
    },
  },
});

// Hook MatchDetail (adattivo)
function useLiveMatch(noMatch: string | undefined, statusHint?: "Scheduled"|"Running"|"Finished") {
  const isFocused = useIsScreenFocused(); // wrapper su FocusManager/AppState
  const interval = !isFocused
    ? false
    : statusHint === "Running" ? 3000
    : statusHint === "Scheduled" ? 30000
    : false;

  return useQuery({
    queryKey: ["vis","match",{ noMatch }],
    enabled: !!noMatch,
    queryFn: () => getBeachMatch(noMatch!, /* fields slim se update */),
    refetchInterval: interval,
    staleTime: statusHint === "Running" ? 2000 : 60000,
    gcTime: 5 * 60_000,
    select: (data) => normalizeMatchDetail(data),
  });
}
```

> **Nota**: usa `select` per fare structural sharing e calcolare `scoreHash`.

---

## 9) Invalidation triggers

* **Tournament status change**: quando un torneo passa a `Running`, invalida `MatchList` relativo.
* **Match finalizzato**: su `Finished`, invalida una volta, poi disattiva polling.
* **Cambio finestra temporale in lista tornei**: invalida e prefetch nuovi risultati.
* **Cambio round filter**: invalidate solo `MatchList` del round.

---

## 10) Metriche e osservabilità

* **Client metrics**: logga `fetch_ms`, `payload_bytes`, `cache_hit`/`miss`, `poll_count` per screen.
* **Error rates**: percentuali per risorsa e per stato (Running vs Scheduled).
* **User impact**: fps e re-render count nelle schermate Live.

---

## 11) Testing della cache

* **Unit**: verifica key stability, `select` immutabile, normalizzazioni.
* **Integration**: mock VIS con risposte che cambiano `Status` e verificare intervalli adattivi.
* **E2E**: scenari offline/online, background/foreground, switch rapido tra match.

---

## 12) Checklist rapida (per Dev & Architect)

* [ ] Chiavi cache stabilizzate e serializzabili.
* [ ] `staleTime`/`gcTime` impostati secondo tabella per tutte le risorse.
* [ ] Polling adattivo in base a `Status` e focus.
* [ ] NetInfo/FocusManager integrati.
* [ ] Normalizzazioni e structural sharing sui mapper.
* [ ] Timestamp “Ultimo aggiornamento” in ogni vista dati.
* [ ] Proxy/Edge caching (se presente) con header coerenti.
* [ ] Test di regressione su stato `Running → Finished`.

---

### Appendice A — Profili di Fields suggeriti

* **MatchDetail (prime load)**: `No,Status,Court,StartDateTime,TeamA,TeamB,SetScore,RallyScore,ServingTeam,Timeout,Cards`
* **MatchDetail (polling)**: `No,Status,SetScore,RallyScore,ServingTeam`
* **MatchList**: `No,NoRound,Court,StartDateTime,Status,TeamA,TeamB,ScoreA,ScoreB`
* **TournamentList**: `No,Name,CountryCode,City,StartDate,EndDate,Gender,Level,Status`
