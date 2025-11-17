# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-file HTML application** for managing the installation schedule of lifeline systems at Pimental and Belo Monte hydroelectric plants. The project is for Thommen Engenharia working with Norte Energia.

**Main file:** `index.html` - Complete standalone application (168KB)
**Live deployment:** https://linhasdevida.vercel.app

## Architecture

### Core Structure
- **Single HTML file** containing all CSS, JavaScript, and HTML
- **No build process** - runs directly in browser
- **Dual persistence:** localStorage + Firebase Firestore for real-time sync
- **CDN dependencies:** Chart.js, jsPDF, SheetJS, Font Awesome, Firebase
- **Vercel deployment** - automatic deploy from GitHub main branch

### Data Architecture

**Project Data Structure:**
```javascript
projectData = {
  pimental: { name, linhas: { "01": { metragem, bases: { tipo: quantidade } } } },
  "belo-monte": { name, linhas: { ... } }
}
```

**Progress Tracking:**
```javascript
progressData = {
  pimental: { "01": { K: 5, E: 1, D: 0 }, "02": { ... } },
  "belo-monte": { "01": { K: 3, C: 2 }, "02": { ... } }
}
```

**Cable Installation Steps:**
```javascript
lineStepsStatus = {
  pimental: { "01": { passagemCabo: true, crimpagemCabo: false, afericaoCrimpagem: false, tensionamentoCabo: false } },
  "belo-monte": { "01": { ... } }
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
10. **Toast Notifications** - User feedback for actions

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

**No build process required** - this is a static HTML application.

**Local Development:**
- Open `index.html` directly in browser
- Or use any local server: `python -m http.server 8000`

**Deployment:**
- **Automatic:** Push to `main` branch triggers Vercel deployment
- **Manual:** Upload `index.html` + logo files to any static host
- **URL:** https://linhasdevida.vercel.app

## Project Structure

```
├── index.html          # Main application (168KB)
├── thommen-logo.png    # Company logo (48KB)
├── norte-energia-logo.png # Client logo (126KB)
├── README.md           # Project documentation
└── .vercel-trigger     # Forces Vercel redeployment
```