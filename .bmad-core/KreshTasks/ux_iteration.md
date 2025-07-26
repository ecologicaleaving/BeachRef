# UI Healing System

## Configuration
```
APPLICATION_URL = "https://wikigaialab.vercel.app/"
DOCS_PATH = "/docs/ui/"
SCORE_THRESHOLD = 8
```

## Step 1: Screenshot Capture
Take a screenshot of each screen in question using the Playwright MCP:
- Navigate to APPLICATION_URL using `browser_navigate`
- Use `browser_snapshot()` to discover all pages/components
- Capture each screen with `browser_take_screenshot(filename="screen_name.png")`
- Save screenshots with descriptive names for tracking

## Step 2: Evaluation
Reference the directory `/docs/ui/` and analyze the files:
- `front_end_spec.md` - Technical specifications
- `identity.md` & `identity_template.md` - Brand identity guidelines
- `interactivity.md` & `interactivity_template.md` - UX interaction rules
- `logo-guidelines.md` - Logo usage and branding
- `wikigaiaLogo.png` - Visual brand reference

Based on those files, grade the screenshots from Step 1 objectively against that standard.
Give your response on a scale of 1 to 10 for each screen, with detailed reasoning:
- Layout compliance
- Visual design adherence  
- UX rules conformity
- Overall quality

## Step 3: Healing Process
For any screens or components that have a score less than 8 out of 10:
1. Document specific issues identified vs style guide standards
2. Make necessary changes (or provide detailed fix recommendations)
3. Take new screenshot of the updated screen
4. Return to Step 2 for re-evaluation
5. Repeat until score ≥ 8/10

## Step 4: Documentation
Upon completion, provide:
- Final scores for all screens
- Before/after screenshots for any screens that were modified
- Summary of changes made during healing process

## Quick Start Command

**Per avviare immediatamente l'iterazione, usa:**

```
*ux-iteration
```

Questo comando attiverà automaticamente l'intero processo di UI Healing.

---

## Come Avviare l'Iterazione

### Metodo 1: Quick Start
```
*ux-iteration
```

### Metodo 2: Manuale

### 1. Prerequisiti
Assicurati di avere configurato Playwright MCP in Claude Code:
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### 2. Avvia Claude Code
```bash
claude code
```

### 3. Configura l'URL
Sostituisci `[YOUR_APPLICATION_URL]` nella sezione Configuration con l'URL reale della tua applicazione.

### 4. Prompt di Avvio
Copia e incolla questo comando per iniziare:

```
START the UI Healing process now. 

Begin with Step 1: Navigate to the application URL and start capturing screenshots of all available screens using Playwright MCP.
```

### 5. Monitoring
Claude Code ti mostrerà in tempo reale:
- Quale pagina sta analizzando
- Gli screenshot catturati  
- I punteggi assegnati (1-10)
- Le modifiche suggerite per migliorare

### 6. Processo Automatico
Il sistema procederà automaticamente:
1. Screenshot di tutte le schermate
2. Analisi vs documenti in `/docs/ui/`
3. Punteggi per ogni schermata
4. Healing automatico per score < 8
5. Re-test fino a raggiungere score ≥ 8
6. Report finale con before/after

**Ready to start? Sostituisci l'URL e lancia il comando di avvio!** 🚀