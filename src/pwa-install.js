/**
 * PWA Install Manager
 * Gerencia o prompt de instalação do PWA em desktop e mobile
 */

export function createPWAInstallManager() {
    let deferredPrompt = null;
    let installBanner = null;
    let hasShownBanner = false;
    let initTimeout = null;

    console.log('[PWA] Module loaded');

    /**
     * Detectar se é mobile
     */
    function isMobile() {
        const ua = navigator.userAgent;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    }

    /**
     * Detectar iOS
     */
    function isIOS() {
        const ua = navigator.userAgent;
        return /iPad|iPhone|iPod/.test(ua);
    }

    /**
     * Detectar Android
     */
    function isAndroid() {
        const ua = navigator.userAgent;
        return /Android/i.test(ua);
    }

    /**
     * Detectar se já está instalado
     */
    function isInstalled() {
        return window.matchMedia("(display-mode: standalone)").matches ||
               (window.navigator && window.navigator.standalone === true);
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
        console.log('[PWA] showInstallBanner called');

        // Verificações antes de mostrar
        if (isInstalled()) {
            console.log('[PWA] App já instalado');
            return;
        }

        if (wasRecentlyDismissed()) {
            console.log('[PWA] Dispensado recentemente');
            return;
        }

        if (hasShownBanner) {
            console.log('[PWA] Já mostrado nesta sessão');
            return;
        }

        // Limpar timeout pendente
        if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
        }

        hasShownBanner = true;

        const ios = isIOS();
        const android = isAndroid();

        console.log('[PWA] Criando banner - iOS:', ios, 'Android:', android);

        // Criar banner
        installBanner = document.createElement("div");
        installBanner.className = "pwa-install-banner";
        installBanner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <img src="icons/icon-192.png" alt="App" width="56" height="56">
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
                            Toque em Compartilhar → "Adicionar à Tela de Início"
                        </div>
                    ` : ''}
                </div>
                <button class="pwa-banner-install-btn" id="pwaInstallBtn">
                    ${ios ? 'OK' : 'Instalar'}
                </button>
                <button class="pwa-banner-close-btn" id="pwaCloseBtn">
                    ×
                </button>
            </div>
        `;

        document.body.appendChild(installBanner);
        console.log('[PWA] Banner adicionado ao DOM');

        // Adicionar eventos
        const closeBtn = document.getElementById("pwaCloseBtn");
        const installBtn = document.getElementById("pwaInstallBtn");

        if (closeBtn) {
            closeBtn.addEventListener("click", dismissBanner);
        }
        if (installBtn) {
            installBtn.addEventListener("click", handleInstallClick);
        }

        // Animar entrada
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (installBanner) {
                    installBanner.classList.add("pwa-banner-visible");
                    console.log('[PWA] Banner visível');
                }
            }, 100);
        });
    }

    /**
     * Dispensar banner
     */
    function dismissBanner() {
        console.log('[PWA] Dispensando banner');
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
            const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem("pwa-install-dismissed", dismissedUntil.toString());
        } catch (e) {
            console.warn('[PWA] Erro ao salvar:', e);
        }
    }

    /**
     * Lidar com clique no botão instalar
     */
    function handleInstallClick() {
        console.log('[PWA] Botão instalar clicado, deferredPrompt:', !!deferredPrompt);

        if (deferredPrompt) {
            // Instalação nativa (Chrome Android)
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                console.log('[PWA] Escolha:', choiceResult.outcome);
                deferredPrompt = null;
                if (installBanner) dismissBanner();
            }).catch((err) => {
                console.error('[PWA] Erro no prompt:', err);
                if (installBanner) dismissBanner();
            });
        } else {
            // Sem deferredPrompt - instruir ou fechar
            console.log('[PWA] Sem deferredPrompt');
            setTimeout(() => {
                if (installBanner) dismissBanner();
            }, 1500);
        }
    }

    /**
     * Inicializar
     */
    function init() {
        const mobile = isMobile();
        const ios = isIOS();
        const android = isAndroid();
        const installed = isInstalled();
        const dismissed = wasRecentlyDismissed();

        console.log('[PWA] init - mobile:', mobile, 'iOS:', ios, 'Android:', android, 'installed:', installed, 'dismissed:', dismissed);
        console.log('[PWA] UserAgent:', navigator.userAgent);

        // Se já está instalado
        if (installed) {
            console.log('[PWA] App já instalado, saindo');
            return;
        }

        // Se dispensou recentemente
        if (dismissed) {
            console.log('[PWA] Dispensado recentemente, saindo');
            return;
        }

        // Listener beforeinstallprompt (Chrome/Edge)
        window.addEventListener("beforeinstallprompt", (e) => {
            console.log('[PWA] beforeinstallprompt recebido!');
            e.preventDefault();
            deferredPrompt = e;

            // Mostrar banner após 1.5s do evento
            initTimeout = setTimeout(() => {
                if (!hasShownBanner) {
                    showInstallBanner();
                }
            }, 1500);
        });

        // Listener appinstalled
        window.addEventListener("appinstalled", () => {
            console.log('[PWA] appinstalled recebido!');
            if (installBanner) dismissBanner();
            try {
                localStorage.removeItem("pwa-install-dismissed");
            } catch (e) {}
        });

        // iOS: mostrar banner após 3.5s
        if (ios) {
            console.log('[PWA] iOS detectado, agendando banner em 3.5s');
            initTimeout = setTimeout(() => {
                if (!hasShownBanner) {
                    showInstallBanner();
                }
            }, 3500);
        }

        // Android: mostrar banner após 5s se beforeinstallprompt não disparou
        if (android) {
            console.log('[PWA] Android detectado, agendando banner em 5s (fallback)');
            initTimeout = setTimeout(() => {
                if (!hasShownBanner) {
                    console.log('[PWA] Timeout Android - mostrando banner');
                    showInstallBanner();
                }
            }, 5000);
        }

        console.log('[PWA] init completo');
    }

    return {
        init,
        showInstallBanner,
        dismissBanner
    };
}
