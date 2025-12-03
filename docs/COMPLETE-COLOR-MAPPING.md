# Mapping Completo: Tutti i Colori → Palette Originale

## Palette Originale (UNICA fonte di verità)

### Primitive
```
Brand Blues:
--brandBlue-900: #0B2545
--brandBlue-700: #173D77
--brandBlue-600: #1F5AA6
--brandBlue-500: #2D79D8
--brandBlue-300: #7DBAF8

Neutrals:
--neutral-50:  #FFFFFF (bianco)
--neutral-100: #F7FAFE (azzurrino pallidissimo)
--neutral-200: #E3ECF7 (azzurrino chiaro - bordi)
--neutral-300: #CFE3FA (azzurrino medio)
--neutral-500: #90A4BF (grigio-azzurro)
--neutral-700: #5F6E86 (grigio scuro)
--neutral-900: #0D1A2B (quasi nero)

Stati:
--red-500:  #D92D20
--red-50:   #FEE4E2
--info-500: #1F5AA6 (= brandBlue-600)
--info-50:  #E9F2FF
--green-500: #027A48
--green-50:  #EAF7F0
```

### Semantici
```
--bg-page: var(--neutral-50)
--bg-surface: var(--neutral-100)
--border-subtle: var(--neutral-200)

--text-primary: var(--neutral-900)
--text-secondary: var(--neutral-700)

--link-default: var(--brandBlue-500)
--link-hover: var(--brandBlue-600)

--button-primary-bg: var(--brandBlue-500)
--button-primary-hover: var(--brandBlue-600)

--state-live-text: var(--red-500)
--state-live-bg: var(--red-50)

--state-scheduled-text: var(--brandBlue-600)
--state-scheduled-bg: var(--info-50)

--state-completed-text: var(--green-500)
--state-completed-bg: var(--green-50)
```

---

## Mapping Decisionale (Top 50 colori)

### BIANCHI / GRIGI CHIARISSIMI → neutral-50 (#FFFFFF)
- `#FFFFFF` (252×) → `neutral-50` ✅ ESATTO
- `#F9FAFB` (25×) → `neutral-50` (distanza 8.8)
- `#F8FAFC` (16×) → `neutral-50` (distanza 9.1)
- `#FAFAFA` (2×) → `neutral-50` (distanza 8.7)
- `#F8F9FA` (10×) → `neutral-50` (distanza 10.5)

### AZZURRINI PALLIDISSIMI → neutral-100 (#F7FAFE)
- `#F3F4F6` (51×) → `neutral-100` (distanza 10.8) - grigi molto chiari
- `#F5F5F5` (28×) → `neutral-100` (distanza 10.5) - grigi molto chiari
- `#F0F9FF` (5×) → `neutral-100` (distanza 7.1)
- `#EFF6FF` (8×) → `neutral-100` (distanza 9.0)
- `#F0FDF4` (7×) → `neutral-100` (distanza 12.6) - verdini chiari

### BORDI / DIVIDER → neutral-200 (#E3ECF7)
- `#E5E7EB` (78×) → `neutral-200` (distanza 13.2) - grigio chiaro bordi
- `#E0E0E0` (26×) → `neutral-200` (distanza 30+) - grigio neutro bordi
- `#E3F2FD` (6×) → `neutral-200` (distanza 8.5)
- `#D1D5DB` (24×) → `neutral-200` (distanza 20+) - grigio toggle

### AZZURRINI MEDI → neutral-300 (#CFE3FA)
- `#CFE3FA` → già in palette ✅

### TESTI SECONDARI / GRIGI MEDI → neutral-700 (#5F6E86)
- `#6B7280` (158×) → `neutral-700` (distanza 14.0) - grigio secondario
- `#666666` (88×) → `neutral-700` (distanza 30+) - grigio scuro
- `#9CA3AF` (28×) → `neutral-700` (distanza 30+) - grigio placeholder
- `#999999` (17×) → `neutral-700` (distanza 40+) - grigio medio
- `#9E9E9E` (14×) → `neutral-700` (distanza 40+) - grigio medio

### TESTI PRIMARI / QUASI NERI → neutral-900 (#0D1A2B)
- `#000000` (91×) → `neutral-900` (distanza 40+) - nero puro
- `#333333` (72×) → `neutral-900` (distanza 50+) - grigio molto scuro
- `#374151` (62×) → `neutral-900` (distanza 50+) - slate scuro
- `#111827` (25×) → `neutral-900` (distanza 6.0) - quasi nero

### BLU SCURI HEADER → brandBlue-900 (#0B2545)
- `#1B365D` (122×) → `brandBlue-900` (distanza 20+) - blu scuro header

### BLU MEDI LINKS → brandBlue-500 (#2D79D8)
- `#2196F3` (18×) → `brandBlue-500` (distanza 30+) - blu link
- `#0066CC` (18×) → `brandBlue-500` (distanza 40+) - blu button
- `#007AFF` (15×) → `brandBlue-500` (distanza 40+) - iOS blue
- `#3B82F6` (32×) → `brandBlue-500` (distanza 30+) - blue-500

### ROSSI LIVE → red-500 (#D92D20)
- `#DC2626` (17×) → `red-500` (distanza 9.7) - red-600
- `#F44336` (30×) → `red-500` (distanza 40+) - material red

### ROSSI CHIARI BG → red-50 (#FEE4E2)
- `#FEE2E2` (3×) → `red-50` (distanza 2.0)
- `#FFE5E5` (2×) → `red-50` (distanza 3.3)
- `#FFEBEE` (3×) → `red-50` (distanza 13.9)

### VERDI SUCCESS → green-500 (#027A48)
- `#4CAF50` (39×) → `green-500` (distanza 60+) - material green
- `#10B981` (15×) → `green-500` (distanza 40+) - emerald

### VERDI CHIARI BG → green-50 (#EAF7F0)
- `#E8F5E8` (3×) → `green-50` (distanza 8.5)
- `#ECFDF5` (1×) → `green-50` (distanza 14.5)

### SCHEDULED BG → info-50 (#E9F2FF)
- `#E9F2FF` → già in palette ✅

### COLORI SPECIALI (da decidere caso per caso)
- `#FF9800` (42×) - Analytics arancione → `red-500` o custom?
- `#FF6B35` (32×) - Vecchio brand arancione → `brandBlue-500`
- `#F59E0B` (15×) - Amber qualification → `red-500` o warning custom?
- `#4A90A4` (16×) - Teal specifico → `brandBlue-600`

---

## Regola di Mapping

**Per ogni colore hardcoded:**

1. **Se ESATTO nella palette** → usa quello
2. **Se simile (distanza <15)** → usa il più vicino
3. **Se lontano ma stesso ruolo** → usa il semantico appropriato:
   - Grigio chiaro bordo → `neutral-200`
   - Grigio scuro testo → `neutral-700` o `neutral-900`
   - Blu qualsiasi → `brandBlue-*` (scegli shade per contesto)
   - Rosso qualsiasi → `red-500` o `red-50`
   - Verde qualsiasi → `green-500` or `green-50`

4. **Colori analytics/speciali** → Segnala per custom token se necessario

---

## Principio Chiave

**NON importa se il colore cambia leggermente** (es. `#E5E7EB` → `#E3ECF7`).
L'obiettivo è **consolidare 130 colori in ~20**, accettando micro-differenze visive per ottenere coerenza.
