# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web application for managing lifeline installation schedules at Pimental and Belo Monte hydroelectric plants. Built for Thommen Engenharia and Norte Energia.

**Live deployment:** https://linhasdevida.vercel.app

## Architecture

### Core Structure

- **ES6 Modules** - Fully modularized codebase with dedicated modules for each concern
- **No build process** - Runs directly in browser with native ES6 imports
- **Dual persistence** - localStorage (offline) + Firebase Firestore (real-time sync)
- **CDN dependencies** - Chart.js, jsPDF, SheetJS, Font Awesome, Firebase
- **Vercel deployment** - Automatic deployment from GitHub `main` branch

### Module Organization

```
src/
├── main.js (9 lines)              # Entry point, loads app.js
├── state.js (489 lines)           # Centralized state management
├── app.js (4,516 lines)           # Main orchestrator, wires modules together
├── firebase.js (378 lines)        # Firebase integration & sync
├── persistence.js (155 lines)     # LocalStorage operations
├── calculations.js (314 lines)    # Progress & productivity calculations
│
├── ui/ (1,873 lines total)
│   ├── map.js (392)               # Interactive map visualization
│   ├── updateModal.js (383)       # Main update/edit modal
│   ├── transversalModals.js (265) # Transversal group modals
│   ├── lineModals.js (249)        # Individual line detail modals
│   ├── charts.js (236)            # Chart.js visualizations
│   ├── builtModals.js (205)       # Built information modal
│   ├── modals.js (91)             # Observation modal
│   └── toasts.js (52)             # Toast notifications
│
└── utils/
    └── sanitize.js (95)           # Data sanitization utilities
```

**Total:** ~7,800 lines across 15 modules (vs. original 6000+ lines in single file)

### Key Architectural Patterns

**1. State Management (`state.js`):**
- Centralized state object with all application data
- Setter functions (`setProgressData`, `setLineStepsStatus`, etc.)
- Similar to Redux pattern but simpler

**2. Factory Pattern (UI modules):**
All UI modules export factory functions that receive dependencies:
```javascript
// Example from ui/lineModals.js
export function createLineModalHandlers({
    requireOnlineEdits,
    saveProjectData,
    updateAllDisplays,
    showToast,
    getProjectData,
    getLineStepsStatus,
    // ... more dependencies
}) {
    // Returns public API
    return {
        showLineDetails,
        closeLineDetailsModal,
        enableLineDetailsEdit,
        saveLineDetailsEdit
    };
}
```

**3. Dependency Injection:**
`app.js` creates module instances and wires them together:
```javascript
const { showTransversalDetails, closeTransversalModal } =
    createTransversalHandlers({
        requireOnlineEdits,
        saveProjectData,
        updateAllDisplays,
        // ... dependencies
    });
```

**4. Global Window Exports:**
Functions needed by HTML onclick handlers are exposed via `window`:
```javascript
window.showLineDetails = showLineDetailsHandler;
window.switchMapTab = switchMapTab;
window.openUpdateModal = openUpdateModal;
```

## Development Commands

### Local Development

```bash
# Method 1: Python HTTP server (recommended)
python3 -m http.server 8000
# Open: http://localhost:8000

# Method 2: Live Server extension (VS Code)
# Right-click index.html → "Open with Live Server"
```

**IMPORTANT:** After modifying files in `src/`, hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R) to clear cache.

### Code Quality

```bash
# Lint JavaScript files
npm run lint

# Format all files (JS, CSS, HTML, JSON, MD)
npm run format

# Run Playwright tests
npm run test:playwright
```

### Deployment

- **Automatic:** Push to `main` branch → Vercel auto-deploys
- **Manual:** Upload `index.html` + `src/` folder + logos to any static host
- **URL:** https://linhasdevida.vercel.app

### Git Workflow

**IMPORTANTE:** Todas as mensagens de commit devem ser em **português**

```bash
git commit -m "Adicionar validação de campos no modal de observações"
git commit -m "Corrigir sincronização de lacres no Firebase"
```

## Firebase Data Structure

**CRITICAL:** Firebase is the single source of truth. ALL fields must be synced via realtime listener.

**Document Structure (`projects/{projectId}`):**

```javascript
{
  progressData: {
    pimental: { "01": { K: 5, E: 1, D: 0 }, ... },
    "belo-monte": { "01": { K: 3, C: 2 }, ... },
    oficina: { "72": { M: 0, B: 0 }, ... }
  },
  lineStepsStatus: {
    pimental: {
      "01": {
        passagemCabo: true,
        crimpagemCabo: false,
        afericaoCrimpagem: false,
        tensionamentoCabo: false,
        lacreTensionador: "ABC123",  // String
        lacreLoopAbs: "XYZ789"       // String
      }
    }
  },
  executionDates: {
    pimental: { "01": "2025-11-20", ... },
    "belo-monte": { ... }
  },
  lineObservations: {  // CRITICAL: Must sync in realtime listener
    pimental: { "01": "Observação...", ... }
  },
  builtInformations: {  // CRITICAL: Must sync in realtime listener
    pimental: {
      "01": {
        "distancia_pimental_01_bm_01": "150",
        "distancia_pimental_01_bm_02": "200"
      }
    }
  },
  teamConfig: {
    pessoas: 4,
    horasPorDia: 6,
    aproveitamento: 0.8,
    inicioTrabalhoBruto: Timestamp,
    dataAtual: Timestamp
  },
  manualActiveUsina: "pimental" | "belo-monte" | "oficina" | null,
  updatedAt: Timestamp,
  version: "2.0"
}
```

**Version History Subcollection (`projects/{projectId}/history/{versionId}`):**

- Auto-created on every save
- Keeps last 20 versions
- Includes ALL data fields (progressData, lineStepsStatus, executionDates, lineObservations, builtInformations)

## Critical Rules

### Rule #1: Realtime Listener Must Sync ALL Fields

**Location:** `src/firebase.js` → `setupRealtimeListener()`

When adding a new data field to the application:

1. Add field to Firebase save operation (`saveProjectData()`)
2. **MUST** add field to realtime listener sync logic
3. Test that field persists after page reload

**Example (lines 316-348 in firebase.js):**
```javascript
const newLineObservations = data.lineObservations || {};
const newBuiltInformations = data.builtInformations || {};

if (JSON.stringify(newLineObservations) !== JSON.stringify(state.lineObservations)) {
    setLineObservations(newLineObservations);
    hasChanges = true;
}
```

**Why this matters:** Missing fields in listener causes data loss when Firebase updates (from other users or version restore).

### Rule #2: Progress Calculations Must Include Bases + Cable Steps

ALL progress percentage calculations must use this formula:

```javascript
const totalItems = totalBases + totalCableSteps;
const completedItems = completedBases + completedCableSteps;
const progress = ((completedItems / totalItems) * 100).toFixed(1);
```

Where:
- Total cable steps = 92 lines × 4 steps = 368
- 29 individual lines (Pimental 6, Belo Monte 20, Oficina 3)
- 63 transversal lines (Pimental 12, Belo Monte 51)

**Affected files:** `src/calculations.js`, `src/ui/charts.js`

### Rule #3: Always Null-Check Nested Firebase Data

Firebase data structures may not exist for all lines/usinas:

```javascript
// ✅ CORRECT
if (!builtInformations[usinaKey] || !builtInformations[usinaKey][linha]) {
    return;
}
const pares = builtInformations[usinaKey][linha];

// ❌ WRONG (causes TypeError)
const pares = builtInformations[usinaKey][linha];
```

### Rule #4: Module Dependencies Flow One Direction

```
state.js → (imported by all modules)
    ↓
firebase.js → imports state
    ↓
ui/* → imports state, doesn't import other UI modules
    ↓
app.js → orchestrates everything, imports all modules
```

Never create circular dependencies between modules.

## Data Specifications

**Pimental:**
- 6 individual lines (01-05, 18)
- 12 transversal lines (06-17), grouped as 06-10 and 11-17
- Total: 56 bases

**Belo Monte:**
- 20 individual lines (01-19, 71)
- 51 transversal lines (20-70), grouped in sets of 6 or 3
- Total: 212 bases

**Oficina:**
- 3 lines (72-74)
- Total: 10 bases

**Base types:** A, B, C, D, E, F, G, H, J, K, M

## Modal Architecture

**View Mode (Default):**
- No password required
- Opens via onclick in HTML: `onclick="showLineDetails('pimental', '01')"`
- Read-only display with compact X/Y format (e.g., "5/5")

**Edit Mode:**
- Password required via "Editar" button
- Controlled by CSS: `pointer-events: none` → `pointer-events: auto` when `.edit-mode` class added
- Changes backed up, restored on "Cancelar"
- Only saved to Firebase on "Salvar" button

**Files:**
- `ui/lineModals.js` - Individual lines
- `ui/transversalModals.js` - Transversal groups
- `ui/builtModals.js` - Built information table
- `ui/updateModal.js` - Main progress update modal

## Testing Strategy

### When to Use Playwright

Use for complex interaction bugs:
- ✅ Multi-step user flows (auth → edit → save)
- ✅ Async state issues
- ✅ Console log debugging needed
- ✅ Visual/timing bugs

**Setup:**
```bash
cd /tmp
npm install playwright
npx playwright install chromium
```

**Example test:**
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[CONSOLE] ${msg.text()}`));

  await page.goto('https://linhasdevida.vercel.app');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    // JavaScript runs in browser context
    return window.state?.progressData;
  });

  console.log('Result:', result);
  await browser.close();
})();
```

### When NOT to Use Playwright

- CSS/style fixes
- Text content changes
- Simple logic bugs visible in code
- Refactoring with known changes

## Debugging

**Console Log Emojis:**
```javascript
📊 = Progress calculations
🔧 = Cable steps
🔥 = Firebase operations
🔐 = Authentication
🔄 = UI updates
```

**Browser DevTools:**
- Filter console by emoji
- Check Network tab for Firebase API calls
- Application → Local Storage → View cached data
- Application → IndexedDB → Firebase offline persistence

**Common Issues:**
1. **Data not syncing** → Check Firebase status indicator (top-right)
2. **Progress wrong** → Verify includes bases + steps
3. **Data disappeared** → Check listener syncs all 5 fields
4. **Modal won't open** → Check console for onclick conflicts

## Code Organization in app.js

Despite modularization, `app.js` remains large (4,516 lines) as the orchestrator:

- Lines 1-100: Imports and dependency setup
- Lines 100-500: Module factory instantiation
- Lines 500-1500: Data structures (projectData, transversal groups, etc.)
- Lines 1500-3000: Core business logic (progress updates, filtering)
- Lines 3000-4000: Table rendering functions
- Lines 4000-4500: Password/authentication system
- Lines 4500-end: Initialization and global exports

**Future refactoring opportunity:** Extract table rendering to `ui/tables.js`

## Firebase Admin Scripts

**Prerequisites:**
```bash
npm install firebase-admin playwright
npx playwright install chromium
```

**Available Scripts:**

1. `export-complete-backup.js` - Full export with all 5 data fields
2. `import-backup-to-firebase.js` - Restore from JSON backup
3. `check-history-detailed.js` - List version history
4. `extract-localstorage-data.js` - Automated localStorage extraction

**Service account:** `.firebase/serviceAccountKey.json` (NOT in git)

## Important Implementation Details

**Numerical Sorting:**
Lines must display as `01, 02, 03...` not `01, 10, 11...`
```javascript
linhas.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
});
```

**Timestamp Normalization:**
Firebase Timestamps must be converted to Date objects:
```javascript
const parsed = typeof rawInicio?.toDate === "function"
    ? rawInicio.toDate()
    : new Date(rawInicio);
```

**Event Listener Conflicts:**
Check for existing `onclick` before adding listeners:
```javascript
if (!lineElement.hasAttribute('onclick')) {
    lineElement.addEventListener('click', handler);
}
```

**CSS Custom Properties:**
All colors/sizes use CSS variables in `src/styles.css`:
```css
--primary-blue: #2563eb;
--success-green: #10b981;
--error-red: #ef4444;
```
