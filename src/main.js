// Carrega o app e expõe as funções registradas no window
import "./app.js";

// Initialize on load
window.addEventListener("load", () => {
    if (typeof window.updateAllDisplays === "function") {
        window.updateAllDisplays();
    }
});
