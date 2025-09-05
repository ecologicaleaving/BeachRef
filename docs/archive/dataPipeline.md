# FIVB VIS – Data Pipelines (dev‑ready) v0

> Solo pipeline e orchestrazione, pronte da implementare. Linguaggio target: TypeScript/React (valido anche per altri stack).

---

## 0) Layer e responsabilità

* **HttpXmlClient** → POST `XmlRequest.asmx` (timeout, retry, headers)
* **VisFetcher** → costruisce i body XML per ogni request
* **VisMapper** → XML → DTO normalizzati (ISO date, enum, number)
* **CacheStore** → in‑memory + optional persistent; politica **SWR**
* **VisRepo** → orchestration per view/schermata

---

## 1) Pipeline – Tournament Selection (lista tornei)

**Scopo**: popolare la schermata card dei tornei (con filtri opzionali: season, gender, status, country).

**Request**: `GetBeachTournamentList` (opz. `<Filter Status="NotOpen Open">` per “non ancora attivi”).

**Flow**

1. `VisRepo.loadTournamentSelection(params)`
2. → `CacheStore.get(key)` (key = `vis:tournaments:status={..}:season={..}:gender={..}:country={..}`)
3. Se cache hit → **emit** dati; in parallelo **revalidate**
4. Revalidate → `VisFetcher.getTournamentList(params)` → `HttpXmlClient.post(xml)`
5. Parse → `VisMapper.tournaments(xml)` → DTO `TournamentCardDTO[]`
6. `CacheStore.set(key, dto, TTL=6h)` → **emit** update se cambiato

**DTO output minimo (`TournamentCardDTO`)**

* `no, title|name, season, countryName, startQualification?, startMainDraw?, endMainDraw?, gender, type, status, website?`

---

## 2) Pipeline – Tournament Page / Match List

**Scopo**: elencare le partite di un torneo e alimentare le card espandibili.

**Request**: `GetBeachMatchList` (con `NoTournament`)

**Flow**

1. `VisRepo.loadTournamentPage(noTournament, noEvent?)`
2. In parallelo:

   * `VisFetcher.getMatchList(noTournament)`
   * (se `noEvent`) `VisFetcher.getEventBundle(noEvent)` per staff (vedi §3)
3. Parse `matchesXml` → `VisMapper.matches(xml)` → `MatchCardDTO[]`
4. Cache → key `vis:matches:tournament={noTournament}` TTL **live** 30–60s (match in corso) / **10m** (non live)
5. **Emit** matches; se presente staff, esegui join referee su `NoReferee1/2`

**DTO output minimo (`MatchCardDTO`)**

* Identità/tempo: `no, noTournament, dateLocal, timeLocal, timeZone?, roundName, roundPhase?, court?, venue?, status`
* Squadre: `teamA {name,fed?}`, `teamB {name,fed?}`
* Risultato: `resultText?, setsText?`
* Arbitri: `referees {no1?, name1?, no2?, name2?}`
* Live/media: `live {streamUri?}`

---

## 3) Pipeline – Event Staff (Officials & Referees)

**Scopo**: popolare le tab “Officials” e “Referees” legate all’evento genitore.

**Requests (bundle)**: `GetEvent` + `GetEventOfficialList` + `GetEventRefereeList` (con `<Filter NoEvent>`)

**Flow**

1. `VisRepo.loadEventStaff(noEvent)`
2. `CacheStore.get('vis:event:{noEvent}:bundle')`
3. Se miss → `VisFetcher.getEventBundle(noEvent)` (richiesta **multi**); `HttpXmlClient.post(xml)`
4. `VisMapper.eventBundle(xml)` → `EventInfoDTO`, `EventOfficialDTO[]`, `EventRefereeDTO[]`
5. `CacheStore.set('vis:event:{noEvent}', info, 2h)`
   `CacheStore.set('vis:event:{noEvent}:officials', officials, 2h)`
   `CacheStore.set('vis:event:{noEvent}:referees', referees, 2h)`
6. **Emit** {info, officials, referees}

**DTO output**

* **EventInfoDTO**: `no, name, countryCode?, status?, type?, hasBeachTournament?, tournamentName?`
* **EventOfficialDTO**: `noOfficial, firstName, lastName, federationCode?, role, status?`
* **EventRefereeDTO**: `noReferee, firstName, lastName, federationCode?, status?, type?, theoryTest?, strongPoints?, weakPoints?, conclusion?`

---

## 4) Pipeline – Referee Enrichment & “Partite arbitrate”

**Scopo**: profilo arbitro + elenco partite arbitrate nel torneo corrente.

**Input**: `MatchCardDTO[]` (dal §2) + `EventRefereeDTO[]` (dal §3) / fallback `GetRefereeList`.

**Flow**

1. `VisRepo.getRefereeProfile(noReferee, noTournament)`
2. **Lookup** in `vis:event:{noEvent}:referees` → se non trovato, opz. `GetRefereeList`
3. **Filter** su `vis:matches:tournament={noTournament}` dove `noReferee == no1 || no2`
4. **Compose**: `{ profile: EventRefereeDTO|RefereeDTO, matches: MatchCardDTO[] }`
5. Cache risultato con TTL 10m (profilo cambia raramente; dipende dai match del torneo)

---

## 5) Chiavi Cache & TTL (SWR)

* `vis:tournaments:status={NotOpen|Open|*}:season={YYYY|*}:gender={M|W|*}:country={CC|*}` → **6h**
* `vis:matches:tournament={NoTournament}` → **30–60s live / 10m non‑live**
* `vis:event:{NoEvent}` (info) → **2h**
* `vis:event:{NoEvent}:officials` → **2h**
* `vis:event:{NoEvent}:referees` → **2h**
* `vis:referees:all` → **24h** (se usi `GetRefereeList` per arricchimento)

**SWR**: on read → serve cache immediata; avvia revalidate in background; se delta, emetti update store.

---

## 6) Error Handling (uniforme)

* Timeout 8–12s; retry 0→3 con backoff+jitter su 5xx/timeout
* Parser XML permissivo; campi opzionali `undefined` safe
* Se bundle `Event` fallisce, mostra solo matches e un banner “Staff non disponibile” con **Riprova**
* Throttling client ≤ 1 req/sec; debounce 300ms su filtri

---

## 7) Interfacce repo (contratti)

```ts
// Tournament selection
loadTournamentSelection(params: { season?: string; gender?: 'M'|'W'|'MW'|'Mixed'; status?: string[]; country?: string }): Promise<TournamentCardDTO[]>;

// Tournament page
loadTournamentPage(args: { noTournament: number; noEvent?: number }): Promise<{ matches: MatchCardDTO[]; staff?: { officials: EventOfficialDTO[]; referees: EventRefereeDTO[]; info: EventInfoDTO } }>;

// Event staff (diretto)
loadEventStaff(noEvent: number): Promise<{ info: EventInfoDTO; officials: EventOfficialDTO[]; referees: EventRefereeDTO[] }>;

// Referee profile & matches
getRefereeProfile(args: { noReferee: number; noTournament: number; noEvent?: number }): Promise<{ profile: EventRefereeDTO|RefereeDTO; matches: MatchCardDTO[] }>;
```

---

## 8) Sequenze (ASCII)

**A) Tournament Selection**

```
UI → VisRepo.loadTournamentSelection → Cache (hit?) → emit
                                   ↘ VisFetcher.getTournamentList → HttpXmlClient → VisMapper → Cache.set → emit
```

**B) Tournament Page**

```
UI → VisRepo.loadTournamentPage(noTournament,noEvent?)
        ↘ getMatchList → Http → Mapper → Cache.set → emit.matches
        ↘ (opt) getEventBundle → Http → Mapper → Cache.set → emit.staff
        ↘ join referee on NoReferee1/2
```

**C) Referee Profile**

```
UI → getRefereeProfile(noReferee,noTournament)
        ↘ lookup in event.referees (cache) | fallback GetRefereeList
        ↘ filter matches where no1/no2 == noReferee
        ↘ compose profile+matches → cache → emit
```

---

## 9) Telemetria minima

* `fetch_duration_ms`, `payload_size_bytes`, `cache_hit_ratio`, `xml_parse_errors`
* Eventi UX: `retry_clicked`, `filters_changed`

---

## 10) Checklist pronta all’uso

* [ ] Chiavi cache e TTL impostati (SWR attivo)
* [ ] Request body XML verificati (tournament/match/event bundle)
* [ ] Mapper XML→DTO con test baseline
* [ ] Join arbitri testato su ≥1 evento
* [ ] Telemetria base e messaggi di fallback
