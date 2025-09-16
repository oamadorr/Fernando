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
2. **Data Tables** - Interactive tables for each plant showing line-by-line progress with cable steps
3. **Progress Modal** - Form to update completed bases by plant/line/type (password protected)
4. **Cable Steps Tracking** - Four-stage process: Passagem → Crimpagem → Aferição → Tensionamento
5. **Charts** - Visual progress by base type and plant using Chart.js
6. **Export Functions** - PDF reports, Excel exports, and data backup/restore
7. **Firebase Sync** - Real-time data synchronization across devices
8. **Toast Notifications** - User feedback for actions

## Data Specifications

**Pimental (6 lines):**
- Lines 05, 18: Short lines with extremity and K bases
- Lines 01-04: Main lines with E, D, and K bases
- Total: 2 extremity + 26 K + 4 E + 24 D bases

**Belo Monte (18 lines):**
- Lines 19, 71: Special lines with extremity and J bases  
- Lines 01-18: Various configurations with E, E/F, C, and K bases
- Total: 2 extremity + 6 J + 106 K + 86 C + 2 E + 16 E/F bases

## Key Functions

**Progress Calculation:**
- `calculateTotalBases()` - Count all bases across both plants
- `calculateCompletedBases()` - Sum completed bases by type
- `calculateTotalBasesOfType(tipo)` - Count bases of specific type
- Proportional distribution of completed bases across lines

**Data Management:**
- `saveProgressToStorage()` / `loadProgressFromStorage()` - localStorage persistence
- `exportProgressData()` / `importProgressData()` - JSON backup/restore
- `exportToPDF()` / `exportToExcel()` - Report generation

**UI Updates:**
- `updateAllDisplays()` - Refresh all interface elements
- `updateTable(usinaKey, tableId)` - Populate plant-specific tables with numerical sorting
- `updateCharts()` - Refresh Chart.js visualizations

## Important Notes

**Data Consistency:**
- Lines must be displayed in numerical order (01, 02, 03... not 01, 10, 11...)
- Progress calculations use proportional distribution since tracking is by type, not by specific line
- Firebase sync enables real-time collaboration between devices

**UI Styling:**
- CSS custom properties for consistent theming
- Responsive design with mobile-first approach
- Status badges with proper text wrapping (`white-space: nowrap`, `min-width: 120px`)
- Step labels with ellipsis overflow handling for long text like "Aferição"
- Visible comment icons with proper contrast (gray background for table buttons)

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