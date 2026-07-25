# BeachRef — documentazione

Indice reale di quello che c'è in `docs/`. Se aggiungi un documento qui,
aggiungilo anche a questa lista; se un documento smette di essere vero,
cancellalo. Un documento superato che resta è peggio di uno assente.

> La versione precedente di questo file indicizzava `docs/dataArchitecture/`
> e `docs/VisDocsNew/`: il primo è finito in `docs/archive/dataArchitecture/`,
> il secondo non esiste nel repository. Riscritto nella issue #44.

## Riferimento attivo

| Documento | Cosa dice |
|---|---|
| [`ARCHITECTURE-DATA-STANDARDS.md`](./ARCHITECTURE-DATA-STANDARDS.md) | Specifica degli oggetti dati standardizzati e self-healing (tipi di dominio, versioning, validazione) |
| [`LIVE_SCORE_SERVICE_ARCHITECTURE.md`](./LIVE_SCORE_SERVICE_ARCHITECTURE.md) | Architettura del Live Score Service (polling ibrido, integrazione VIS) — implementata in `services/live-score/` |
| [`LAZY_LOADING_SETUP.md`](./LAZY_LOADING_SETUP.md) | Persistenza lazy-loading su Supabase per ridurre le chiamate VIS — implementata in `services/sync/` |
| [`DEPLOYMENT_SETUP.md`](./DEPLOYMENT_SETUP.md) | Come viene pubblicato il web: integrazione git di Netlify (unica) + `.github/workflows/web-build.yml` come gate di build sulle PR |
| [`ANDROID_SETUP_TODO.md`](./ANDROID_SETUP_TODO.md) | Checklist di configurazione per la build Android/EAS |

### Guidelines

- [`Guidelines/VISImplementationGuide.md`](./Guidelines/VISImplementationGuide.md)
- [`Guidelines/VISCacheGuidelines.md`](./Guidelines/VISCacheGuidelines.md)
- [`Guidelines/FieldImplementationGuideline.md`](./Guidelines/FieldImplementationGuideline.md)
- [`Guidelines/referee-extraction-implementation-guidelines.md`](./Guidelines/referee-extraction-implementation-guidelines.md)

### Sistema colori

- [`COLOR-MIGRATION-MATRIX.md`](./COLOR-MIGRATION-MATRIX.md)
- [`COMPLETE-COLOR-MAPPING.md`](./COMPLETE-COLOR-MAPPING.md)
- [`ESLINT-COLOR-RULES.md`](./ESLINT-COLOR-RULES.md)

### Altro

- [`examples/enhanced-match-data-usage.md`](./examples/enhanced-match-data-usage.md)
- [`solutions/duration-debug-fix.md`](./solutions/duration-debug-fix.md)

## Storico

`docs/archive/` contiene epic, PRD e piani di migrazione conclusi. È storia:
non usarlo come riferimento sullo stato attuale del codice.

## Dove NON sta la documentazione

- **Stato del progetto, backlog, changelog per issue** → `PROJECT.md` (root)
- **Come lavorare sul codebase, comportamento dell'audit** → `CLAUDE.md` (root)
- **Specifiche di feature con task tracking** → `specs/`
