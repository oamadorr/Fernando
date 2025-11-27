// Main module stub

import * as app from './app.js';

// Reexport functions needed in HTML
const exported = app;

Object.assign(window, exported);

// Initialize on load
window.addEventListener('load', () => {
  if (typeof app.updateAllDisplays === 'function') {
    app.updateAllDisplays();
  }
});
