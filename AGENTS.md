# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **modularized web application** for managing the installation schedule of lifeline systems at Pimental and Belo Monte hydroelectric plants. The project is for Thommen Engenharia working with Norte Energia.

**Main files:**
- `index.html` (1,161 lines) - HTML structure and CDN dependencies
- `src/styles.css` (2,643 lines) - All CSS styles
- `src/app.js` (5,925 lines) - All JavaScript logic

**Live deployment:** https://linhasdevida.vercel.app

## Architecture

### Core Structure
- **Modular architecture** - HTML, CSS, and JavaScript in separate files
- **No build process** - runs directly in browser
- **Dual persistence:** localStorage + Firebase Firestore for real-time sync
- **CDN dependencies:** Chart.js, jsPDF, SheetJS, Font Awesome, Firebase
- **Vercel deployment** - automatic deploy from GitHub main branch

### File Organization
```
/
├── index.html          # HTML structure + CDN script imports
├── src/
│   ├── styles.css     # All CSS (variables, components, responsive)
│   └── app.js         # All JavaScript (Firebase, UI logic, data management)
├── thommen-logo.png
└── norte-energia-logo.png
```

**IMPORTANT:** When editing CSS or JavaScript, modify files in `src/` folder, NOT inline in `index.html`. The HTML file only contains structure and references to external files.

### Data Architecture

**CRITICAL: Complete Data Structure in Firebase**

The application uses **dual persistence** (localStorage + Firebase), but Firebase is the **single source of truth**. ALL data fields must be synced via the realtime listener.

**Firebase Document Structure (`projects/{projectId}`):**
```javascript
{
  // ALWAYS include ALL these fields when syncing
  progressData: {
    pimental: { "01": { K: 5, E: 1, D: 0 }, "02": { ... } },
    "belo-monte": { "01": { K: 3, C: 2 }, "02": { ... } }
  },
  lineStepsStatus: {
    pimental: {
      "01": {
        passagemCabo: true,
        crimpagemCabo: false,
        afericaoCrimpagem: false,
        tensionamentoCabo: false,
        lacreTensionador: "ABC123",  // CRITICAL: Must sync
        lacreLoopAbs: "XYZ789"       // CRITICAL: Must sync
      }
    },
    "belo-monte": { "01": { ... } }
  },
  executionDates: {
    pimental: { "01": "2025-11-20", "02": "2025-11-21" },
    "belo-monte": { ... }
  },
  lineObservations: {  // CRITICAL: Must sync
    pimental: { "01": "Observação importante...", "02": "..." },
    "belo-monte": { ... }
  },
  builtInformations: {  // CRITICAL: Must sync
    pimental: {
      "01": {
        "distancia_pimental_01_bm_01": "150",
        "distancia_pimental_01_bm_02": "200"
      }
    },
    "belo-monte": { ... }
  },
  teamConfig: {
    pessoas: 4,
    horasPorDia: 6,
    eficiencia: 0.8,
    inicioTrabalhoBruto: Timestamp,
    dataAtual: Timestamp
  },
  manualActiveUsina: "pimental" | "belo-monte" | null,
  updatedAt: Timestamp,
  version: "2.0"
}
```

**Version History Subcollection (`projects/{projectId}/history/{versionId}`):**
```javascript
{
  progressData: { ... },      // Snapshot of all fields
  lineStepsStatus: { ... },
  executionDates: { ... },
  lineObservations: { ... },
  builtInformations: { ... },
  teamConfig: { ... },
  savedAt: Timestamp,
  note: "Backup automático",
  version: "2.0"
}
```

**Team Configuration:**
- 4 people, 6 hours/day (8-11:30, 13:30-16:30), 80% efficiency
- Productivity calculations based on work days since 2025-09-01

### Key Components

1. **Dashboard Cards** - Overall progress metrics and completion estimates
2. **Interactive Map** - Visual representation of all lines with click-to-view details
3. **Line Details Modal** - Individual line view with compact X/Y format (e.g., "5/5" for completed/total)
4. **Transversal Lines Modal** - Groups of lines displayed in horizontal table format
5. **Data Tables** - Interactive tables for each plant with view/edit mode
6. **Cable Steps Tracking** - Four-stage process: Passagem → Crimpagem → Aferição → Tensionamento
7. **Charts** - Visual progress by base type and plant using Chart.js
8. **Export Functions** - PDF reports, Excel exports, and data backup/restore
9. **Firebase Sync** - Real-time data synchronization across devices
10. **Version History System** - Automatic snapshots with restoration capability (max 20 versions)
11. **Toast Notifications** - User feedback for actions

### Version History System

**Automatic Snapshots:**
- Created whenever data is saved to Firebase (`saveProjectData()`)
- Stored in subcollection: `projects/{projectId}/history/{versionId}`
- Auto-cleanup: Keeps only 20 most recent versions
- Each snapshot includes ALL 5 data fields + metadata

**Restoration Flow:**
1. User clicks "Histórico de Versões" button in dashboard
2. Modal displays versions sorted by date (newest first)
3. Shows progress percentage, timestamp, and note for each version
4. User selects version and clicks "Restaurar"
5. Password required for confirmation
6. Data restored to Firebase and automatically synced to all clients via realtime listener
7. New snapshot created with note "Restaurado da versão [date]"

**CRITICAL:** When restoring, the version data is saved to the main document, which triggers the realtime listener on all connected clients, ensuring everyone sees the restored data immediately.

## Data Specifications

**Pimental (6 individual lines + 12 transversal):**
- Lines 01-04: Main horizontal lines with various base types (A, B, C, D, E, F, G, H, K)
- Lines 05, 18: Vertical side lines with J bases
- Lines 06-17: Transversal lines grouped as 06-10 and 11-17 (all J type bases)

**Belo Monte (20 individual lines + 52 transversal):**
- Lines 01-18: Main horizontal lines with various base types (A, B, C, D, E, F, G, H, K)
- Lines 19, 71: Vertical side lines with J bases
- Lines 20-71: Transversal lines grouped in multiple sets (all J type bases)

**Oficina (3 lines):**
- Line 72: Left vertical (M, B bases)
- Line 73: Horizontal center (K bases)
- Line 74: Right vertical (B, H bases)

## Key Functions

**Modal System:**
- `showLineDetails(usinaKey, linha)` - Opens individual line modal with compact X/Y format (NO password required)
- `showTransversalDetails(usinaKey, grupo)` - Opens transversal group modal (NO password required)
- `enableLineDetailsEdit()` / `enableTransversalEdit()` - Activates edit mode (REQUIRES password)
- `openLineModal(usinaKey, linha)` - Legacy function (REQUIRES password - used for lines without onclick)

**Authentication Flow:**
- Password is ONLY required when clicking "Editar" button, NOT when opening modals
- `isAuthenticated` flag controls edit permissions
- Event listeners check for `onclick` attribute before adding click handlers to avoid conflicts

**Progress Calculation:**
- `calculateTotalBases()` - Count all bases across both plants
- `calculateCompletedBases()` - Sum completed bases by type
- `updateAllDisplays()` - Refresh all interface elements including map visuals

**Data Management:**
- `saveProgressToStorage()` / `loadProgressFromStorage()` - localStorage persistence
- `saveProgressToFirebase()` - Cloud sync (automatic when authenticated)
- `exportProgressData()` / `importProgressData()` - JSON backup/restore
- `exportToPDF()` / `exportToExcel()` - Report generation

**UI Updates:**
- `updateTable(usinaKey, tableId)` - Populate tables with numerical sorting (01, 02... not 01, 10...)
- `updateCharts()` - Refresh Chart.js visualizations
- `updateTransversalVisuals()` - Update map line colors based on progress

## Critical Bugs & Solutions (MUST READ)

### Bug #1: Realtime Listener Data Loss (SOLVED)

**Problem:** Data (lacres, observations, Built info) appeared when multiple users worked simultaneously but disappeared after version restoration or page reload.

**Root Cause:** `setupRealtimeListener()` (around line 5047) was only syncing 3 fields:
- ✅ progressData
- ✅ lineStepsStatus
- ✅ executionDates

**IGNORED fields (causing data loss):**
- ❌ lineObservations
- ❌ builtInformations

**Impact:** When Firebase updated (from any save/restore), the listener detected change and overwrote local data WITHOUT the missing fields, effectively "erasing" them from user's view.

**Solution (Lines 5066-5093):**
```javascript
const newProgressData = data.progressData ? sanitizeProgressData(data.progressData) : null;
const newLineStepsStatus = data.lineStepsStatus || {};
const newExecutionDates = sanitizeExecutionDates(data.executionDates || {});
const newLineObservations = data.lineObservations || {};        // CRITICAL: Added
const newBuiltInformations = data.builtInformations || {};      // CRITICAL: Added

// Sync ALL fields including new ones
if (JSON.stringify(newLineObservations) !== JSON.stringify(lineObservations)) {
    lineObservations = newLineObservations;
    hasChanges = true;
}
if (JSON.stringify(newBuiltInformations) !== JSON.stringify(builtInformations)) {
    builtInformations = newBuiltInformations;
    hasChanges = true;
}
```

**RULE:** When adding ANY new data field to the application, you MUST update `setupRealtimeListener()` to sync that field. Otherwise, data loss will occur.

### Bug #2: Progress Calculation Inconsistency (SOLVED)

**Problem:** Version history modal showed 65.1% but dashboard showed 42.4% after restoration.

**Root Cause:** Modal calculated progress using ONLY bases (287/441 = 65.1%), while dashboard included bases + cable steps (343/809 = 42.4%).

**Solution (Lines 8787-8824):** Updated modal `calculateProgress()` to match dashboard formula:
```javascript
// Calculate bases
let completedBases = 0;
let totalBases = 0;
// ... count bases ...

// Calculate cable steps
let completedCableSteps = 0;
for (const usina in data.lineStepsStatus) {
    for (const linha in data.lineStepsStatus[usina]) {
        const steps = data.lineStepsStatus[usina][linha];
        if (steps.passagemCabo) completedCableSteps++;
        if (steps.crimpagemCabo) completedCableSteps++;
        if (steps.afericaoCrimpagem) completedCableSteps++;
        if (steps.tensionamentoCabo) completedCableSteps++;
    }
}

// Total cable steps = 92 lines × 4 steps
const totalCableSteps = 368;

// Combined progress (bases + steps)
const totalItems = totalBases + totalCableSteps;
const completedItems = completedBases + completedCableSteps;
const progress = ((completedItems / totalItems) * 100).toFixed(1);
```

**RULE:** ALL progress calculations must include both bases AND cable steps for consistency.

### Bug #3: Built Table Rendering Error (SOLVED)

**Problem:** `TypeError: Cannot read properties of undefined (reading '01')` when opening Built modal.

**Root Cause:** Code accessed `builtInformations[usina][linha]` without checking if structure existed first.

**Solution (Lines 7602-7608):**
```javascript
linhas.forEach(linha => {
    // CRITICAL: Check structure exists before accessing
    if (!builtInformations[usinaKey] || !builtInformations[usinaKey][linha]) {
        return;
    }
    const pares = builtInformations[usinaKey][linha];
    if (!pares) return;
    // ... rest of logic
});
```

**RULE:** Always null-check nested Firebase data structures before accessing, as they may not exist for all lines/usinas.

### Firebase Admin Scripts

**Service Account:** `.firebase/serviceAccountKey.json` (project: `fernando-bce22`)

**Setup:**
```bash
npm install firebase-admin playwright
npx playwright install chromium
```

**Available Scripts:**

1. **Export Complete Backup:**
```bash
node export-complete-backup.js
# Creates: backup-completo-YYYY-MM-DD.json
# Includes: ALL 5 data fields + statistics
```

2. **Import Backup to Firebase:**
```bash
node import-backup-to-firebase.js
# Reads: backup-linhas-vida-YYYY-MM-DD.json
# Imports old backup format to Firebase with all fields
```

3. **Check History Detailed:**
```bash
node check-history-detailed.js
# Lists all version history snapshots
# Shows: timestamp, bases, steps, lacres for each version
```

4. **Extract localStorage (Automated):**
```bash
node extract-localstorage-data.js
# Opens browser, extracts localStorage, saves JSON
# Creates: localstorage-backup-YYYY-MM-DD.json
```

5. **Extract localStorage (Manual):**
```bash
open extract-localStorage-manual.html
# User opens in same browser/computer where data was filled
# Click "Extrair Dados" → "Baixar Arquivo JSON"
# Send file back for import
```

**IMPORTANT:** When creating backup/restore scripts, ALWAYS include all 5 data fields:
1. progressData
2. lineStepsStatus (with lacres!)
3. executionDates
4. lineObservations
5. builtInformations

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read: if true;
      allow write: if true;

      match /history/{versionId} {
        allow read: if true;
        allow write: if true;
      }
    }
  }
}
```

## Important Notes

**Modal Architecture:**
- All 29 individual lines (Pimental 6, Belo Monte 20, Oficina 3) use `onclick="showLineDetails()"` in HTML
- Transversal line groups use `onclick="showTransversalDetails()"`
- `initializeMapEvents()` checks for existing `onclick` before adding event listeners to avoid conflicts
- Modal format: Compact **X/Y** display (e.g., "5/5" instead of separate columns for completed/total)
- Modal width: 1000px, centered with `text-align: center` for all cells
- Edit mode shows input field with "/total" suffix (e.g., [input]/5)

**Authentication Pattern:**
- View mode: NO password required (default state)
- Edit mode: Password REQUIRED via `enableLineDetailsEdit()` or `enableTransversalEdit()`
- CSS: `pointer-events: none` on `.editable-step` cells in view mode
- CSS: `pointer-events: auto` only when table has `.edit-mode` class
- Backup/restore pattern: Changes only saved on "Salvar", "Cancelar" restores from backup

**Data Consistency:**
- Lines must be displayed in numerical order (01, 02, 03... not 01, 10, 11...)
- Each line has specific base types defined in `projectData`
- Progress tracked per line per type in `progressData`
- Cable steps tracked separately in `lineStepsStatus`
- Firebase sync enables real-time collaboration between devices

**UI Styling:**
- CSS custom properties for consistent theming
- Modal: `.transversal-modal-content` for both individual and group modals
- Table: `.transversal-details-table` for horizontal format with dynamic columns
- Responsive design with mobile-first approach
- Hover animations on map lines: `transform: translateY(-50%) scale(1.1)` to preserve centering

**File Management:**
- Designed for Google Drive synchronization
- localStorage data persists with the HTML file location
- Backup/restore functions provide data portability

**Dependencies:**
- All external libraries loaded via CDN
- No package manager or build tools required
- Font Awesome for icons, Chart.js for visualizations

## Development Commands

**No build process required** - this is a static modular application.

**Local Development:**
```bash
# Method 1: Python HTTP server (recommended)
python3 -m http.server 8000
# Open: http://localhost:8000

# Method 2: Open directly in browser (may have CORS issues with Firebase)
open index.html
```

**File Structure for Editing:**
- **HTML changes:** Edit `index.html`
- **CSS changes:** Edit `src/styles.css`
- **JavaScript changes:** Edit `src/app.js`

**Deployment:**
- **Automatic:** Push to `main` branch triggers Vercel deployment
  - Vercel automatically deploys all files including `src/` folder
  - No configuration needed - Vercel serves static files as-is
- **Manual:** Upload `index.html`, `src/` folder, and logo files to any static host
- **URL:** https://linhasdevida.vercel.app

**IMPORTANT:** After modifying `src/styles.css` or `src/app.js`, clear browser cache (Cmd+Shift+R or Ctrl+Shift+R) to see changes

**Git Workflow:**
- **IMPORTANTE:** Todas as mensagens de commit devem ser em **português**
- Formato: Descrição clara da mudança em português
- Exemplo: `git commit -m "Adicionar modal de detalhes para linhas individuais"`
- Evitar commits em inglês

## Testing Strategy

**Quando usar Playwright (via Node.js):**

Use testes automatizados com Playwright para:
- ✅ Bugs de interação complexa (modais, autenticação, estados assíncronos)
- ✅ Problemas que envolvem múltiplos componentes interagindo
- ✅ Quando logs do console são necessários para debug
- ✅ Fluxos completos de usuário (login → ação → salvamento)
- ✅ Bugs sutis onde o problema não é óbvio no código
- ✅ Quando preciso verificar comportamento visual ou timing

**Quando NÃO usar Playwright:**

Para mudanças simples, apenas leia código e edite:
- ⚡ Correções de CSS/estilo óbvias
- ⚡ Mudanças de texto ou conteúdo
- ⚡ Bugs de lógica simples visíveis no código
- ⚡ Refatorações onde sei exatamente o que mudar

**Estrutura de teste Playwright:**

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Visual
  const page = await browser.newPage();

  // Capturar logs do console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔧') || text.includes('🔐')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  await page.goto('https://linhasdevida.vercel.app');
  await page.waitForTimeout(2000);

  // Testes aqui...
  const result = await page.evaluate(() => {
    // JavaScript no contexto do browser
    return { ... };
  });

  console.log('Resultado:', result);
  await browser.close();
})();
```

**Setup:**
```bash
cd /tmp
npm install playwright
npx playwright install chromium
node test_script.js
```

**Exemplo de caso resolvido com Playwright:**
- Bug: Botões de etapas não clicáveis após autenticação
- Descoberta via logs: `pendingAction` era `function` mas virava `null` antes de executar
- Causa: `closePasswordModal()` resetava `pendingAction` antes de `checkPassword()` executá-la
- Solução: Salvar `pendingAction` em variável local antes de fechar modal

## Debugging

**Console Logs:**
The application includes extensive debug logging with emojis for easy filtering:

```javascript
// Progress calculation
console.log('📊 calculateProgress:', { totalBases, completedBases, progressPercent });

// Cable steps tracking
console.log('🔧 calculateCableStepsCompleted:', { totalLines, completedSteps });

// Firebase sync
console.log('🔄 updateAllDisplays chamado');
console.log('🔥 Firebase dados carregados:', data);

// Authentication
console.log('🔐 Autenticação bem-sucedida');
```

**Browser DevTools Filtering:**
- Filter console by: `🔧` (cable steps), `📊` (progress), `🔥` (Firebase), `🔐` (auth)
- Check Network tab for Firebase API calls
- Application tab → Local Storage → View cached data
- Application tab → IndexedDB → Firebase offline persistence

**Common Issues:**

1. **Data not syncing:** Check Firebase connection status indicator (top-right)
2. **Progress percentage wrong:** Verify `calculateProgress()` includes both bases + cable steps
3. **Data disappeared after restore:** Check `setupRealtimeListener()` syncs ALL 5 fields
4. **Modal not opening:** Check browser console for `onclick` conflicts
5. **Lacres/observations missing:** Verify `lineStepsStatus` and `lineObservations` are synced

## Project Structure

```
├── index.html                      # Main HTML structure (1,161 lines)
├── src/
│   ├── styles.css                  # All CSS styles (2,643 lines)
│   └── app.js                      # All JavaScript logic (5,925 lines)
│
├── thommen-logo.png                # Company logo (48KB)
├── norte-energia-logo.png          # Client logo (126KB)
├── README.md                       # Project documentation
├── CLAUDE.md                       # Development guide (this file)
├── .vercel-trigger                 # Forces Vercel redeployment
├── .gitignore                      # Excludes .firebase/, backups, node_modules
│
├── .firebase/
│   └── serviceAccountKey.json      # Firebase Admin SDK credentials (NOT in git)
│
└── Firebase Admin Scripts:
    ├── export-complete-backup.js       # Export full backup with all fields
    ├── import-backup-to-firebase.js    # Import old backup to Firebase
    ├── extract-localstorage-data.js    # Automated localStorage extraction
    └── extract-localStorage-manual.html # Manual localStorage extraction tool
```

**Code Organization in `src/app.js`:**
The JavaScript file follows this structure (approximate line ranges):
- Lines 1-500: Firebase configuration and initialization
- Lines 500-1500: Data structures and global variables
- Lines 1500-3000: Core functions (progress calculation, data management)
- Lines 3000-4500: UI update functions (tables, charts, modals)
- Lines 4500-5500: Firebase sync and realtime listener
- Lines 5500-5925: Export/import functions and initialization

**Code Organization in `src/styles.css`:**
The CSS file follows this structure:
- Lines 1-300: Reset, variables, base styles
- Lines 300-800: Dashboard and metrics
- Lines 800-1600: Map visualization and interactive elements
- Lines 1600-2200: Tables and data display
- Lines 2200-2643: Modals, forms, and responsive design