# BeachRef Flutter - Setup Supabase

## 🎯 Configurazione Completa

BeachRef Flutter è configurato per usare **Supabase self-hosted** sul VPS CiccioHouse.

### 📦 Ambienti Disponibili

- **Development** → Supabase Dev (porta 54321)
- **Production** → Supabase Prod (porta 54421)

---

## 🚀 Setup sul PC Locale

### 1. SSH Tunnel (richiesto)

Apri un terminale e lascia attivo il tunnel:

**Per Development:**
```bash
ssh -L 54321:127.0.0.1:54321 -L 54322:127.0.0.1:54322 -L 54323:127.0.0.1:54323 root@46.225.60.101
```

**Per Production:**
```bash
ssh -L 54421:127.0.0.1:54421 -L 54422:127.0.0.1:54422 -L 54423:127.0.0.1:54423 root@46.225.60.101
```

### 2. Installare Dipendenze

```bash
cd beach_ref_flutter
flutter pub get
```

### 3. Lanciare l'App

**Development (consigliato):**
```bash
./scripts/run_dev.sh
```

**Production:**
```bash
./scripts/run_prod.sh
```

**Manuale (se script non funziona):**
```bash
flutter run \
  --dart-define=SUPABASE_URL=http://localhost:54321 \
  --dart-define=SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

---

## 🔍 Verifica Connessione

### Studio UI (Browser)
- Dev: http://localhost:54323
- Prod: http://localhost:54423

### Database Diretto (psql/DBeaver)
```
Dev:  postgresql://postgres:postgres@localhost:54322/postgres
Prod: postgresql://postgres:postgres@localhost:54422/postgres
```

---

## 📝 File Configurazione

```
.env.dev   → Development (54321)
.env.prod  → Production (54421)
```

**Non committare mai questi file!** Sono già in `.gitignore`.

---

## ⚠️ Troubleshooting

**Errore: "Connection refused"**
→ Controlla che il tunnel SSH sia attivo

**Errore: "Invalid API key"**
→ Verifica che le credenziali in `.env.dev` siano corrette

**Errore: "Network error"**
→ Verifica che Supabase sia running sul VPS:
```bash
ssh root@46.225.60.101 "cd ~/supabase-cli && supabase status"
```

---

## 🎉 Ready to Code!

Ora puoi sviluppare in locale con hot reload mentre il backend gira sul VPS! 😎
