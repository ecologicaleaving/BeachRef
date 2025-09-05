# VIS Beach Implementation Guide

> Documento operativo per valutare lo stato di implementazione della web/app basata su Expo (React/TS) e l'integrazione con VIS WebService.

## CRITICAL DISCOVERY - Form Parameter Fix

**IMPORTANT UPDATE**: Through testing, we discovered the correct format for VIS API requests. **All previous `<BadRequestSyntax id="4" />` errors were caused by using the wrong form parameter name**.

### Working Request Format

**Correct form parameter**: Use `Request` (NOT `xmlRequest`)

```javascript
// CORRECT - Use URLSearchParams with 'Request' parameter
const formData = new URLSearchParams();
formData.append('Request', xmlString);

// INCORRECT - This causes BadRequestSyntax errors  
formData.append('xmlRequest', xmlString);
```

### Verified Working Example

This XML format successfully returned 10 referees with Status 200:

```xml
<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Role Status">
    <Filter NoEvent="1554"/>
  </Request>
</Requests>
```

### Key Requirements
1. **Always wrap requests in `<Requests>` tag** - This is mandatory
2. **Use `Request` form parameter** - Not `xmlRequest`
3. **Use URLSearchParams for form data** - Standard HTTP form encoding
4. **Include proper field selection** - Specify needed fields in `Fields` attribute

This discovery resolves all BadRequestSyntax errors and enables successful VIS API integration.

---

## 1. Chiamate principali

### 1.1 Tornei

* **GetBeachTournamentList**

  * **Scopo:** recupero elenco tornei.
  * **Filtri:** `DateFrom`, `DateTo`, `Status`.
  * **Campi tipici:** `No, Name, CountryCode, City, StartDate, EndDate, Gender, Level, Status`.
* **GetBeachTournament**

  * **Scopo:** dettaglio singolo torneo.
  * **Attr.:** `No="TOURN_NO"`.

### 1.2 Round e Partite

* **GetBeachRoundList**

  * **Scopo:** elenco round di un torneo.
  * **Filtro:** `NoTournament`.
* **GetBeachMatchList**

  * **Scopo:** partite di un torneo o round.
  * **Filtri:** `NoTournament`, `NoRound`.
  * **Campi:** `No, NoRound, Court, StartDateTime, Status, TeamA, TeamB, ScoreA, ScoreB`.
* **GetBeachMatch**

  * **Scopo:** dettaglio di una partita (live score).
  * **Attr.:** `No="MATCH_NO"`.
  * **Campi:** `No, Status, Court, StartDateTime, TeamA, TeamB, SetScore, RallyScore, ServingTeam, Timeout, Cards`.

### 1.3 Eventi e Staff

* **GetEvent**: dati meta evento (titolo, codice, nazione, stato).
* **GetEventRefereeList / GetEventOfficialList**: elenco arbitri e officials di un evento.

---

## 2. Data Structure

### 2.1 Entità principali

* **Tournament**

  * `No`: string – ID torneo.
  * `Name`: string – nome.
  * `CountryCode`: string.
  * `City`: string.
  * `StartDate`: string (YYYY-MM-DD).
  * `EndDate`: string.
  * `Gender`: string (M/W).
  * `Level`: string (Challenge, Elite, ecc.).
  * `Status`: enum (Scheduled, Running, Finished).

* **Round**

  * `No`: string – ID round.
  * `Name`: string.
  * `Phase`: string (qualif, main draw…).
  * `Order`: number.

* **MatchListItem**

  * `No`: string – ID match.
  * `NoRound`: string.
  * `Court`: string.
  * `StartDateTime`: string (ISO).
  * `Status`: enum.
  * `TeamA`: string.
  * `TeamB`: string.
  * `ScoreA`: string.
  * `ScoreB`: string.

* **MatchDetail**

  * `No`: string.
  * `Status`: enum.
  * `Court`: string.
  * `StartDateTime`: string.
  * `TeamA` / `TeamB`: string.
  * `SetScore`: string (es. "21-18, 19-21, 15-13").
  * `RallyScore`: string.
  * `ServingTeam`: string (A/B).
  * `Timeout`: string.
  * `Cards`: string.

* **Event**

  * `No`: string.
  * `Code`: string.
  * `Name`: string.
  * `CountryCode`: string.
  * `Status`: string.
  * `TournamentName`: string.

* **Referee**

  * `NoReferee`: string.
  * `FirstName`: string.
  * `LastName`: string.
  * `Gender`: string.
  * `Role`: string.
  * `Status`: string.

### 2.2 Struttura e organizzazione

* Tutte le entità hanno `No` come chiave primaria.
* Date normalizzate in ISO UTC.
* Stati normalizzati come enum.
* Parsing da XML → oggetti tipizzati (TypeScript).
* Mapper centralizzati per coerenza.

---

## 3. Implementation Rules

### 3.1 Richieste e Parsing

* Costruire richieste XML tramite builder (escaping sicuro).
* Richiedere solo i campi necessari (riduzione payload).
* Usare `fast-xml-parser` per RN/Web.
* Centralizzare parser e mappers in modulo `vis/`.

### 3.2 Stato e Polling

* **React Query** per cache e polling.
* **Intervalli consigliati:**

  * Live match: 3–5s in foreground.
  * Lista partite: 10–15s.
  * Lista tornei: cache 30–120s.
* Sospendere polling in background (AppState/FocusManager).
* Aggiornare UI solo su cambiamenti (diff check).

### 3.3 Error Handling

* Retry con backoff esponenziale su errori di rete.
* Fallback a ultimo dato valido con timestamp.
* Evitare retry senza rete (usare NetInfo).

### 3.4 Sicurezza

* Tutto traffico HTTPS.
* Nessuna credenziale hardcoded nel client.
* Se proxy, configurare variabili ambiente per secrets.
* Evitare log di dati sensibili.

### 3.5 Struttura progetto

* Monorepo con cartelle: `app/` (Expo), `vis/` (API), `state/` (hooks), `components/`.
* Endpoints centralizzati in config.
* Test unitari per parser/mappers, integration per flussi API.

---

## 4. Pipeline ottimali

> Obiettivo: massimizzare reattività UI, minimizzare payload/chiamate, e rispettare limiti non documentati del VIS.

### 4.1 Pipeline Dati **Torneo**

**Use‑case:** schermata “Selezione Torneo” → scheda torneo → lista partite.

**Step A — Lista tornei (leggera, cache lunga)**

1. `GetBeachTournamentList`

   * `Fields`: `No,Name,CountryCode,City,StartDate,EndDate,Gender,Level,Status`
   * `Filter`: `DateFrom, DateTo, Status="Scheduled,Running,Finished"`
   * **Cache (staleTime):** 60–120s | **Refetch on focus:** sì

**Step B — Apertura torneo (batch dettagli + matchlist)**
Una richiesta **batched** riduce la latenza di andata/ritorno:

```xml
<Requests>
  <Request Type="GetBeachTournament" Fields="No,Name,CountryCode,City,StartDate,EndDate,Gender,Level,Status" No="{TOURN_NO}" />
  <Request Type="GetBeachRoundList" Fields="No,Name,Phase,Order">
    <Filter NoTournament="{TOURN_NO}" />
  </Request>
  <Request Type="GetBeachMatchList" Fields="No,NoRound,Court,StartDateTime,Status,TeamA,TeamB,ScoreA,ScoreB">
    <Filter NoTournament="{TOURN_NO}" />
  </Request>
</Requests>
```

* **Cache matchlist:** 15s | **Refetch interval:** 10s (solo se torneo `Running`)
* **Ordine UI:** usa `Round.Order` per raggruppare partite.

**Step C — Aggiornamenti**

* Quando il torneo passa `Scheduled → Running`, invalida la cache matchlist.
* Quando `Running → Finished`, disabilita polling.

**Fallback:** se `GetBeachRoundList` è vuoto, mostra matchlist per data/ora.

---

### 4.2 Pipeline Dati **Partita (LIVE)**

**Use‑case:** schermata “Live Match”.

**Step A — Primo fetch dettagli**

* `GetBeachMatch`

  * `Fields`: `No,Status,Court,StartDateTime,TeamA,TeamB,SetScore,RallyScore,ServingTeam,Timeout,Cards`

**Step B — Polling adattivo**

* **Se `Status=Running`**: `refetchInterval` 3–5s.
* **Se `Status=Scheduled`**: 30–60s fino a `Running`.
* **Se `Status=Finished`**: polling **off**.
* **Background** (AppState/Focus): sospendi polling.

**Step C — Minimizzare payload**

* Dopo il primo fetch, puoi usare un profilo “slim”:
  `Fields="No,Status,SetScore,RallyScore,ServingTeam"`.

**Step D — Aggiornamento UI**

* Confronta l’hash del blocco punteggio (es. `SetScore|RallyScore|ServingTeam`) per evitare re-render inutili.

**XML esempio (slim polling)**

```xml
<Requests>
  <Request Type="GetBeachMatch" Fields="No,Status,SetScore,RallyScore,ServingTeam" No="{MATCH_NO}" />
</Requests>
```

**Error/edge handling**

* Timeout → ritenta con backoff (0.5s→1s→2s).
* Se 3 fallimenti consecutivi: mostra ultimo dato valido + banner “Connessione instabile”.

---

### 4.3 Pipeline Dati **Arbitro/Staff**

**Use‑case:** pannello staff evento; riepilogo arbitri in torneo.

**Step A — Meta evento**

* `GetEvent`

  * `Fields`: `No,Code,Name,CountryCode,Status,HasBeachTournament,TournamentName`

**Step B — Elenco arbitri**

* `GetEventRefereeList`

  * `Fields`: `NoReferee,FirstName,LastName,Gender,Role,Status`
  * `Filter`: `NoEvent="{EVENT_NO}"`

**Step C — (Opz.) Officials**

* `GetEventOfficialList`

  * `Fields`: `NoOfficial,FirstName,LastName,Role,Status`

**Batch consigliato** (usando il formato corretto con parametro `Request`):

```xml
<Requests>
  <Request Type="GetEvent" Fields="No,Code,Name,CountryCode,Status,HasBeachTournament,TournamentName" No="{EVENT_NO}" />
  <Request Type="GetEventRefereeList" Fields="NoReferee,FirstName,LastName,Gender,Role,Status">
    <Filter NoEvent="{EVENT_NO}" />
  </Request>
</Requests>
```

```javascript
// Invio corretto con URLSearchParams
const formData = new URLSearchParams();
formData.append('Request', xmlString);
```

**Cache**

* Staff cambia raramente: **staleTime 5–10 minuti**.
* Aggiorna on focus solo in giornate di gara.

**Normalizzazioni**

* Dedupl. per `NoReferee`.
* Mappa `Role` su enum locale (es. `FIRST`, `SECOND`, `RESERVE`, `SCORER`).

---

## Uso del documento

Questa guida serve all’architetto per:

* Validare che le chiamate principali siano correttamente implementate.
* Verificare che le strutture dati rispettino i naming e le normalizzazioni.
* Controllare che le regole di implementazione (polling, parsing, sicurezza) siano applicate correttamente nel codice attuale.
* **Valutare le pipeline**: batching, cache/polling, handling degli edge‑case per torneo, partita e arbitri.
  Questa guida serve all’architetto per:
* Validare che le chiamate principali siano correttamente implementate.
* Verificare che le strutture dati rispettino i naming e le normalizzazioni.
* Controllare che le regole di implementazione (polling, parsing, sicurezza) siano applicate correttamente nel codice attuale.
* Verificare che le **pipeline ottimali** (torneo, partita, arbitro) siano rispettate nell’orchestrazione delle chiamate.
