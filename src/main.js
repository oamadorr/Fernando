// Carrega o app e expõe as funções registradas no window.App
import "./app.js";

// Initialize on load
window.addEventListener("load", () => {
    if (window.App && typeof window.App.updateAllDisplays === "function") {
        window.App.updateAllDisplays();
    }
});
