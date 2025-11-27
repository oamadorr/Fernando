import state from "../state.js";
import { saveProgressToStorage } from "../persistence.js";
import { showToast } from "./toasts.js";

export function createObservationHandlers({ requireOnlineEdits, saveProjectData }) {
    let currentObservationUsina = "";
    let currentObservationLinha = "";

    function openObservationModal(usinaKey, linha) {
        currentObservationUsina = usinaKey;
        currentObservationLinha = linha;

        const usinaName = state.projectData[usinaKey].name;
        document.getElementById("observationLineInfo").textContent =
            `${usinaName} - Linha ${linha}`;

        const currentObservation =
            state.lineObservations[usinaKey] && state.lineObservations[usinaKey][linha]
                ? state.lineObservations[usinaKey][linha]
                : "";
        document.getElementById("observationText").value = currentObservation;

        updateCharacterCount();

        document.getElementById("observationModal").style.display = "block";
    }

    function closeObservationModal() {
        document.getElementById("observationModal").style.display = "none";
        const textarea = document.getElementById("observationText");
        textarea.value = "";
        textarea.style.height = "auto";
        document.getElementById("charCount").textContent = "0/500";
        document.getElementById("charCount").style.color = "var(--medium-gray)";
        currentObservationUsina = "";
        currentObservationLinha = "";
    }

    async function saveObservation() {
        if (!requireOnlineEdits()) return;
        if (!currentObservationUsina || !currentObservationLinha) {
            showToast("Erro: Informações da linha não encontradas.", "error");
            return;
        }

        const observationText = document.getElementById("observationText").value.trim();

        if (!state.lineObservations[currentObservationUsina]) {
            state.lineObservations[currentObservationUsina] = {};
        }

        state.lineObservations[currentObservationUsina][currentObservationLinha] =
            observationText;

        saveProgressToStorage();
        await saveProjectData();

        showToast("Observação salva com sucesso!", "success");
        closeObservationModal();
    }

    function updateCharacterCount() {
        const textarea = document.getElementById("observationText");
        const charCount = document.getElementById("charCount");
        if (!textarea || !charCount) return;

        const currentLength = textarea.value.length;
        const maxLength = textarea.maxLength;

        charCount.textContent = `${currentLength}/${maxLength}`;

        if (currentLength > maxLength * 0.9) {
            charCount.style.color = "var(--error-red)";
        } else if (currentLength > maxLength * 0.75) {
            charCount.style.color = "var(--warning-orange)";
        } else {
            charCount.style.color = "var(--medium-gray)";
        }

        textarea.style.height = "auto";
        const newHeight = Math.max(140, textarea.scrollHeight);
        textarea.style.height = newHeight + "px";
    }

    return {
        openObservationModal,
        closeObservationModal,
        saveObservation,
        updateCharacterCount,
    };
}
