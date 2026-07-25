# Deploy web — setup

> Riscritto nella issue #52. La versione precedente descriveva il deploy via
> GitHub Action con i secret `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID`, e
> attribuiva a `netlify.toml` redirect SPA e header di sicurezza che non ci
> sono mai stati. Non è più vero niente di tutto questo.

## Chi pubblica il sito

**Solo l'integrazione git di Netlify.** Alla configurazione si accede da
Netlify → progetto `beachrefs` → *Site configuration → Build & deploy*.

Su ogni push a `master` e su ogni pull request Netlify:

1. checkouta la repository;
2. legge il blocco `[build]` di `netlify.toml`;
3. esegue `npx expo export --platform web` con Node 18 (da `.nvmrc`, ribadito
   in `[build.environment].NODE_VERSION`);
4. pubblica `dist/`.

| | URL |
|---|---|
| Produzione (`master`) | <https://beachrefs.netlify.app> |
| Preview di una PR | `https://deploy-preview-<N>--beachrefs.netlify.app` |

I preview compaiono come check sulla PR (`netlify/beachrefs/deploy-preview`,
`Header rules`, `Redirect rules`, `Pages changed`).

## Cosa fa (e non fa) la GitHub Action

`.github/workflows/web-build.yml` — ex `netlify-deploy.yml` — **non deploya
nulla**. Ha un solo job, `build`, che esegue lo stesso comando di export come
gate sulle PR: se non compila qui, non compilerebbe nemmeno su Netlify.

I job `deploy` e `deploy-preview` (basati su `nwtgck/actions-netlify`) sono
stati rimossi dalla #52: pubblicavano il sito in parallelo a Netlify,
vincendo la corsa. Di conseguenza i secret GitHub `NETLIFY_AUTH_TOKEN` e
`NETLIFY_SITE_ID` **non sono più usati da niente** e possono essere revocati.

## Variabili d'ambiente

**Il build su Netlify non eredita i secret di GitHub Actions.** Tutto ciò che
serve al bundle va messo in Netlify → *Site configuration → Environment
variables*.

Stato attuale: **nessuna variabile è necessaria**. Verificato confrontando il
bundle di produzione (buildato dalla Action) con quello buildato da Netlify:
nessuno dei due contiene un URL Supabase o una chiave — le `EXPO_PUBLIC_*` non
erano passate da nessuno dei due sistemi. L'unica variabile già presente nel
repository è `EXPO_PUBLIC_GA_ID` in `.env.production` (file tracciato).

Da configurare **quando** le relative feature verranno attivate lato web:

| Variabile | Serve a |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | client Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | client Supabase |
| `EXPO_PUBLIC_EDGE_URL` | Supabase Edge Functions |
| `EXPO_PUBLIC_MMKV_KEY` | cifratura della cache MMKV |
| `EXPO_PUBLIC_SENTRY_DSN` | error tracking |
| `EXPO_PUBLIC_VAPID_PUBLIC_KEY` | web push |

⚠️ Tutto ciò che ha prefisso `EXPO_PUBLIC_` finisce **inlinato nel bundle** ed è
quindi pubblico. Mai usarlo per una service-role key o una password.

## Header e redirect

`public/_headers` è l'**unica** fonte di verità: `expo export` lo copia in
`dist/_headers` e Netlify lo onora. Non spostare le regole in `netlify.toml`,
anche ora che quel file viene letto — vedi il commento in fondo a `netlify.toml`
e la sezione cache di `PROJECT.md`.

Non esiste `public/_redirects` e non deve esistere un catch-all SPA: ogni rotta
è prerenderizzata in un proprio HTML (issue #34) e un
`/* -> /index.html 200` servirebbe lo splash vuoto ovunque.

## Verifica dopo un deploy

```bash
./tests/curl-tests.sh https://beachrefs.netlify.app
# oppure, su una PR:
./tests/curl-tests.sh https://deploy-preview-<N>--beachrefs.netlify.app
```

15 check: routing per-rotta, assenza di `Clear-Site-Data`, HTML `no-store`,
chunk `_expo` `immutable`, service worker non cachato. Le regole header di
Netlify non sono verificabili in locale: serve un deploy vero.

## Deploy manuale (emergenza)

```bash
npx expo export --platform web
npx netlify-cli deploy --prod --dir=dist
```

## Troubleshooting

**Il build fallisce su Netlify ma passa in locale** — controlla la versione di
Node nel log del deploy: deve essere 18. `.nvmrc` ha la precedenza su
`NODE_VERSION`.

**Una feature funziona in locale e non in produzione** — quasi sempre è una
`EXPO_PUBLIC_*` presente nel tuo `.env` locale e non configurata su Netlify.
Le variabili sono inlinate al build: dopo averle aggiunte serve un nuovo
deploy, non basta un restart.

**Il deploy passa ma gli header sono sbagliati** — le regole stanno in
`public/_headers` e l'ordine conta (vince l'ultima regola che matcha). Vedi
`PROJECT.md`, sezione "Web — configurazione cache e redirect".
