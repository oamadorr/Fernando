/**
 * PWA Install Manager
 * Gerencia o prompt de instalação do PWA em desktop e mobile
 */

export function createPWAInstallManager() {
    let deferredPrompt = null;
    let installBanner = null;

    // Detectar se é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );

    // Detectar se já está instalado
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches ||
                       window.navigator.standalone === true;

    // Detectar iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    /**
     * Mostrar banner de instalação customizado (para iOS e fallback)
     */
    function showInstallBanner() {
        // Não mostrar se já estiver instalado
        if (isInstalled) return;

        // Não mostrar se já recusou anteriormente
        if (localStorage.getItem("pwa-install-dismissed")) return;

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
                        ${isIOS
                            ? 'Adicione à tela inicial para acesso rápido'
                            : 'Instale o aplicativo para melhor experiência'
                        }
                    </div>
                    ${isIOS ? `
                        <div class="pwa-banner-ios-hint">
                            <i class="fas fa-share-square"></i>
                            Toque em Compartilhar e depois "Adicionar à Tela de Início"
                        </div>
                    ` : ''}
                </div>
                <button class="pwa-banner-install-btn" id="pwaInstallBtn">
                    ${isIOS ? 'OK' : 'Instalar'}
                </button>
                <button class="pwa-banner-close-btn" id="pwaCloseBtn" aria-label="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(installBanner);

        // Adicionar evento de fechar
        document.getElementById("pwaCloseBtn").addEventListener("click", dismissBanner);
        document.getElementById("pwaInstallBtn").addEventListener("click", handleInstallClick);

        // Animar entrada
        setTimeout(() => {
            installBanner.classList.add("pwa-banner-visible");
        }, 1000);
    }

    /**
     * Dispensar banner e lembrar preferência
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

            // Lembrar que usuário dispensou (só mostrar novamente após 7 dias)
            const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem("pwa-install-dismissed", dismissedUntil.toString());
        }
    }

    /**
     * Lidar com clique no botão instalar
     */
    function handleInstallClick() {
        if (deferredPrompt) {
            // Instalação nativa (Android/Desktop)
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === "accepted") {
                    console.log("✅ PWA instalado com sucesso");
                } else {
                    console.log("❌ Instalação recusada");
                }
                deferredPrompt = null;
                if (installBanner) {
                    dismissBanner();
                }
            });
        } else if (isIOS) {
            // iOS - mostrar instruções
            const iOSHint = installBanner.querySelector(".pwa-banner-ios-hint");
            if (iOSHint) {
                iOSHint.style.display = iOSHint.style.display === "none" ? "block" : "none";
            }
            setTimeout(() => {
                dismissBanner();
            }, 5000);
        } else {
            // Fallback - dispenser
            dismissBanner();
        }
    }

    /**
     * Inicializar gerenciador de instalação
     */
    function init() {
        // Se já está instalado, não fazer nada
        if (isInstalled) {
            console.log("📱 PWA já está instalado");
            return;
        }

        // Verificar se usuário dispensou recentemente
        const dismissedUntil = localStorage.getItem("pwa-install-dismissed");
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
            console.log("⏭️ PWA install banner dispensado recentemente");
            return;
        }

        // Listener para instalação nativa (Chrome/Edge Android)
        window.addEventListener("beforeinstallprompt", (e) => {
            console.log("📱 Evento beforeinstallprompt detectado");
            e.preventDefault();
            deferredPrompt = e;

            // Mostrar banner após 3 segundos
            setTimeout(() => {
                showInstallBanner();
            }, 3000);
        });

        // Listener para app instalado
        window.addEventListener("appinstalled", () => {
            console.log("✅ PWA instalado com sucesso!");
            if (installBanner) {
                dismissBanner();
            }
            localStorage.removeItem("pwa-install-dismissed");
        });

        // Para iOS, mostrar banner após alguns segundos
        // (pois não há evento nativo de instalação)
        if (isIOS && isMobile) {
            setTimeout(() => {
                showInstallBanner();
            }, 5000);
        }

        // Para mobile Android sem beforeinstallprompt (fallback)
        if (isMobile && !isIOS && !deferredPrompt) {
            setTimeout(() => {
                showInstallBanner();
            }, 5000);
        }
    }

    return {
        init,
        showInstallBanner,
        dismissBanner
    };
}
