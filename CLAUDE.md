# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-file HTML application** for managing the installation schedule of lifeline systems at Pimental and Belo Monte hydroelectric plants. The project is for Thommen Engenharia working with Norte Energia.

**Main file:** `sistema-linhas-vida.html` - Complete standalone application
**Reference data:** `linhas de vida usinas.md` - Structured specifications for both plants

## Architecture

### Core Structure
- **Single HTML file** containing all CSS, JavaScript, and HTML
- **No build process** - runs directly in browser
- **localStorage persistence** - data saved locally with backup/restore functionality
- **CDN dependencies:** Chart.js, jsPDF, SheetJS, Font Awesome

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
  completed: { extremidade: 2, J: 3, C: 15, K: 17, E: 3, "E/F": 0, D: 0 }
}
```

**Team Configuration:**
- 4 people, 6 hours/day (8-11:30, 13:30-16:30), 80% efficiency
- Productivity calculations based on work days since 2025-09-01

### Key Components

1. **Dashboard Cards** - Overall progress metrics and completion estimates
2. **Data Tables** - Interactive tables for each plant showing line-by-line progress
3. **Progress Modal** - Form to update completed bases by plant/line/type
4. **Charts** - Visual progress by base type and plant using Chart.js
5. **Export Functions** - PDF reports, Excel exports, and data backup/restore

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
- Always validate against `linhas de vida usinas.md` specifications
- Lines must be displayed in numerical order (01, 02, 03... not 01, 10, 11...)
- Progress calculations use proportional distribution since tracking is by type, not by specific line

**File Management:**
- Designed for Google Drive synchronization
- localStorage data persists with the HTML file location
- Backup/restore functions provide data portability

**Dependencies:**
- All external libraries loaded via CDN
- No package manager or build tools required
- Font Awesome for icons, Chart.js for visualizations