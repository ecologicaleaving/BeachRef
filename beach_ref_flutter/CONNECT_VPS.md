# BeachRef - Connessione Database VPS

## Setup Rapido

BeachRef è configurato per usare il **Supabase Production** sul VPS 8020solutions.

### Database Corretto
- **URL**: https://api.8020solutions.org
- **Istanza**: Supabase Prod (~/supabase-prod sulla VPS)
- **Porta VPS**: 54421 (interno), 443 (HTTPS pubblico)

## Come Avviare l'App

### Ambiente Production (RACCOMANDATO)
```bash
cd ~/projects/BeachRef/beach_ref_flutter
./scripts/run_prod.sh
```

Questo script:
1. Carica variabili da `.env.prod`
2. Esegue `flutter run` con `--dart-define` per ogni variabile
3. Si connette a `https://api.8020solutions.org`

### Verifica Configurazione

File `.env.prod` contiene:
```
SUPABASE_URL=https://api.8020solutions.org
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
ENV=production
```

## Credenziali Supabase

### Anon Key (public, sicura per client)
```
sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

### Service Role Key (PRIVATA, solo backend)
⚠️ **Disponibile solo su VPS** (~/supabase-prod/supabase/config.toml)
⚠️ **MAI usare Service Role Key nel codice Flutter!**
⚠️ **MAI committare su GitHub!**

## Database Status

Puoi verificare che il database sia attivo:
```bash
curl https://api.8020solutions.org/rest/v1/
```

Risposta attesa: `{"message":"The server is running"}`

## Troubleshooting

### Errore "Connection refused"
- Verifica che Supabase Prod sia attivo sulla VPS:
  ```bash
  ssh root@46.225.60.101
  cd ~/supabase-prod
  supabase status
  ```

### Errore "Invalid API key"
- Controlla che `.env.prod` contenga la chiave corretta
- Verifica che lo script `run_prod.sh` stia caricando il file giusto

### SSL Certificate Error
- Il certificato Let's Encrypt è valido fino al 2026-05-15
- Se scaduto, sulla VPS: `sudo certbot renew`

## Note Importanti

1. **Non committare mai** `.env.prod` o `.env.dev` su Git
2. **BeachRef usa SOLO Production** (api.8020solutions.org)
3. **Il database contiene** dati importati da Supabase Cloud (dump 14 feb 2026)
4. **Backup automatici**: da configurare (TODO)

## Contatti

- VPS: 46.225.60.101
- SSH: `ssh root@46.225.60.101` (chiave configurata)
- Dominio: gestito su Cloudflare
- SSL: Let's Encrypt (auto-renewal attivo)
