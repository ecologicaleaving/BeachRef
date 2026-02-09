# ✅ Android Setup - TODO List

## 📋 Checklist Pre-Build

### 1. ✅ Configurazione Base (FATTO)
- ✅ app.json aggiornato con plugin expo-notifications
- ✅ Permissions Android configurate (incluso POST_NOTIFICATIONS)
- ✅ Package name: `com.beachref.app`
- ✅ eas.json presente

### 2. ❌ Assets Necessari (DA FARE)

#### Icon Notifiche (REQUIRED!)
Crea: `assets/images/notification-icon.png`
- **Size**: 96x96 pixels
- **Format**: PNG con alpha channel
- **Style**: Monocromatico (white on transparent)
- **Content**: Solo logo BeachRef semplificato

⚠️ **IMPORTANTE**: Android usa solo il canale alpha per notification icon.
Il colore viene applicato dal sistema usando `#1B365D` (configurato).

#### Verifica Altri Assets
- ✅ `assets/images/icon.png` (1024x1024) - Esiste?
- ✅ `assets/images/adaptive-icon.png` (1024x1024) - Esiste?
- ✅ `assets/images/splash-icon.png` (200x200) - Esiste?

### 3. ❌ Firebase Configuration (REQUIRED per Push!)

#### a) Crea Progetto Firebase
1. Vai su https://console.firebase.google.com
2. Click "Add Project"
3. Nome: **BeachRef**
4. Disable Analytics (opzionale)
5. Create

#### b) Aggiungi Android App
1. Project Overview → Add App → Android icon
2. **Android package name**: `com.beachref.app`
3. App nickname: BeachRef Android
4. **Download** `google-services.json`

#### c) Sposta File
```bash
# Copia google-services.json nella root del progetto
# (stessa cartella di app.json)
cp ~/Downloads/google-services.json ./google-services.json
```

#### d) Abilita Cloud Messaging
1. Firebase Console → Project Settings
2. Cloud Messaging tab
3. Verifica che sia abilitato (dovrebbe essere default)

### 4. ❌ EAS Project Setup (REQUIRED)

```bash
# 1. Login EAS (crea account gratuito se necessario)
npx eas login

# 2. Link progetto (genera project ID)
npx eas build:configure

# Questo aggiorna app.json con il project ID reale
```

---

## 🚀 Quick Build Commands

### Development (Expo Go - NO PUSH)
```bash
npm start
# Scan QR con Expo Go app
# ⚠️ Push notifications NON funzionano
```

### Preview Build (APK - CON PUSH) ⭐ CONSIGLIATO
```bash
# Dopo aver completato tutti i TODO sopra:
npx eas build --platform android --profile preview

# Build richiede 10-15 minuti
# Riceverai link per download APK
```

### Production Build (AAB - Play Store)
```bash
npx eas build --platform android --profile production
```

---

## 📱 Install APK su Device

### Metodo 1: Download Diretto
1. Apri link EAS da device Android
2. Download APK
3. Install (abilita "Install from Unknown Sources")

### Metodo 2: ADB
```bash
# Download APK
npx eas build:download --platform android --profile preview

# Install via ADB
adb install build-*.apk
```

---

## ✅ Test Checklist Post-Install

### App Basics
- [ ] App si apre senza crash
- [ ] Navigation funziona
- [ ] API calls funzionano (Supabase, VIS)
- [ ] Cache funziona
- [ ] Offline mode funziona

### Push Notifications (CRITICAL!)
- [ ] Navigate to `/notification-settings`
- [ ] Tap "Richiedi Permessi"
- [ ] Permission dialog shown → Accept
- [ ] Status: ✅ Abilitate
- [ ] Test Panel → Send test notification
- [ ] ✅ Notification received!

### Background Notifications
- [ ] Send notification da test panel
- [ ] Close app (swipe from recents)
- [ ] ✅ Notification still received!
- [ ] Tap notification
- [ ] ✅ App opens with deep link

### Notification Features
- [ ] Quiet hours configuration works
- [ ] Reminders configuration works
- [ ] Rate limiting works (max 10/hour)
- [ ] Batching works (multiple notifications → grouped)

---

## 🐛 Troubleshooting

### Build Fails

**Error: "google-services.json not found"**
```bash
# Verifica che esista
ls -la google-services.json

# Deve essere nella root del progetto
```

**Solution**: Download da Firebase Console e copia in root.

---

**Error: "Notification icon not found"**
```bash
# Verifica che esista
ls -la assets/images/notification-icon.png
```

**Solution**: Crea notification icon (96x96, monocromatico).

---

### Notifications Not Working

**Check**:
1. ✅ google-services.json presente
2. ✅ Build con EAS (not Expo Go!)
3. ✅ Permission POST_NOTIFICATIONS granted
4. ✅ FCM token visible in logs

**Debug**:
```bash
# Check logs
adb logcat | grep -E "NotificationService|FCM"
```

---

## 📚 Documentation

- **Complete Guide**: `docs/ANDROID_INSTALLATION_GUIDE.md`
- **Notification System**: `docs/NOTIFICATIONS_COMPLETE.md`
- **Web Push**: `docs/WEB_PUSH_SUPPORT.md`

---

## ⏱️ Timeline Estimate

### Quick Path (Testing)
1. ✅ Assets (30 min) - Create notification icon + verify others
2. ✅ Firebase (15 min) - Create project + download google-services.json
3. ✅ EAS Setup (10 min) - Login + configure
4. ⏳ Build (15 min) - EAS build in cloud
5. ✅ Install (5 min) - Download + install APK
6. ✅ Test (15 min) - Verify notifications work

**Total**: ~90 minuti

### Production Path (Play Store)
- Quick Path + Play Console setup: +2 giorni (review time)

---

## 🎯 Next Action

**START HERE**:
1. Create `assets/images/notification-icon.png` (96x96, monocromatico)
2. Setup Firebase → Download google-services.json
3. Run `npx eas login`
4. Run `npx eas build:configure`
5. Run `npx eas build --platform android --profile preview`
6. Wait 15 min → Download APK → Install → Test! 🎉

---

**Status**: ⚠️ Ready to build dopo completare TODO list
**Priority**: 🔴 HIGH - notification-icon.png + google-services.json
