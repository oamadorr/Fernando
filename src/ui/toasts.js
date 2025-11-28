export function removeToast(toast) {
    if (toast && toast.parentElement) {
        toast.classList.remove("show");
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }
}

export function showToast(message, type = "info", duration = 4000) {
    const container = document.getElementById("toastContainer");
    if (!container) return null;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
        success: "fas fa-check-circle",
        error: "fas fa-exclamation-circle",
        warning: "fas fa-exclamation-triangle",
        info: "fas fa-info-circle",
    };

    toast.innerHTML = `
                <i class="toast-icon ${icons[type]}"></i>
                <div class="toast-content">${message}</div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;

    const closeButton = toast.querySelector(".toast-close");
    if (closeButton) {
        closeButton.addEventListener("click", () => removeToast(toast));
    }

    container.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    // Auto remover
    setTimeout(() => {
        removeToast(toast);
    }, duration);

    return toast;
}
