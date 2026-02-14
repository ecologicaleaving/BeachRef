# 🏐 BeachRef Flutter

**Professional Beach Volleyball Referee App** - Flutter rewrite della versione React Native.

## 🚀 Quick Start

### Prerequisites
- Flutter SDK 3.10.4+
- SSH access al VPS CiccioHouse (46.225.60.101)
- VS Code / Android Studio

### Setup

1. **Clone & Install**
   ```bash
   cd beach_ref_flutter
   flutter pub get
   ```

2. **Avvia SSH Tunnel** (terminale separato)
   ```bash
   ssh -L 54321:127.0.0.1:54321 -L 54323:127.0.0.1:54323 root@46.225.60.101
   ```

3. **Run Development**
   ```bash
   ./scripts/run_dev.sh
   ```

📖 **Documentazione completa:** [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)

---

## 🏗️ Architettura

### Stack Tecnologico
- **Framework:** Flutter 3.x
- **State Management:** Riverpod + Freezed
- **Routing:** go_router
- **Backend:** Supabase (self-hosted VPS)
- **HTTP Client:** Dio
- **Local Cache:** Hive
- **XML Parsing:** xml package (FIVB API)

### Struttura Progetto
```
lib/
├── core/           # Config, theme, utils
├── features/       # Feature modules (match, tournament, referee)
├── providers/      # Riverpod providers
├── models/         # Data models (Freezed)
├── services/       # API services (Supabase, FIVB)
├── repositories/   # Data repositories
└── widgets/        # Shared widgets
```

---

## 🌐 Backend

### Supabase Instances (VPS)
- **Dev:** http://localhost:54321 (via tunnel)
- **Prod:** http://localhost:54421 (via tunnel)

Studio UI disponibile su:
- Dev Studio: http://localhost:54323
- Prod Studio: http://localhost:54423

---

## 🛠️ Development

### Comandi Utili

```bash
# Run development
./scripts/run_dev.sh

# Run production
./scripts/run_prod.sh

# Generate code (Riverpod, Freezed)
flutter pub run build_runner build --delete-conflicting-outputs

# Analizza codice
flutter analyze

# Test
flutter test
```

### Hot Reload
✅ Funziona perfettamente in locale!  
Il backend su VPS + tunnel SSH = esperienza fluida

---

## 📱 Build & Release

### Android
```bash
flutter build apk --release \
  --dart-define=SUPABASE_URL=http://localhost:54421 \
  --dart-define=SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

### iOS
```bash
flutter build ios --release \
  --dart-define=SUPABASE_URL=http://localhost:54421 \
  --dart-define=SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

---

## 🔗 Link Utili

- [Documentazione FIVB API](../docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Flutter Docs](https://docs.flutter.dev/)
- [Riverpod Docs](https://riverpod.dev/)

---

## 👥 Team
**80/20 Solutions** - Davide & Ascanio + AI Team (Ciccio 😎)
