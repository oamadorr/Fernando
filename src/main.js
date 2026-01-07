// Carrega o app e expõe as funções registradas no window.App
import "./app.js";

// Initialize on load
window.addEventListener("load", () => {
    if (window.App && typeof window.App.updateAllDisplays === "function") {
        window.App.updateAllDisplays();
    }

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register("./sw.js")
            .catch((error) => console.warn("Service worker registration failed:", error));
    }
});
