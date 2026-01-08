/**
 * PWA Install Manager
 * Gerencia o prompt de instalação do PWA
 */

export function createPWAInstallManager() {
    let deferredPrompt = null;
    let installBanner = null;
    let hasShownBanner = false;
    let initTimeout = null;

    // Detectar mobile
    const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = () => /Android/i.test(navigator.userAgent);

    // Detectar se já está instalado
    const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches;

    // Verificar se dispensou recentemente
    const wasRecentlyDismissed = () => {
        try {
            const d = localStorage.getItem("pwa-install-dismissed");
            if (!d) return false;
            return Date.now() < parseInt(d, 10);
        } catch { return false; }
    };

    // Mostrar banner
    function showInstallBanner() {
        if (hasShownBanner) return;
        if (isInstalled()) return;

        hasShownBanner = true;
        if (initTimeout) clearTimeout(initTimeout);

        const ios = isIOS();

        installBanner = document.createElement("div");
        installBanner.className = "pwa-install-banner";
        installBanner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <img src="icons/icon-192.png" alt="App" width="56" height="56" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 56 56%22><rect fill=%222563eb%22 width=%2256%22 height=%2256%22 rx=%228%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2230%22>📱</text></svg>'">
                </div>
                <div class="pwa-banner-text">
                    <div class="pwa-banner-title">Instalar App</div>
                    <div class="pwa-banner-message">
                        ${ios ? 'Adicione à tela inicial' : 'Instale o aplicativo'}
                    </div>
                    ${ios ? `<div class="pwa-banner-ios-hint">Compartilhar → "Adicionar à Tela de Início"</div>` : ''}
                </div>
                <button class="pwa-banner-install-btn" id="pwaInstallBtn">${ios ? 'OK' : 'Instalar'}</button>
                <button class="pwa-banner-close-btn" id="pwaCloseBtn">×</button>
            </div>
        `;

        document.body.appendChild(installBanner);

        setTimeout(() => {
            if (installBanner) installBanner.classList.add("pwa-banner-visible");
        }, 50);

        // Eventos
        const closeBtn = document.getElementById("pwaCloseBtn");
        const installBtn = document.getElementById("pwaInstallBtn");
        if (closeBtn) closeBtn.onclick = dismissBanner;
        if (installBtn) installBtn.onclick = handleInstallClick;
    }

    // Dispensar
    function dismissBanner() {
        if (installBanner) {
            installBanner.classList.remove("pwa-banner-visible");
            setTimeout(() => {
                if (installBanner && installBanner.parentNode) {
                    installBanner.parentNode.removeChild(installBanner);
                    installBanner = null;
                }
            }, 300);
        }
        try {
            localStorage.setItem("pwa-install-dismissed", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
        } catch (e) {}
    }

    // Clique no instalar
    function handleInstallClick() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                deferredPrompt = null;
                dismissBanner();
            });
        } else {
            setTimeout(dismissBanner, 1500);
        }
    }

    // Inicializar
    function init() {
        // Se já instalado ou dispensou, não fazer nada
        if (isInstalled() || wasRecentlyDismissed()) return;

        // Listener beforeinstallprompt
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (!hasShownBanner) {
                initTimeout = setTimeout(showInstallBanner, 1500);
            }
        });

        // Listener appinstalled
        window.addEventListener("appinstalled", () => {
            if (installBanner) dismissBanner();
            try { localStorage.removeItem("pwa-install-dismissed"); } catch (e) {}
        });

        // iOS: mostrar após 3.5s
        if (isIOS()) {
            initTimeout = setTimeout(showInstallBanner, 3500);
        }

        // Android: mostrar após 5s
        if (isAndroid()) {
            initTimeout = setTimeout(showInstallBanner, 5000);
        }

        // Mobile geral: mostrar após 6s (fallback)
        if (isMobile()) {
            initTimeout = setTimeout(showInstallBanner, 6000);
        }
    }

    // Função global para debug/teste
    if (typeof window !== 'undefined') {
        window.pwaTest = function() {
            console.log('PWA Test - showing banner now!');
            localStorage.removeItem("pwa-install-dismissed");
            hasShownBanner = false;
            showInstallBanner();
        };
        window.pwaReset = function() {
            localStorage.removeItem("pwa-install-dismissed");
            console.log('PWA reset - reload the page');
        };
    }

    return { init, showInstallBanner, dismissBanner };
}
