# BeachRef Flutter - Setup Supabase

## 🎯 Configurazione

BeachRef usa **Supabase Production** sul VPS 8020solutions.org per l'app pubblica.

Il database contiene il dump del **VIS FIVB** (tornei, match, arbitri).

**Non c'è ambiente Development** - BeachRef legge dati readonly dal VIS! 🏐

---

## 🚀 Setup sul PC Locale

### 1. Pull Ultimi Commit

```bash
cd ~/BeachRef/beach_ref_flutter
git pull origin master
```

### 2. Crea File .env.prod

```bash
cat > .env.prod << 'EOF'
SUPABASE_URL=https://api.8020solutions.org
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
EOF
```

### 3. Lancia l'App

```bash
./scripts/run_prod.sh
```

**Oppure manuale:**
```bash
flutter run \
  --dart-define=SUPABASE_URL=https://api.8020solutions.org \
  --dart-define=SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

---

## 🔍 Database

### Schema:
- Dump completo VIS FIVB
- Tornei, match, arbitri
- Dati readonly per l'app

### Accedi a Studio (via tunnel):
```bash
ssh -L 54423:127.0.0.1:54423 root@46.225.60.101
```
Poi: http://localhost:54423

---

## 📊 Dati

Database popolato con dump del sistema VIS FIVB.

Gli utenti BeachRef consumano dati esistenti, non li modificano.

---

## ⚠️ Note Importanti

- **Solo Production** - app pubblica
- Database readonly (dump VIS)
- Nessun tunnel SSH necessario - tutto HTTPS
- Istanza dedicata su `api.8020solutions.org`

---

## 🎉 Ready!

BeachRef è configurato per accesso pubblico con backend VIS! 🏐😊
