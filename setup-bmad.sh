#!/bin/bash

echo "🚀 Creando setup BMad Agents con terminali unificati e colorati..."

# Crea le cartelle
mkdir -p .vscode
mkdir -p scripts

echo "📁 Cartelle create: .vscode/ e scripts/"

# Crea settings.json con terminal profiles colorati
cat > .vscode/settings.json << 'EOF'
{
  "terminal.integrated.defaultLocation": "editor",
  "terminal.integrated.tabs.location": "bottom", 
  "terminal.integrated.tabs.enabled": true,
  "terminal.integrated.tabs.showActions": "always",
  "terminal.integrated.showExitAlert": false,
  "workbench.panel.defaultLocation": "bottom",
  "terminal.integrated.tabs.focusMode": "singleClick",
  "terminal.integrated.tabs.hideCondition": "never",
  "workbench.editor.showTabs": true,
  "workbench.editor.enablePreview": false,
  "terminal.integrated.tabs.title": "${process}",
  "terminal.integrated.tabs.description": "${task}${separator}${local}",
  "terminal.integrated.profiles.osx": {
    "🏗️ Architetto": {
      "path": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:architect"],
      "color": "terminal.ansiYellow",
      "icon": "tools"
    },
    "📊 SM": {
      "path": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:sm"],
      "color": "terminal.ansiBrightWhite", 
      "icon": "organization"
    },
    "🎯 PO": {
      "path": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:po"],
      "color": "terminal.ansiRed",
      "icon": "project"
    },
    "💻 DEV": {
      "path": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:dev"],
      "color": "terminal.ansiGreen",
      "icon": "code"
    },
    "🧪 QA": {
      "path": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:qa"],
      "color": "terminal.ansiCyan",
      "icon": "bug"
    },
    "🎨 UX-Expert": {
      "path": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:ux-expert"],
      "color": "terminal.ansiBlue",
      "icon": "paintbrush"
    }
  },
  "workbench.colorCustomizations": {
    "terminal.tab.activeBorder": "#ffcc00",
    "terminal.tab.inactiveForeground": "#888888", 
    "terminal.tab.activeForeground": "#ffffff",
    "terminal.foreground": "#ffffff",
    "terminalCursor.foreground": "#ffffff",
    "terminal.ansiYellow": "#ffcc00",
    "terminal.ansiRed": "#ff4444", 
    "terminal.ansiGreen": "#44ff44",
    "terminal.ansiCyan": "#44ffff",
    "terminal.ansiBlue": "#4444ff",
    "terminal.ansiBrightWhite": "#ffffff"
  },
  "terminal.integrated.env.osx": {
    "TERM_PROGRAM": "Cursor"
  }
}
EOF

echo "⚙️  File .vscode/settings.json creato con terminal profiles colorati"

# Crea tasks.json che usa i comandi workbench
cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Setup BMad Agents",
      "type": "shell",
      "command": "bash",
      "args": ["./scripts/open-terminals.sh"],
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared",
        "close": false
      },
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": []
    },
    {
      "label": "Open Architetto",
      "type": "shell",
      "command": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:architect"],
      "presentation": {
        "echo": false,
        "reveal": "always",
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Open SM", 
      "type": "shell",
      "command": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:sm"],
      "presentation": {
        "echo": false,
        "reveal": "always",
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Open PO",
      "type": "shell", 
      "command": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:po"],
      "presentation": {
        "echo": false,
        "reveal": "always",
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Open DEV",
      "type": "shell",
      "command": "/Users/davidecrescentini/.claude/local/claude", 
      "args": ["/BMad:agents:dev"],
      "presentation": {
        "echo": false,
        "reveal": "always",
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Open QA",
      "type": "shell",
      "command": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:qa"],
      "presentation": {
        "echo": false,
        "reveal": "always", 
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Open UX-Expert",
      "type": "shell",
      "command": "/Users/davidecrescentini/.claude/local/claude",
      "args": ["/BMad:agents:ux-expert"],
      "presentation": {
        "echo": false,
        "reveal": "always",
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
EOF

echo "📋 File .vscode/tasks.json creato"

# Crea script principale che apre tutti i terminali
cat > scripts/open-terminals.sh << 'EOF'
#!/bin/bash
echo "🚀 Setup BMad Agents - Istruzioni per terminali colorati"
echo ""
echo "⚠️  L'automazione richiede permessi di accessibilità su macOS"
echo "📋 METODO MANUALE (veloce e garantito):"
echo ""
echo "Per aprire ogni agente come tab colorato separato:"
echo ""
echo "1️⃣  Cmd+Shift+P"
echo "2️⃣  Digita: 'Terminal: Create New Terminal (With Profile)'"  
echo "3️⃣  Scegli uno dei profili:"
echo ""
echo "   🟡 🏗️ Architetto    (Giallo, icona tools)"
echo "   ⚪ 📊 SM            (Bianco, icona organization)"
echo "   🔴 🎯 PO            (Rosso, icona project)"
echo "   🟢 💻 DEV           (Verde, icona code)"
echo "   🔵 🧪 QA            (Celeste, icona bug)"
echo "   🔷 🎨 UX-Expert     (Blu, icona paintbrush)"
echo ""
echo "4️⃣  Ripeti per ogni agente che vuoi aprire"
echo ""
echo "✨ RISULTATO:"
echo "   - Ogni terminale sarà un tab colorato separato"
echo "   - Tutti nella stessa finestra dell'editor"
echo "   - Claude già avviato con l'agente corretto"
echo "   - Nomi e icone personalizzati"
echo ""
echo "⚡ ALTERNATIVA VELOCE:"
echo "   Usa i task individuali: Cmd+Shift+P → 'Tasks: Run Task'"
echo "   Poi scegli: 'Open Architetto', 'Open SM', etc."
echo ""
echo "🎯 I profili sono già configurati e pronti all'uso!"
EOF

# Crea script di istruzioni manuali
cat > scripts/manual-setup.sh << 'EOF'
#!/bin/bash
echo "📋 ISTRUZIONI BMad + Verifica Colori:"
echo ""
echo "1. Apri Command Palette: Cmd+Shift+P"
echo "2. Digita: 'Terminal: Create New Terminal (With Profile)'"
echo "3. Scegli uno dei profili:"
echo "   🟡 🏗️ Architetto (Giallo)"
echo "   ⚪ 📊 SM (Bianco)" 
echo "   🔴 🎯 PO (Rosso)"
echo "   🟢 💻 DEV (Verde)"
echo "   🔵 🧪 QA (Celeste)"
echo "   🔷 🎨 UX-Expert (Blu)"
echo "4. Ripeti per ogni agente"
echo ""
echo "🎨 VERIFICA COLORI:"
echo "   Se i colori delle tab non si vedono, prova:"
echo "   1. Riavvia Cursor: Cmd+Shift+P → 'Developer: Reload Window'"
echo "   2. Cambia tema: Cmd+Shift+P → 'Preferences: Color Theme'"
echo "   3. Verifica che i profili abbiano le icone corrette"
echo ""
echo "💡 NOTA: I colori delle tab dipendono dal tema di Cursor"
echo "   Le icone e i nomi dovrebbero sempre essere visibili!"
echo ""
echo "🔧 ALTERNATIVA: Usa l'estensione 'Peacock' per colori più visibili"
EOF

# Rendi eseguibili tutti gli script
chmod +x scripts/*.sh

echo "🔧 Permessi di esecuzione impostati"

echo "
✅ Setup BMad Agents completato!

🎯 COME APRIRE I TERMINALI COLORATI (Metodo garantito):

╔════════════════════════════════════════════════════════╗
║  PROCEDURA PER OGNI AGENTE:                           ║
║                                                        ║
║  1. Cmd+Shift+P                                       ║
║  2. Digita: 'Terminal: Create New Terminal'            ║  
║  3. Scegli il profilo agente desiderato               ║
║  4. Il terminale si apre nell'editor con Claude       ║
╚════════════════════════════════════════════════════════╝

🎨 PROFILI DISPONIBILI (già configurati):

   🟡 🏗️ Architetto    → Claude /BMad:agents:architect
   ⚪ 📊 SM            → Claude /BMad:agents:sm  
   🔴 🎯 PO            → Claude /BMad:agents:po
   🟢 💻 DEV           → Claude /BMad:agents:dev
   🔵 🧪 QA            → Claude /BMad:agents:qa
   🔷 🎨 UX-Expert     → Claude /BMad:agents:ux-expert

⚡ ALTERNATIVA VELOCE - Task individuali:
   Cmd+Shift+P → 'Tasks: Run Task' → Scegli:
   - 'Open Architetto'  - 'Open SM'  - 'Open PO'  
   - 'Open DEV'  - 'Open QA'  - 'Open UX-Expert'

🎁 BONUS: Ogni terminale avrà automaticamente:
   ✅ Tab colorato specifico nell'editor
   ✅ Nome personalizzato con emoji  
   ✅ Icona distintiva
   ✅ Claude già avviato con l'agente corretto

💡 SUGGERIMENTO: Apri tutti e 6 i profili per avere il team completo!
"