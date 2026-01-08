/**
 * PWA Install Manager
 * Gerencia o prompt de instalação do PWA em desktop e mobile
 */

export function createPWAInstallManager() {
    let deferredPrompt = null;
    let installBanner = null;
    let hasShownBanner = false;

    console.log('📱 [PWA] Module loaded');

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
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
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
        console.log('📱 [PWA] showInstallBanner called');

        // Não mostrar se já está instalado
        if (isInstalled()) {
            console.log("📱 [PWA] Já está instalado, não mostrando banner");
            return;
        }

        // Não mostrar se já recusou anteriormente
        if (wasRecentlyDismissed()) {
            console.log("📱 [PWA] Banner dispensado recentemente");
            return;
        }

        // Não mostrar se já apareceu antes
        if (hasShownBanner) {
            console.log("📱 [PWA] Banner já foi mostrado nesta sessão");
            return;
        }
        hasShownBanner = true;

        const ios = isIOS();
        console.log('📱 [PWA] Criando banner - iOS:', ios);

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
                            ? 'Adicione à tela inicial'
                            : 'Instale o aplicativo'
                        }
                    </div>
                    ${ios ? `
                        <div class="pwa-banner-ios-hint">
                            Toque em Compartilhar → Adicionar à Tela de Início
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
        console.log('📱 [PWA] Banner adicionado ao DOM');

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
                    console.log('📱 [PWA] Banner tornando visível');
                }
            }, 100);
        });
    }

    /**
     * Dispensar banner
     */
    function dismissBanner() {
        console.log('📱 [PWA] Dispensando banner');
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
            console.warn('[PWA] Não foi possível salvar:', e);
        }
    }

    /**
     * Lidar com clique no botão instalar
     */
    function handleInstallClick() {
        console.log('📱 [PWA] Botão instalar clicado');
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                console.log('📱 [PWA] Escolha:', choiceResult.outcome);
                deferredPrompt = null;
                if (installBanner) dismissBanner();
            }).catch(() => {
                if (installBanner) dismissBanner();
            });
        } else {
            console.log('📱 [PWA] Sem deferredPrompt, fechando banner');
            setTimeout(() => {
                if (installBanner) dismissBanner();
            }, 2000);
        }
    }

    /**
     * Inicializar
     */
    function init() {
        console.log('📱 [PWA] init() called');
        console.log('📱 [PWA] isMobile:', isMobile());
        console.log('📱 [PWA] isIOS:', isIOS());
        console.log('📱 [PWA] isInstalled:', isInstalled());
        console.log('📱 [PWA] wasRecentlyDismissed:', wasRecentlyDismissed());

        // Se já está instalado
        if (isInstalled()) {
            console.log("📱 [PWA] App já instalado, saindo");
            return;
        }

        // Se dispensou recentemente
        if (wasRecentlyDismissed()) {
            console.log("📱 [PWA] Banner dispensado recentemente, saindo");
            return;
        }

        // Listener beforeinstallprompt
        window.addEventListener("beforeinstallprompt", (e) => {
            console.log("📱 [PWA] beforeinstallprompt evento recebido!");
            e.preventDefault();
            deferredPrompt = e;
            setTimeout(() => {
                if (!hasShownBanner) showInstallBanner();
            }, 2000);
        });

        // Listener appinstalled
        window.addEventListener("appinstalled", () => {
            console.log("📱 [PWA] appinstalled evento!");
            if (installBanner) dismissBanner();
            try {
                localStorage.removeItem("pwa-install-dismissed");
            } catch (e) {}
        });

        // iOS: mostrar banner após 4 segundos
        if (isIOS()) {
            console.log("📱 [PWA] Detectado iOS, mostrando banner em 4s");
            setTimeout(() => {
                if (!hasShownBanner) showInstallBanner();
            }, 4000);
        }

        // Mobile geral: mostrar após 6 segundos se não houve beforeinstallprompt
        if (isMobile()) {
            console.log("📱 [PWA] Detectado mobile, mostrar banner em 6s se necessário");
            setTimeout(() => {
                if (!hasShownBanner && !deferredPrompt) {
                    console.log("📱 [PWA] Mostrando banner para mobile (fallback)");
                    showInstallBanner();
                }
            }, 6000);
        }

        console.log("📱 [PWA] init() completo - aguardando eventos");
    }

    return {
        init,
        showInstallBanner,
        dismissBanner
    };
}
