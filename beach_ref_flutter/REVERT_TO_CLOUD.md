# BeachRef - Ripristino Supabase Cloud

## Situazione
L'app era stata configurata temporaneamente per usare il VPS, ma ora **torna al database originale su Supabase Cloud**.

**Progetto Supabase Cloud**: `peofucnjgcrgswzqslpb` (region: eu-north-1)

## ⚠️ Cosa Devi Fare

### 1. Recupera Credenziali da Supabase Cloud

Vai su: https://app.supabase.com/project/peofucnjgcrgswzqslpb/settings/api

Copia:
- **Project URL**: `https://peofucnjgcrgswzqslpb.supabase.co`
- **anon/public key**: (inizia con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2. Aggiorna File `.env.prod`

Modifica `beach_ref_flutter/.env.prod`:

```bash
# BeachRef Flutter - Production Environment
# Supabase Cloud (Original Production)

SUPABASE_URL=https://peofucnjgcrgswzqslpb.supabase.co
SUPABASE_ANON_KEY=<copia-qui-anon-key-da-dashboard>
ENV=production
```

**IMPORTANTE**: 
- Usa l'URL del progetto Cloud: `https://peofucnjgcrgswzqslpb.supabase.co`
- NON usare `localhost` o `api.8020solutions.org`
- L'anon key è PUBBLICA (può stare nel codice Flutter)

### 3. Verifica Configurazione

Nel codice Flutter, il file che legge queste variabili dovrebbe essere simile a:

```dart
// lib/core/config/env.dart (o simile)
class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
}
```

Assicurati che:
- ✅ Il codice legga le variabili tramite `String.fromEnvironment()`
- ✅ Lo script `run_prod.sh` passi le variabili con `--dart-define`
- ✅ Non ci siano URL hardcoded nel codice

### 4. Test Connessione

```bash
cd beach_ref_flutter
./scripts/run_prod.sh
```

L'app dovrebbe:
- ✅ Connettersi a `https://peofucnjgcrgswzqslpb.supabase.co`
- ✅ Caricare dati esistenti (matches, tournaments, referees)
- ✅ Sync con VIS/FIVB funzionante

### 5. Build per Distribuzione

Una volta verificato che tutto funziona:

**iOS:**
```bash
flutter build ios --release --dart-define=SUPABASE_URL=https://peofucnjgcrgswzqslpb.supabase.co --dart-define=SUPABASE_ANON_KEY=<anon-key>
```

**Android:**
```bash
flutter build apk --release --dart-define=SUPABASE_URL=https://peofucnjgcrgswzqslpb.supabase.co --dart-define=SUPABASE_ANON_KEY=<anon-key>
```

## Database Status

Il database su Supabase Cloud contiene già:
- ~4000 record di matches FIVB
- Tornei sincronizzati
- Arbitri con analytics
- Sistema di sync con VIS attivo

**Non serve fare alcuna migrazione dati** - tutto è già lì! 🎯

## Troubleshooting

### Errore "Invalid API Key"
→ Controlla di aver copiato correttamente l'anon key dal dashboard

### Errore "Connection timeout"
→ Verifica che l'URL sia `https://peofucnjgcrgswzqslpb.supabase.co` (NON localhost)

### App si connette ma non vede dati
→ Verifica le policy RLS (Row Level Security) sul dashboard Supabase

## Note Finali

- ✅ Database Cloud = produzione stabile, backup automatici, zero manutenzione
- ✅ Supabase gestisce SSL, CDN, scaling
- ✅ Free tier fino a 500MB + 2GB storage (più che sufficiente)
- ❌ Non committare `.env.prod` su Git (già in .gitignore)

---

**In sintesi**: Recupera anon key dal dashboard, metti in `.env.prod`, testa con `./scripts/run_prod.sh`. Done! 🚀
