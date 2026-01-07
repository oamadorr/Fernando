/**
 * PWA Install Manager
 * Gerencia o prompt de instalação do PWA em desktop e mobile
 */

export function createPWAInstallManager() {
    let deferredPrompt = null;
    let installBanner = null;
    let hasShownBanner = false;

    /**
     * Detectar se é mobile
     */
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }

    /**
     * Detectar iOS
     */
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    /**
     * Detectar se já está instalado
     */
    function isInstalled() {
        return window.matchMedia("(display-mode: standalone)").matches ||
               window.navigator.standalone === true;
    }

    /**
     * Verificar se usuário dispensou recentemente
     */
    function wasRecentlyDismissed() {
        try {
            const dismissedUntil = localStorage.getItem("pwa-install-dismissed");
            if (!dismissedUntil) return false;
            return Date.now() < parseInt(dismissedUntil, 10);
        } catch {
            return false;
        }
    }

    /**
     * Mostrar banner de instalação
     */
    function showInstallBanner() {
        // Não mostrar se já está instalado
        if (isInstalled()) {
            console.log("📱 PWA já está instalado");
            return;
        }

        // Não mostrar se já recusou anteriormente
        if (wasRecentlyDismissed()) {
            console.log("⏭️ PWA install banner dispensado recentemente");
            return;
        }

        // Não mostrar se já apareceu antes
        if (hasShownBanner) return;
        hasShownBanner = true;

        const ios = isIOS();

        // Criar banner
        installBanner = document.createElement("div");
        installBanner.className = "pwa-install-banner";
        installBanner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <img src="/icons/icon-192.png" alt="Linhas de Vida" width="64" height="64">
                </div>
                <div class="pwa-banner-text">
                    <div class="pwa-banner-title">Instalar App</div>
                    <div class="pwa-banner-message">
                        ${ios
                            ? 'Adicione à tela inicial para acesso rápido'
                            : 'Instale o aplicativo para melhor experiência'
                        }
                    </div>
                    ${ios ? `
                        <div class="pwa-banner-ios-hint">
                            <span class="ios-icon-share"></span>
                            Toque em Compartilhar e depois "Adicionar à Tela de Início"
                        </div>
                    ` : ''}
                </div>
                <button class="pwa-banner-install-btn" id="pwaInstallBtn">
                    ${ios ? 'OK' : 'Instalar'}
                </button>
                <button class="pwa-banner-close-btn" id="pwaCloseBtn" aria-label="Fechar">
                    <span class="close-icon">×</span>
                </button>
            </div>
        `;

        document.body.appendChild(installBanner);

        // Adicionar eventos
        const closeBtn = document.getElementById("pwaCloseBtn");
        const installBtn = document.getElementById("pwaInstallBtn");

        if (closeBtn) closeBtn.addEventListener("click", dismissBanner);
        if (installBtn) installBtn.addEventListener("click", handleInstallClick);

        // Animar entrada
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (installBanner) {
                    installBanner.classList.add("pwa-banner-visible");
                }
            }, 100);
        });
    }

    /**
     * Dispensar banner
     */
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

        // Lembrar preferência por 7 dias
        try {
            const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem("pwa-install-dismissed", dismissedUntil.toString());
        } catch (e) {
            console.warn("Não foi possível salvar preferência:", e);
        }
    }

    /**
     * Lidar com clique no botão instalar
     */
    function handleInstallClick() {
        if (deferredPrompt) {
            // Instalação nativa (Chrome/Edge)
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === "accepted") {
                    console.log("✅ PWA instalado");
                } else {
                    console.log("❌ Instalação recusada");
                }
                deferredPrompt = null;
                if (installBanner) dismissBanner();
            }).catch(() => {
                if (installBanner) dismissBanner();
            });
        } else if (isIOS()) {
            // iOS - fechar após instruções
            setTimeout(() => {
                if (installBanner) dismissBanner();
            }, 3000);
        } else {
            if (installBanner) dismissBanner();
        }
    }

    /**
     * Inicializar
     */
    function init() {
        // Se já está instalado, não fazer nada
        if (isInstalled()) {
            console.log("📱 App já está rodando como PWA instalado");
            return;
        }

        // Se dispensou recentemente, não mostrar
        if (wasRecentlyDismissed()) {
            console.log("⏭️ Banner dispensado recentemente");
            return;
        }

        // Listener para beforeinstallprompt (Chrome/Edge Android)
        window.addEventListener("beforeinstallprompt", (e) => {
            console.log("📱 beforeinstallprompt detectado");
            e.preventDefault();
            deferredPrompt = e;

            // Mostrar banner após 2 segundos
            setTimeout(() => {
                if (!hasShownBanner) {
                    showInstallBanner();
                }
            }, 2000);
        });

        // Listener para app instalado
        window.addEventListener("appinstalled", () => {
            console.log("✅ PWA instalado!");
            if (installBanner) dismissBanner();
            try {
                localStorage.removeItem("pwa-install-dismissed");
            } catch (e) {}
        });

        // Para iOS, mostrar banner automaticamente
        if (isIOS()) {
            setTimeout(() => {
                if (!hasShownBanner && !deferredPrompt) {
                    showInstallBanner();
                }
            }, 4000);
        }

        // Para Android/iOS geral, mostrar após delay se beforeinstallprompt não disparou
        if (isMobile()) {
            setTimeout(() => {
                if (!hasShownBanner && !deferredPrompt) {
                    showInstallBanner();
                }
            }, 6000);
        }
    }

    return {
        init,
        showInstallBanner,
        dismissBanner
    };
}
