import {
    configurePersistence,
    loadLineStepsFromStorage,
    loadProgressFromStorage,
    saveProgressToStorage,
} from "./persistence.js";
import {
    sanitizeProgressData,
    sanitizeExecutionDates,
    formatExecutionDateForDisplay,
    getExecutionDateForLine,
    sanitizeBuiltInformations,
    getBuiltPairCount,
    sanitizeTeamConfig,
} from "./utils/sanitize.js";
import {
    initializeFirebase as initializeFirebaseModule,
    applyFirebaseDataSnapshot,
    detectAndResolveDataConflicts as detectAndResolveDataConflictsModule,
    saveProjectData as saveProjectDataModule,
    setupRealtimeListener as setupRealtimeListenerModule,
} from "./firebase.js";
import {
    initializeMap,
    switchMapTab,
    updateMapFromExternalData,
    updateTransversalVisuals,
} from "./ui/map.js";
import { createObservationHandlers } from "./ui/modals.js";
import { showToast } from "./ui/toasts.js";
import { createTransversalHandlers } from "./ui/transversalModals.js";
import { createLineModalHandlers } from "./ui/lineModals.js";
import { createBuiltHandlers } from "./ui/builtModals.js";
import { createUpdateModalHandlers } from "./ui/updateModal.js";
import { initializeCharts, updateCharts, updateChartInfos } from "./ui/charts.js";
import state, {
    setDb,
    setCurrentProjectId,
    setAllowOnlineEdits,
    setProgressData as setProgressDataState,
    setLineStepsStatus as setLineStepsStatusState,
    setLineObservations,
    setBuiltInformations as setBuiltInformationsState,
    setTeamConfig,
    setExecutionDates,
    setManualActiveUsina,
} from "./state.js";

// Firebase variables
let db;
let currentProjectId = null;
let allowOnlineEdits = false; // controle central de edição (desliga quando offline)

// Sistema de senha
// Hash SHA-256 da senha - será calculado na primeira execução
let PROJECT_PASSWORD_HASH = null;
let isAuthenticated = false;
let pendingAction = null;
let pendingImportData = null;
let pendingConfirmAction = null;
let confirmResolve = null;

function applyReadOnlyUI(isReadOnly) {
    document.querySelectorAll('[data-online-only="true"]').forEach((el) => {
        el.disabled = isReadOnly;
        el.setAttribute("aria-disabled", isReadOnly ? "true" : "false");
        if (isReadOnly) {
            el.classList.add("readonly-disabled");
            el.title = "Disponível apenas online";
        } else {
            el.classList.remove("readonly-disabled");
            el.removeAttribute("aria-disabled");
            el.removeAttribute("title");
        }
    });
}

function setReadOnlyMode(isReadOnly) {
    allowOnlineEdits = !isReadOnly;
    document.body.classList.toggle("readonly-mode", isReadOnly);
    applyReadOnlyUI(isReadOnly);
    updateUpdateModalBadge(isReadOnly);
}

function requireOnlineEdits() {
    const canEdit = allowOnlineEdits && navigator.onLine && db && currentProjectId;
    if (!canEdit) {
        showToast("Modo somente leitura: conecte-se ao Firebase para editar.", "error");
        return false;
    }
    return true;
}

function updateUpdateModalBadge(isReadOnly) {
    const badge = document.getElementById("updateModalBadge");
    if (!badge) return;
    if (isReadOnly) {
        badge.textContent = "Modo offline";
        badge.classList.remove("badge-online");
        badge.classList.add("badge-offline");
    } else {
        badge.textContent = "Online";
        badge.classList.remove("badge-offline");
        badge.classList.add("badge-online");
    }
    badge.style.display = "inline-flex";
}

const {
    openObservationModal,
    closeObservationModal,
    saveObservation,
    updateCharacterCount,
} = createObservationHandlers({ requireOnlineEdits, saveProjectData });

const {
    showTransversalDetails,
    closeTransversalModal,
    enableTransversalEdit,
    cancelTransversalEdit,
    saveTransversalEdit,
} = createTransversalHandlers({
    requireOnlineEdits,
    saveProjectData,
    updateAllDisplays,
    updateTransversalVisuals,
    showToast,
    saveLineStepsToStorage,
    saveProgressToStorage,
    getIsAuthenticated: () => isAuthenticated,
    setPendingAction: (action) => {
        pendingAction = action;
    },
    getLineStepsStatus: () => lineStepsStatus,
    setLineStepsStatus: (value) => {
        lineStepsStatus = value;
        setLineStepsStatusState(value); // Sync with state.js
    },
    getProgressData: () => progressData,
    setProgressData: (value) => {
        progressData = value;
        setProgressDataState(value); // Sync with state.js
    },
    getProjectData: () => projectData,
});

const {
    // Referenciado via exportedFunctions/window
    showLineDetails: showLineDetailsHandler,
    closeLineDetailsModal,
    enableLineDetailsEdit,
    cancelLineDetailsEdit,
    saveLineDetailsEdit,
} = createLineModalHandlers({
    requireOnlineEdits,
    saveLineStepsToStorage,
    saveProgressToStorage,
    saveProjectData,
    updateAllDisplays,
    updateTransversalVisuals,
    showToast,
    getIsAuthenticated: () => isAuthenticated,
    setPendingAction: (action) => {
        pendingAction = action;
    },
    getProjectData: () => projectData,
    getLineStepsStatus: () => lineStepsStatus,
    setLineStepsStatus: (value) => {
        lineStepsStatus = value;
        setLineStepsStatusState(value); // Sync with state.js
    },
    getProgressData: () => progressData,
    setProgressData: (value) => {
        progressData = value;
        setProgressDataState(value); // Sync with state.js
    },
});

const {
    renderBuiltTables,
    enableBuiltEdit,
    cancelBuiltEdit,
    saveBuiltEdit,
} = createBuiltHandlers({
    requireOnlineEdits,
    showToast,
    saveBuiltToStorage,
    saveBuiltToFirebase,
    saveProjectData,
    getBuiltInformations: () => builtInformations,
    setBuiltInformations: (value) => {
        builtInformations = value;
        setBuiltInformationsState(value);
    },
    getProjectData: () => projectData,
    getIsAuthenticated: () => isAuthenticated,
    setPendingAction: (action) => {
        pendingAction = action;
    },
    showPasswordModal,
});

const {
    openUpdateModal,
    openLineModal,
    closeModal,
    loadLinhas,
    loadBases,
    updateSelectAllState,
    updateSelectAllRemoveState,
    toggleAllBases,
    toggleAllRemoveBases,
    handleUpdateSubmit,
    closeOnOutsideClick,
} = createUpdateModalHandlers({
    requireOnlineEdits,
    saveProgressToStorage,
    saveProjectData,
    showToast,
    getProjectData: () => projectData,
    getProgressData: () => progressData,
    setProgressData: (value) => {
        progressData = value;
    },
    getExecutionDates: () => executionDates,
    setExecutionDates: (value) => {
        executionDates = value;
    },
    formatExecutionDateForDisplay,
    getExecutionDateForLine,
    sanitizeExecutionDates,
    getIsAuthenticated: () => isAuthenticated,
    setPendingAction: (action) => {
        pendingAction = action;
    },
    showPasswordModal,
});

// Dados do projeto
const projectData = {
    pimental: {
        name: "Pimental",
        linhas: {
            "01": { metragem: 88.63, bases: { A: 1, C: 5, E: 1, K: 6 } },
            "02": { metragem: 90.63, bases: { C: 6, G: 1, K: 6 } },
            "03": { metragem: 88.63, bases: { B: 1, D: 5, F: 1, K: 6 } },
            "04": { metragem: 90.63, bases: { D: 6, H: 1, K: 6 } },
            "05": { metragem: 18.585, bases: { J: 1 } },
            "06": { metragem: 18.585, bases: { J: 1 } },
            "07": { metragem: 18.585, bases: { J: 1 } },
            "08": { metragem: 18.585, bases: { J: 1 } },
            "09": { metragem: 18.585, bases: { J: 1 } },
            10: { metragem: 18.585, bases: { J: 1 } },
            11: { metragem: 18.585, bases: { J: 1 } },
            12: { metragem: 18.585, bases: { J: 1 } },
            13: { metragem: 18.585, bases: { J: 1 } },
            14: { metragem: 18.585, bases: { J: 1 } },
            15: { metragem: 18.585, bases: { J: 1 } },
            16: { metragem: 18.585, bases: { J: 1 } },
            17: { metragem: 18.585, bases: { J: 1 } },
            18: { metragem: 18.585, bases: { J: 1 } },
        },
    },
    "belo-monte": {
        name: "Belo Monte",
        linhas: {
            "01": { metragem: 89.485, bases: { A: 1, C: 5, E: 1, K: 5 } },
            "02": { metragem: 90.085, bases: { C: 5, E: 1, K: 6 } },
            "03": { metragem: 98.82, bases: { C: 5, E: 1, K: 6 } },
            "04": { metragem: 98.82, bases: { C: 5, E: 1, K: 6 } },
            "05": { metragem: 99.43, bases: { C: 5, E: 1, K: 6 } },
            "06": { metragem: 98.82, bases: { C: 5, E: 1, K: 6 } },
            "07": { metragem: 98.82, bases: { C: 5, E: 1, K: 6 } },
            "08": { metragem: 98.777, bases: { C: 5, E: 1, K: 6 } },
            "09": { metragem: 64.514, bases: { C: 3, G: 1, K: 3 } },
            10: { metragem: 89.485, bases: { B: 1, D: 5, F: 1, K: 5 } },
            11: { metragem: 90.085, bases: { C: 5, F: 1, K: 6 } },
            12: { metragem: 98.82, bases: { C: 5, F: 1, K: 6 } },
            13: { metragem: 98.82, bases: { C: 5, F: 1, K: 6 } },
            14: { metragem: 99.43, bases: { C: 5, F: 1, K: 6 } },
            15: { metragem: 98.82, bases: { C: 5, F: 1, K: 6 } },
            16: { metragem: 98.82, bases: { C: 5, F: 1, K: 6 } },
            17: { metragem: 98.777, bases: { C: 5, F: 1, K: 6 } },
            18: { metragem: 64.514, bases: { D: 3, H: 1, K: 3 } },
            19: { metragem: 31.9, bases: { J: 3 } },
            20: { metragem: 31.9, bases: { J: 3 } },
            21: { metragem: 31.9, bases: { J: 3 } },
            22: { metragem: 31.9, bases: { J: 3 } },
            23: { metragem: 31.9, bases: { J: 3 } },
            24: { metragem: 31.9, bases: { J: 3 } },
            25: { metragem: 31.9, bases: { J: 3 } },
            26: { metragem: 31.9, bases: { J: 3 } },
            27: { metragem: 31.9, bases: { J: 3 } },
            28: { metragem: 31.9, bases: { J: 3 } },
            29: { metragem: 31.9, bases: { J: 3 } },
            30: { metragem: 31.9, bases: { J: 3 } },
            31: { metragem: 31.9, bases: { J: 3 } },
            32: { metragem: 31.9, bases: { J: 3 } },
            33: { metragem: 31.9, bases: { J: 3 } },
            34: { metragem: 31.9, bases: { J: 3 } },
            35: { metragem: 31.9, bases: { J: 3 } },
            36: { metragem: 31.9, bases: { J: 3 } },
            37: { metragem: 31.9, bases: { J: 3 } },
            38: { metragem: 31.9, bases: { J: 3 } },
            39: { metragem: 31.9, bases: { J: 3 } },
            40: { metragem: 31.9, bases: { J: 3 } },
            41: { metragem: 31.9, bases: { J: 3 } },
            42: { metragem: 31.9, bases: { J: 3 } },
            43: { metragem: 31.9, bases: { J: 3 } },
            44: { metragem: 31.9, bases: { J: 3 } },
            45: { metragem: 31.9, bases: { J: 3 } },
            46: { metragem: 31.9, bases: { J: 3 } },
            47: { metragem: 31.9, bases: { J: 3 } },
            48: { metragem: 31.9, bases: { J: 3 } },
            49: { metragem: 31.9, bases: { J: 3 } },
            50: { metragem: 31.9, bases: { J: 3 } },
            51: { metragem: 31.9, bases: { J: 3 } },
            52: { metragem: 31.9, bases: { J: 3 } },
            53: { metragem: 31.9, bases: { J: 3 } },
            54: { metragem: 31.9, bases: { J: 3 } },
            55: { metragem: 31.9, bases: { J: 3 } },
            56: { metragem: 31.9, bases: { J: 3 } },
            57: { metragem: 31.9, bases: { J: 3 } },
            58: { metragem: 31.9, bases: { J: 3 } },
            59: { metragem: 31.9, bases: { J: 3 } },
            60: { metragem: 31.9, bases: { J: 3 } },
            61: { metragem: 31.9, bases: { J: 3 } },
            62: { metragem: 31.9, bases: { J: 3 } },
            63: { metragem: 31.9, bases: { J: 3 } },
            64: { metragem: 31.9, bases: { J: 3 } },
            65: { metragem: 31.9, bases: { J: 3 } },
            66: { metragem: 31.9, bases: { J: 3 } },
            67: { metragem: 31.9, bases: { J: 3 } },
            68: { metragem: 31.9, bases: { J: 3 } },
            69: { metragem: 31.9, bases: { J: 3 } },
            70: { metragem: 31.9, bases: { J: 3 } },
            71: { metragem: 31.9, bases: { J: 3 } },
        },
    },
    oficina: {
        name: "Oficina",
        linhas: {
            72: { metragem: 6.18, bases: { M: 1, B: 1 } },
            73: { metragem: 62.8, bases: { K: 6 } },
            74: { metragem: 6.18, bases: { B: 1, H: 1 } },
        },
    },
};

// Progresso individual por linha - estrutura: usina -> linha -> tipo -> quantidade concluída
let progressData = {
    pimental: {
        "01": { A: 0, C: 0, E: 0, K: 0 },
        "02": { C: 0, G: 0, K: 0 },
        "03": { B: 0, D: 0, F: 0, K: 0 },
        "04": { D: 0, H: 0, K: 0 },
        "05": { J: 0 },
        18: { J: 0 },
    },
    "belo-monte": {
        "01": { A: 0, C: 0, E: 0, K: 0 },
        "02": { C: 0, E: 0, K: 0 },
        "03": { C: 0, E: 0, K: 0 },
        "04": { C: 0, E: 0, K: 0 },
        "05": { C: 0, E: 0, K: 0 },
        "06": { C: 0, E: 0, K: 0 },
        "07": { C: 0, E: 0, K: 0 },
        "08": { C: 0, E: 0, K: 0 },
        "09": { C: 0, G: 0, K: 0 },
        10: { B: 0, D: 0, F: 0, K: 0 },
        11: { C: 0, F: 0, K: 0 },
        12: { C: 0, F: 0, K: 0 },
        13: { C: 0, F: 0, K: 0 },
        14: { C: 0, F: 0, K: 0 },
        15: { C: 0, F: 0, K: 0 },
        16: { C: 0, F: 0, K: 0 },
        17: { C: 0, F: 0, K: 0 },
        18: { D: 0, H: 0, K: 0 },
        19: { J: 3 },
        71: { J: 0 },
    },
    oficina: {
        72: { M: 0, B: 0 },
        73: { K: 0 },
        74: { B: 0, H: 0 },
    },
};

// Status das etapas por linha - estrutura: usina -> linha -> etapa -> status (true/false)
let lineStepsStatus = {
    pimental: {
        "01": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "02": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "03": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "04": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "05": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "06": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "07": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "08": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "09": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        10: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        11: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        12: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        13: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        14: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        15: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        16: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        17: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        18: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
    },
    "belo-monte": {
        "01": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "02": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "03": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "04": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "05": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "06": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "07": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "08": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        "09": {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        10: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        11: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        12: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        13: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        14: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        15: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        16: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        17: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        18: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        19: {
            passagemCabo: true,
            crimpagemCabo: true,
            afericaoCrimpagem: true,
            tensionamentoCabo: true,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        20: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        21: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        22: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        23: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        24: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        25: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        26: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        27: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        28: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        29: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        30: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        31: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        32: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        33: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        34: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        35: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        36: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        37: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        38: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        39: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        40: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        41: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        42: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        43: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        44: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        45: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        46: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        47: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        48: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        49: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        50: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        51: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        52: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        53: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        54: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        55: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        56: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        57: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        58: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        59: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        60: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        61: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        62: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        63: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        64: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        65: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        66: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        67: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        68: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        69: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        70: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        71: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
    },
    oficina: {
        72: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        73: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
        74: {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
            lacreTensionador: "",
            lacreLoopAbs: "",
        },
    },
};

// Observações por linha - estrutura: usina -> linha -> observação
let lineObservations = {
    pimental: {
        "01": "",
        "02": "",
        "03": "",
        "04": "",
        "05": "",
        18: "",
    },
    "belo-monte": {
        "01": "",
        "02": "",
        "03": "",
        "04": "",
        "05": "",
        "06": "",
        "07": "",
        "08": "",
        "09": "",
        10: "",
        11: "",
        12: "",
        13: "",
        14: "",
        15: "",
        16: "",
        17: "",
        18: "",
        19: "",
        71: "",
    },
    oficina: {
        72: "",
        73: "",
        74: "",
    },
};

// Informações para as Built - distâncias entre bases consecutivas
// Estrutura: usina -> linha -> par de bases (ex: "01-02") -> metragem
let builtInformations = {};

// Configurações da equipe
let teamConfig = {
    pessoas: 4,
    horasPorDia: 6, // 8-11:30 + 13:30-16:30 = 6h
    aproveitamento: 0.8,
    inicioTrabalhoBruto: new Date("2025-09-11"),
    dataAtual: new Date(),
};

// Datas de execução das linhas - estrutura: usina -> linha -> data
let executionDates = {};

configurePersistence({
    getAllowOnlineEdits: () => allowOnlineEdits,
    getProgressData: () => progressData,
    getLineStepsStatus: () => lineStepsStatus,
    getExecutionDates: () => executionDates,
    getLineObservations: () => lineObservations,
    getBuiltInformations: () => builtInformations,
    getProjectData: () => projectData,
    setProgressData: (value) => {
        progressData = value;
        setProgressDataState(value); // Sync with state.js
    },
    setLineStepsStatus: (value) => {
        lineStepsStatus = value;
        setLineStepsStatusState(value); // Sync with state.js
    },
    setExecutionDates: (value) => (executionDates = value),
    setLineObservations: (value) => (lineObservations = value),
    setBuiltInformations: (value) => {
        builtInformations = value;
        setBuiltInformationsState(value);
    },
});

function syncLocalStateToModule() {
    setDb(db);
    setCurrentProjectId(currentProjectId);
    setAllowOnlineEdits(allowOnlineEdits);
    setProgressDataState(progressData);
    setLineStepsStatusState(lineStepsStatus);
    setExecutionDates(executionDates);
    setLineObservations(lineObservations);
    setBuiltInformationsState(builtInformations);
    setTeamConfig(teamConfig);
    setManualActiveUsina(manualActiveUsina);
}

function syncModuleStateToLocal() {
    db = state.db;
    currentProjectId = state.currentProjectId;
    allowOnlineEdits = state.allowOnlineEdits;
    progressData = state.progressData;
    lineStepsStatus = state.lineStepsStatus;
    executionDates = state.executionDates;
    lineObservations = state.lineObservations;
    builtInformations = state.builtInformations;
    teamConfig = state.teamConfig;
    manualActiveUsina = state.manualActiveUsina;
}

// Controle manual da usina ativa
let manualActiveUsina = null; // null = automático, 'pimental' ou 'belo-monte' = manual

// Inicializar hash da senha
async function initializePasswordHash() {
    PROJECT_PASSWORD_HASH = await calculateSHA256("thommen2025");
}

// Função centralizada para garantir datas válidas no teamConfig
function validateAndFixTeamConfigDates() {
    teamConfig = sanitizeTeamConfig(teamConfig);
    setTeamConfig(teamConfig);
    console.log("TeamConfig validado:", teamConfig);
}

// Inicialização
document.addEventListener("DOMContentLoaded", async function () {
    // Sincronizar estado inicial com o módulo compartilhado
    syncLocalStateToModule();

    // Inicializar hash da senha
    await initializePasswordHash();

    // Garantir que teamConfig tenha datas válidas ANTES de carregar dados
    validateAndFixTeamConfigDates();

    // Carregar dados locais primeiro para exibição imediata
    loadTeamConfigFromStorage();

    // Validar novamente após carregar do storage
    validateAndFixTeamConfigDates();
    loadLineStepsFromStorage();
    loadProgressFromStorage();
    loadBuiltFromStorage();

    // Carregar preferência de usina ativa
    const savedActiveUsina = localStorage.getItem("manualActiveUsina");
    if (
        savedActiveUsina &&
        (savedActiveUsina === "pimental" || savedActiveUsina === "belo-monte")
    ) {
        manualActiveUsina = savedActiveUsina;
    }

    // Atualizar displays com dados existentes APÓS carregar configurações
    updateAllDisplays();

    // Inicializar mapa interativo
    initializeMap();

    initializeFirebase();
    initializeFilters();
    checkUrlParams();

    // Mostrar aviso de modo somente leitura por padrão
    showReadOnlyNotice();

    // Configurar evento Enter no campo de senha
    document.getElementById("passwordInput").addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            checkPassword();
        }
    });
});

// Cleanup listener when leaving page
window.addEventListener("beforeunload", function () {
    disconnectRealtimeListener();
});

// Cleanup quando a página fica invisível
document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        disconnectRealtimeListener();
    }
});

// Funções de cálculo
function calculateTotalBases() {
    let total = 0;
    for (const usina in projectData) {
        for (const linha in projectData[usina].linhas) {
            const bases = projectData[usina].linhas[linha].bases;
            for (const tipo in bases) {
                total += bases[tipo];
            }
        }
    }
    return total;
}

function calculateCompletedBases() {
    let completed = 0;
    for (const usina in progressData) {
        for (const linha in progressData[usina]) {
            for (const tipo in progressData[usina][linha]) {
                completed += progressData[usina][linha][tipo];
            }
        }
    }
    return completed;
}

function calculateCompletedBasesOfUsina(usinaKey) {
    let completed = 0;
    if (progressData[usinaKey]) {
        for (const linha in progressData[usinaKey]) {
            for (const tipo in progressData[usinaKey][linha]) {
                completed += progressData[usinaKey][linha][tipo];
            }
        }
    }
    return completed;
}

function calculateTotalBasesOfType(tipo, usinaFilter = null) {
    let total = 0;
    for (const usina in projectData) {
        if (usinaFilter && usina !== usinaFilter) continue;
        for (const linha in projectData[usina].linhas) {
            const bases = projectData[usina].linhas[linha].bases;
            if (bases[tipo]) {
                total += bases[tipo];
            }
        }
    }
    return total;
}

function calculateCompletedBasesOfType(tipo, usinaFilter = null) {
    let completed = 0;
    for (const usina in progressData) {
        if (usinaFilter && usina !== usinaFilter) continue;
        for (const linha in progressData[usina]) {
            if (progressData[usina][linha] && progressData[usina][linha][tipo]) {
                completed += progressData[usina][linha][tipo];
            }
        }
    }
    return completed;
}

function calculateTotalBasesOfUsina(usinaKey) {
    let total = 0;
    if (projectData[usinaKey]) {
        for (const linha in projectData[usinaKey].linhas) {
            const bases = projectData[usinaKey].linhas[linha].bases;
            for (const tipo in bases) {
                total += bases[tipo];
            }
        }
    }
    return total;
}

function calculateProgress() {
    // Calcular progresso considerando tanto bases quanto etapas do cabo
    const totalBases = calculateTotalBases();
    const completedBases = calculateCompletedBases();
    const totalCableSteps = calculateTotalCableSteps();
    const completedCableSteps = calculateCableStepsCompleted();

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;

    const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Debug log para diagnóstico
    console.log("📊 calculateProgress:", {
        totalBases,
        completedBases,
        totalCableSteps,
        completedCableSteps,
        totalItems,
        completedItems,
        progressPercent: progressPercent.toFixed(1) + "%",
    });

    return progressPercent;
}

function calculateProductivity() {
    const completed = calculateCompletedBases();
    const diasTrabalhados = calculateWorkDays();
    return diasTrabalhados > 0 ? completed / diasTrabalhados : 0;
}

function calculateWorkDays() {
    const inicio = teamConfig.inicioTrabalhoBruto;

    if (!inicio || !(inicio instanceof Date)) {
        return 0;
    }

    // Data atual real
    const hoje = new Date();
    const horaAtual = hoje.getHours();

    // Se ainda não passou das 18h, não contar hoje
    let dataFinal = new Date(hoje);
    if (horaAtual < 18) {
        dataFinal.setDate(dataFinal.getDate() - 1);
    }

    // Contar dias úteis de 11/09 até data final
    let workDays = 0;
    const currentDate = new Date(inicio);

    while (currentDate <= dataFinal) {
        const weekDay = currentDate.getDay();
        // Segunda(1) a Sexta(5)
        if (weekDay >= 1 && weekDay <= 5) {
            workDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDays;
}

function calculateWorkedHours() {
    const workDays = calculateWorkDays();
    // 6 horas/dia * 80% aproveitamento = 4.8 horas efetivas por dia
    const hoursPerDay = 6 * 0.8;
    return workDays * hoursPerDay;
}

// Função para definir manualmente qual usina está ativa
function setActiveUsina(usinaKey) {
    // Verificar autenticação
    if (!isAuthenticated) {
        pendingAction = () => setActiveUsina(usinaKey);
        showPasswordModal();
        return;
    }

    const pimentalStats = calculateUsinaStats("pimental");
    const beloMonteStats = calculateUsinaStats("belo-monte");

    // Verificar se a usina não está concluída
    if (usinaKey === "pimental" && pimentalStats.progress >= 100) {
        showToast("Usina Pimental já está concluída", "warning");
        return;
    }
    if (usinaKey === "belo-monte" && beloMonteStats.progress >= 100) {
        showToast("Usina Belo Monte já está concluída", "warning");
        return;
    }

    manualActiveUsina = usinaKey;

    // Salvar preferência no localStorage
    localStorage.setItem("manualActiveUsina", usinaKey);

    // Salvar no Firebase para sincronização
    saveProjectData();

    // Atualizar interface
    updateActiveUsinaButtons();
    updateAllDisplays();

    const usinaName = usinaKey === "pimental" ? "Pimental" : "Belo Monte";
    showToast(`Usina ${usinaName} definida como ativa`, "success");
}

// Função para forçar salvamento da usina ativa
function forceSaveActiveUsina() {
    console.log("🔧 forceSaveActiveUsina chamada", {
        isAuthenticated: isAuthenticated,
        manualActiveUsina: manualActiveUsina,
    });

    if (!isAuthenticated) {
        pendingAction = () => forceSaveActiveUsina();
        showPasswordModal();
        return;
    }

    if (manualActiveUsina) {
        console.log("💾 Salvando usina ativa no Firebase:", manualActiveUsina);
        saveProjectData();
        const usinaName = manualActiveUsina === "pimental" ? "Pimental" : "Belo Monte";
        showToast(`Configuração da usina ${usinaName} salva com sucesso!`, "success");
    } else {
        showToast("Nenhuma usina selecionada para salvar", "info");
    }
}

// Determina qual usina está atualmente ativa
function getActiveUsina() {
    const pimentalStats = calculateUsinaStats("pimental");
    const beloMonteStats = calculateUsinaStats("belo-monte");
    const oficinaStats = calculateUsinaStats("oficina");

    function parseBuiltNumber(value) {
        if (value === null || value === undefined || value === "") return NaN;
        return parseFloat(String(value).replace(",", "."));
    }

    function getBuiltTotals() {
        const totals = {};
        for (const usinaKey in builtInformations) {
            totals[usinaKey] = {};
            const linhas = builtInformations[usinaKey];
            for (const linha in linhas) {
                const pairs = linhas[linha];
                const sum = Object.keys(pairs || {}).reduce((acc, key) => {
                    const num = parseBuiltNumber(pairs[key]);
                    return Number.isNaN(num) ? acc : acc + num;
                }, 0);
                totals[usinaKey][linha] = sum;
            }
        }
        return totals;
    }

    const builtTotals = getBuiltTotals();

    // Se todas estão 100% concluídas, retorna null
    if (
        pimentalStats.progress >= 100 &&
        beloMonteStats.progress >= 100 &&
        oficinaStats.progress >= 100
    ) {
        return null;
    }

    // Se há seleção manual válida, usar ela
    if (manualActiveUsina) {
        if (manualActiveUsina === "pimental" && pimentalStats.progress < 100) {
            return "pimental";
        }
        if (manualActiveUsina === "belo-monte" && beloMonteStats.progress < 100) {
            return "belo-monte";
        }
        if (manualActiveUsina === "oficina" && oficinaStats.progress < 100) {
            return "oficina";
        }
        // Se a seleção manual não é mais válida, resetar
        manualActiveUsina = null;
        localStorage.removeItem("manualActiveUsina");
    }

    // Lógica automática: Retornar primeira usina incompleta na ordem: Pimental -> Belo Monte -> Oficina
    if (pimentalStats.progress < 100) {
        return "pimental";
    }
    if (beloMonteStats.progress < 100) {
        return "belo-monte";
    }
    if (oficinaStats.progress < 100) {
        return "oficina";
    }

    // Todas completas (redundante, mas por segurança)
    return null;
}

function calculateEstimatedCompletion() {
    const activeUsina = getActiveUsina();
    if (!activeUsina) return null; // Todas concluídas

    const productivity = calculateProductivity();
    if (productivity <= 0) return null;

    // Calcular bases restantes de todas as usinas
    const pimentalStats = calculateUsinaStats("pimental");
    const beloMonteStats = calculateUsinaStats("belo-monte");
    const oficinaStats = calculateUsinaStats("oficina");

    const pimentalRemaining = pimentalStats.totalBases - pimentalStats.completedBases;
    const beloMonteRemaining = beloMonteStats.totalBases - beloMonteStats.completedBases;
    const oficinaRemaining = oficinaStats.totalBases - oficinaStats.completedBases;

    // Calcular total sequencial baseado na usina ativa
    let totalRemainingBases = 0;

    if (activeUsina === "pimental") {
        // Pimental em execução -> Pimental + Belo Monte + Oficina
        totalRemainingBases = pimentalRemaining + beloMonteRemaining + oficinaRemaining;
    } else if (activeUsina === "belo-monte") {
        // Belo Monte em execução -> Belo Monte + Pimental (se pendente) + Oficina (se pendente)
        totalRemainingBases =
            beloMonteRemaining +
            (pimentalRemaining > 0 ? pimentalRemaining : 0) +
            (oficinaRemaining > 0 ? oficinaRemaining : 0);
    } else if (activeUsina === "oficina") {
        // Oficina em execução -> Oficina + pendentes
        totalRemainingBases =
            oficinaRemaining +
            (pimentalRemaining > 0 ? pimentalRemaining : 0) +
            (beloMonteRemaining > 0 ? beloMonteRemaining : 0);
    }

    const daysNeeded = Math.ceil(totalRemainingBases / productivity);
    const completionDate = new Date(teamConfig.dataAtual);

    // Adicionar dias úteis
    let addedDays = 0;
    let currentDate = new Date(completionDate);

    while (addedDays < daysNeeded) {
        currentDate.setDate(currentDate.getDate() + 1);
        const weekDay = currentDate.getDay();
        if (weekDay >= 1 && weekDay <= 5) {
            addedDays++;
        }
    }

    return currentDate;
}

// Firebase Functions
function initializeFirebase() {
    try {
        initializeFirebaseModule(
            () => {
                db = state.db;
                setReadOnlyMode(false);
                updateStatusIndicator("online");
                syncLocalStateToModule();
                console.log("Firebase inicializado com sucesso");
            },
            (error) => {
                console.error("Erro ao inicializar Firebase:", error);
                setReadOnlyMode(true);
                updateStatusIndicator("offline");
                loadTeamConfigFromStorage();
                validateAndFixTeamConfigDates();
                loadLineStepsFromStorage();
                loadProgressFromStorage();
                loadBuiltFromStorage();
                updateAllDisplays();
                initializeCharts();
                hideLoading();
            }
        );
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        setReadOnlyMode(true);
        updateStatusIndicator("offline");
        // Fallback para localStorage se Firebase falhar
        loadTeamConfigFromStorage();
        validateAndFixTeamConfigDates(); // Garantir datas válidas
        loadLineStepsFromStorage();
        loadProgressFromStorage();
        loadBuiltFromStorage();
        updateAllDisplays();
        initializeCharts();
        hideLoading();
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("project") || "thommen-belo-monte-2025";

    currentProjectId = projectId;
    setCurrentProjectId(projectId);
    loadProjectData();
}

async function loadProjectData() {
    showLoading("Carregando dados do projeto...");
    updateStatusIndicator("saving");

    // Sempre tentar Firebase primeiro, detectando e resolvendo conflitos
    if (db && currentProjectId) {
        const isReadOnlyMode =
            !isAuthenticated &&
            (!localStorage.getItem("linhasVidaProgress") ||
                !localStorage.getItem("linhasVidaLineSteps") ||
                !localStorage.getItem("linhasVidaTeamConfig"));

        let conflictResolved = false;
        if (!isReadOnlyMode) {
            conflictResolved = await detectAndResolveDataConflicts();
        }

        if (conflictResolved) {
            updateAllDisplays();
            initializeCharts();
            updateStatusIndicator("online");
            setupRealtimeListener();
            hideLoading();
            return;
        }

        try {
            const doc = await db.collection("projects").doc(currentProjectId).get();

            if (doc.exists) {
                syncLocalStateToModule();
                applyFirebaseDataSnapshot(doc, {
                    isReadOnlyMode,
                    progressData,
                    lineStepsStatus,
                    executionDates,
                    teamConfig,
                    manualActiveUsina,
                    loadBuiltFromFirebase,
                });
                syncModuleStateToLocal();
            } else {
                syncLocalStateToModule();
                await saveProjectDataModule(db, currentProjectId, {
                    projectDataPartial: {
                        pimental: { progress: calculateProgressOfUsina("pimental") },
                        "belo-monte": { progress: calculateProgressOfUsina("belo-monte") },
                    },
                    onStatusChange: updateStatusIndicator,
                });
                syncModuleStateToLocal();
            }

            saveProgressToStorage();
            updateAllDisplays();
            initializeCharts();
            updateStatusIndicator("online");

            // Configurar listener em tempo real
            setupRealtimeListener();
        } catch (error) {
            console.error("Erro ao carregar dados do Firebase:", error);
            updateStatusIndicator("offline");
            setReadOnlyMode(true);

            // Fallback para localStorage apenas se Firebase falhar
            loadTeamConfigFromStorage();
            loadLineStepsFromStorage();
            loadProgressFromStorage();
            loadBuiltFromStorage();
            updateAllDisplays();
            initializeCharts();
        }
    } else {
        // Firebase não disponível, usar localStorage
        console.log("Firebase não disponível, usando localStorage");
        updateStatusIndicator("offline");
        setReadOnlyMode(true);
        loadTeamConfigFromStorage();
        loadLineStepsFromStorage();
        loadProgressFromStorage();
        loadBuiltFromStorage();
        updateAllDisplays();
        initializeCharts();
    }

    hideLoading();
}

// Função para detectar e resolver conflitos entre Firebase e localStorage
async function detectAndResolveDataConflicts() {
    if (!db || !currentProjectId) return false;

    updateStatusIndicator("syncing");

    try {
        syncLocalStateToModule();
        const resolved = await detectAndResolveDataConflictsModule(db, currentProjectId);
        syncModuleStateToLocal();
        return resolved;
    } catch (error) {
        console.error("Erro ao detectar conflitos:", error);
        return false;
    }
}

let unsubscribeListener = null;

function setupRealtimeListener() {
    if (!db || !currentProjectId || unsubscribeListener) {
        return;
    }

    syncLocalStateToModule();
    unsubscribeListener = setupRealtimeListenerModule(db, currentProjectId, {
        onChange: () => {
            syncModuleStateToLocal();
            updateAllDisplays();
            updateCharts();
            updateStatusIndicator("online");
        },
    });
}

function disconnectRealtimeListener() {
    if (unsubscribeListener) {
        unsubscribeListener();
        unsubscribeListener = null;
    }
}

async function saveProjectData() {
    if (!db || !currentProjectId || !navigator.onLine) {
        updateStatusIndicator("offline");
        setReadOnlyMode(true);
        showToast(
            "Modo somente leitura: sem conexão com o Firebase. Nenhuma alteração foi salva.",
            "error"
        );
        saveProgressToStorage();
        return;
    }

    updateStatusIndicator("saving");

    try {
        executionDates = sanitizeExecutionDates(executionDates);
        progressData = sanitizeProgressData(progressData);
        teamConfig = sanitizeTeamConfig(teamConfig);
        setTeamConfig(teamConfig);
        const simplifiedData = {
            pimental: { progress: calculateProgressOfUsina("pimental") },
            "belo-monte": { progress: calculateProgressOfUsina("belo-monte") },
        };

        syncLocalStateToModule();

        await saveProjectDataModule(db, currentProjectId, {
            projectDataPartial: simplifiedData,
            onStatusChange: updateStatusIndicator,
            onConflict: (error) => {
                console.error("Erro ao salvar dados:", error);
                updateStatusIndicator("offline");
            },
        });

        syncModuleStateToLocal();
        updateStatusIndicator("online");
    } catch (error) {
        // Filtrar erros conhecidos que não devem aparecer para o usuário
        if (
            error.message &&
            (error.message.includes("channel closed") ||
                error.message.includes("asynchronous response") ||
                error.message.includes("Invalid time value"))
        ) {
            // Erros silenciosos - apenas log no console se necessário
            console.debug("Erro conhecido ignorado:", error.message);
        } else {
            console.error("Erro ao salvar dados:", error);
        }

        updateStatusIndicator("offline");
        // Fallback para localStorage
        saveProgressToStorage();
    }
}

function calculateProgressOfUsina(usinaKey) {
    // Calcular progresso considerando tanto bases quanto etapas do cabo
    const totalBases = calculateTotalBasesOfUsina(usinaKey);
    const completedBases = calculateCompletedBasesOfUsina(usinaKey);
    const totalCableSteps = calculateTotalCableStepsOfUsina(usinaKey);
    const completedCableSteps = calculateCableStepsCompletedOfUsina(usinaKey);

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;

    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
}

// Funções para calcular progresso das etapas do cabo
function calculateCableStepsCompleted() {
    let completed = 0;
    let lineCount = 0;
    for (const usina in lineStepsStatus) {
        for (const linha in lineStepsStatus[usina]) {
            lineCount++;
            const steps = lineStepsStatus[usina][linha];
            if (steps.passagemCabo) completed++;
            if (steps.crimpagemCabo) completed++;
            if (steps.afericaoCrimpagem) completed++;
            if (steps.tensionamentoCabo) completed++;
        }
    }
    console.log("🔧 calculateCableStepsCompleted:", {
        totalLines: lineCount,
        completedSteps: completed,
        lineStepsStatus: lineStepsStatus,
    });
    return completed;
}

function calculateCableStepsCompletedOfUsina(usinaKey) {
    let completed = 0;
    if (lineStepsStatus[usinaKey]) {
        for (const linha in lineStepsStatus[usinaKey]) {
            const steps = lineStepsStatus[usinaKey][linha];
            if (steps.passagemCabo) completed++;
            if (steps.crimpagemCabo) completed++;
            if (steps.afericaoCrimpagem) completed++;
            if (steps.tensionamentoCabo) completed++;
        }
    }
    return completed;
}

function calculateTotalCableSteps() {
    let total = 0;
    for (const usina in projectData) {
        for (const _linha in projectData[usina].linhas) {
            total += 4; // 4 etapas por linha
        }
    }
    return total;
}

function calculateTotalCableStepsOfUsina(usinaKey) {
    let total = 0;
    if (projectData[usinaKey]) {
        for (const _linha in projectData[usinaKey].linhas) {
            total += 4; // 4 etapas por linha
        }
    }
    return total;
}

function calculateCableStepsCompletedOfLine(usinaKey, linha) {
    let completed = 0;
    if (lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha]) {
        const steps = lineStepsStatus[usinaKey][linha];
        if (steps.passagemCabo) completed++;
        if (steps.crimpagemCabo) completed++;
        if (steps.afericaoCrimpagem) completed++;
        if (steps.tensionamentoCabo) completed++;
    }
    return completed;
}

function updateStatusIndicator(status) {
    setReadOnlyMode(status === "offline");
    const indicator = document.getElementById("statusIndicator");
    indicator.className = `status-indicator status-${status}`;

    const statusText = {
        online: "Online",
        offline: "Offline",
        saving: "Salvando...",
        syncing: "Sincronizando...",
    };

    const statusIcon = {
        online: "fa-circle",
        offline: "fa-circle",
        saving: "fa-spinner fa-spin",
        syncing: "fa-sync fa-spin",
    };

    indicator.innerHTML = `<i class="fas ${statusIcon[status]}"></i> ${statusText[status]}`;
}

function showLoading(text = "Carregando...") {
    document.getElementById("loadingOverlay").style.display = "flex";
    document.querySelector(".loading-text").textContent = text;
}

function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}

// Funções de atualização de interface
function updateDashboard() {
    const progress = calculateProgress();
    const totalBases = calculateTotalBases();
    const completedBases = calculateCompletedBases();

    console.log("updateDashboard debug:", {
        progress: progress,
        totalBases: totalBases,
        completedBases: completedBases,
        progressData: progressData,
        projectData: projectData,
    });
    const productivity = calculateProductivity();
    const estimatedCompletion = calculateEstimatedCompletion();
    const workDays = calculateWorkDays();

    document.getElementById("progressoGeral").textContent = progress.toFixed(1) + "%";
    document.getElementById("progressBar").style.width = progress + "%";
    document.getElementById("basesCompletas").textContent =
        `${completedBases} de ${totalBases} bases concluídas`;

    document.getElementById("produtividade").textContent = productivity.toFixed(1);

    // Calcular e exibir horas trabalhadas
    const horasTrabalhadas = calculateWorkedHours();
    document.getElementById("horasTrabalhadas").textContent = horasTrabalhadas.toFixed(1);

    if (estimatedCompletion) {
        document.getElementById("estimativaConclusao").textContent =
            estimatedCompletion.toLocaleDateString("pt-BR");
        const remainingDays = Math.ceil(
            (estimatedCompletion - teamConfig.dataAtual) / (1000 * 60 * 60 * 24)
        );
        document.getElementById("diasRestantes").textContent = `${remainingDays} dias restantes`;
    } else if (progress >= 100) {
        document.getElementById("estimativaConclusao").textContent = "Concluído";
        document.getElementById("diasRestantes").textContent = "Projeto finalizado";
    } else {
        document.getElementById("estimativaConclusao").textContent = "Calculando...";
        document.getElementById("diasRestantes").textContent = "Aguardando dados";
    }

    document.getElementById("diasTrabalhados").textContent = workDays;

    // Data de início fixa
    document.getElementById("tempoDecorrido").textContent = "Iniciado em 11/09/2025";

    if (progress >= 100) {
        document.getElementById("statusProjeto").textContent = "Concluído";
    } else if (progress > 0) {
        document.getElementById("statusProjeto").textContent = "Em Andamento";
    } else {
        document.getElementById("statusProjeto").textContent = "Aguardando Início";
    }
}

function updateUsinaStats() {
    // Pimental
    const pimentalStats = calculateUsinaStats("pimental");
    document.getElementById("pimentalBases").textContent = pimentalStats.totalBases;
    document.getElementById("pimentalMetros").textContent =
        pimentalStats.totalMetros.toFixed(1) + "m";
    document.getElementById("pimentalProgresso").textContent =
        pimentalStats.progress.toFixed(1) + "%";

    // Estimativa Pimental
    const pimentalEstimativa = calculateUsinaEstimatedCompletion("pimental");
    if (pimentalEstimativa && pimentalStats.progress < 100) {
        document.getElementById("pimentalEstimativa").textContent =
            pimentalEstimativa.toLocaleDateString("pt-BR");
    } else if (pimentalStats.progress >= 100) {
        document.getElementById("pimentalEstimativa").textContent = "Concluído";
    } else {
        document.getElementById("pimentalEstimativa").textContent = "Calculando...";
    }

    // Belo Monte
    const beloMonteStats = calculateUsinaStats("belo-monte");
    document.getElementById("beloMonteBases").textContent = beloMonteStats.totalBases;
    document.getElementById("beloMonteMetros").textContent =
        beloMonteStats.totalMetros.toFixed(1) + "m";
    document.getElementById("beloMonteProgresso").textContent =
        beloMonteStats.progress.toFixed(1) + "%";

    // Estimativa Belo Monte
    const beloMonteEstimativa = calculateUsinaEstimatedCompletion("belo-monte");
    if (beloMonteEstimativa && beloMonteStats.progress < 100) {
        document.getElementById("beloMonteEstimativa").textContent =
            beloMonteEstimativa.toLocaleDateString("pt-BR");
    } else if (beloMonteStats.progress >= 100) {
        document.getElementById("beloMonteEstimativa").textContent = "Concluído";
    } else {
        document.getElementById("beloMonteEstimativa").textContent = "Calculando...";
    }

    // Oficina
    const oficinaStats = calculateUsinaStats("oficina");
    document.getElementById("oficinaBases").textContent = oficinaStats.totalBases;
    document.getElementById("oficinaMetros").textContent =
        oficinaStats.totalMetros.toFixed(1) + "m";
    document.getElementById("oficinaProgresso").textContent =
        oficinaStats.progress.toFixed(1) + "%";

    // Indicar qual usina está ativa
    const activeUsina = getActiveUsina();
    updateActiveUsinaIndicators(
        activeUsina,
        pimentalStats.progress,
        beloMonteStats.progress,
        oficinaStats.progress
    );
    updateActiveUsinaButtons();
}

function updateActiveUsinaIndicators(
    activeUsina,
    pimentalProgress,
    beloMonteProgress,
    oficinaProgress
) {
    // Resetar todas as indicações
    document.querySelectorAll(".usina-title").forEach((title) => {
        title.classList.remove("usina-active", "usina-completed", "usina-pending");
    });

    // Aplicar indicadores baseados no status e usina ativa
    const pimentalTitle = document
        .querySelector("#tablePimental")
        .closest(".usina-section")
        .querySelector(".usina-title");
    const beloMonteTitle = document
        .querySelector("#tableBeloMonte")
        .closest(".usina-section")
        .querySelector(".usina-title");
    const oficinaTitle = document
        .querySelector("#tableOficina")
        .closest(".usina-section")
        .querySelector(".usina-title");

    if (pimentalProgress >= 100) {
        pimentalTitle.classList.add("usina-completed");
        pimentalTitle.innerHTML =
            '<i class="fas fa-check-circle"></i> Usina Pimental <span class="status-text">(Concluída)</span>';
    } else if (activeUsina === "pimental") {
        pimentalTitle.classList.add("usina-active");
        pimentalTitle.innerHTML =
            '<i class="fas fa-cog fa-spin"></i> Usina Pimental <span class="status-text">(Em Execução)</span>';
    } else {
        pimentalTitle.classList.add("usina-pending");
        pimentalTitle.innerHTML =
            '<i class="fas fa-clock"></i> Usina Pimental <span class="status-text">(Aguardando)</span>';
    }

    if (beloMonteProgress >= 100) {
        beloMonteTitle.classList.add("usina-completed");
        beloMonteTitle.innerHTML =
            '<i class="fas fa-check-circle"></i> Usina Belo Monte <span class="status-text">(Concluída)</span>';
    } else if (activeUsina === "belo-monte") {
        beloMonteTitle.classList.add("usina-active");
        beloMonteTitle.innerHTML =
            '<i class="fas fa-cog fa-spin"></i> Usina Belo Monte <span class="status-text">(Em Execução)</span>';
    } else {
        beloMonteTitle.classList.add("usina-pending");
        beloMonteTitle.innerHTML =
            '<i class="fas fa-clock"></i> Usina Belo Monte <span class="status-text">(Aguardando)</span>';
    }

    if (oficinaProgress >= 100) {
        oficinaTitle.classList.add("usina-completed");
        oficinaTitle.innerHTML =
            '<i class="fas fa-check-circle"></i> Oficina <span class="status-text">(Concluída)</span>';
    } else if (activeUsina === "oficina") {
        oficinaTitle.classList.add("usina-active");
        oficinaTitle.innerHTML =
            '<i class="fas fa-cog fa-spin"></i> Oficina <span class="status-text">(Em Execução)</span>';
    } else {
        oficinaTitle.classList.add("usina-pending");
        oficinaTitle.innerHTML =
            '<i class="fas fa-clock"></i> Oficina <span class="status-text">(Aguardando)</span>';
    }
}

function updateActiveUsinaButtons() {
    const pimentalBtn = document.getElementById("btnActivePimental");
    const beloBtn = document.getElementById("btnActiveBelo");
    const oficinaBtn = document.getElementById("btnActiveOficina");
    const statusPimental = document.getElementById("statusPimental");
    const statusBeloMonte = document.getElementById("statusBeloMonte");
    const statusOficina = document.getElementById("statusOficina");
    const pimentalStats = calculateUsinaStats("pimental");
    const beloMonteStats = calculateUsinaStats("belo-monte");
    const oficinaStats = calculateUsinaStats("oficina");
    const activeUsina = getActiveUsina();

    // Resetar classes
    pimentalBtn.className = "btn-usina-wide";
    beloBtn.className = "btn-usina-wide";
    oficinaBtn.className = "btn-usina-wide";

    // Atualizar texto de ajuda baseado na autenticação
    if (!isAuthenticated) {
        document.getElementById("controlHelpText").innerHTML =
            '<i class="fas fa-lock"></i> Clique para digitar a senha e alterar a usina ativa';
    } else {
        document.getElementById("controlHelpText").innerHTML =
            '<i class="fas fa-info-circle"></i> Clique para alternar a usina ativa. As estimativas serão recalculadas automaticamente.';
    }

    // Sempre manter os botões habilitados para permitir clique (a verificação de senha é na função setActiveUsina)
    pimentalBtn.disabled = false;
    beloBtn.disabled = false;
    oficinaBtn.disabled = false;

    // Aplicar estados baseados no progresso e seleção - Pimental
    if (pimentalStats.progress >= 100) {
        pimentalBtn.classList.add("completed");
        pimentalBtn.disabled = true;
        statusPimental.textContent = "Concluída";
        statusPimental.className = "btn-status completed";
    } else {
        if (activeUsina === "pimental") {
            pimentalBtn.classList.add("active");
            statusPimental.textContent = "Em Execução";
            statusPimental.className = "btn-status executing";
        } else {
            statusPimental.textContent = "Aguardando";
            statusPimental.className = "btn-status awaiting";
        }
    }

    // Aplicar estados baseados no progresso e seleção - Belo Monte
    if (beloMonteStats.progress >= 100) {
        beloBtn.classList.add("completed");
        beloBtn.disabled = true;
        statusBeloMonte.textContent = "Concluída";
        statusBeloMonte.className = "btn-status completed";
    } else {
        if (activeUsina === "belo-monte") {
            beloBtn.classList.add("active");
            statusBeloMonte.textContent = "Em Execução";
            statusBeloMonte.className = "btn-status executing";
        } else {
            statusBeloMonte.textContent = "Aguardando";
            statusBeloMonte.className = "btn-status awaiting";
        }
    }

    // Aplicar estados baseados no progresso e seleção - Oficina
    if (oficinaStats.progress >= 100) {
        oficinaBtn.classList.add("completed");
        oficinaBtn.disabled = true;
        statusOficina.textContent = "Concluída";
        statusOficina.className = "btn-status completed";
    } else {
        if (activeUsina === "oficina") {
            oficinaBtn.classList.add("active");
            statusOficina.textContent = "Em Execução";
            statusOficina.className = "btn-status executing";
        } else {
            statusOficina.textContent = "Aguardando";
            statusOficina.className = "btn-status awaiting";
        }
    }
}

function calculateUsinaStats(usinaKey) {
    const usina = projectData[usinaKey];
    let totalBases = 0;
    let totalMetros = 0;
    let completedBases = 0;

    // Calcular totais da usina
    for (const linha in usina.linhas) {
        const linhaData = usina.linhas[linha];
        totalMetros += linhaData.metragem;

        for (const tipo in linhaData.bases) {
            totalBases += linhaData.bases[tipo];
        }
    }

    // Calcular bases concluídas na usina
    if (progressData[usinaKey]) {
        for (const linha in progressData[usinaKey]) {
            for (const tipo in progressData[usinaKey][linha]) {
                completedBases += progressData[usinaKey][linha][tipo] || 0;
            }
        }
    }

    // Incluir etapas do cabo no cálculo
    const totalCableSteps = calculateTotalCableStepsOfUsina(usinaKey);
    const completedCableSteps = calculateCableStepsCompletedOfUsina(usinaKey);

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return {
        totalBases,
        totalMetros,
        completedBases,
        progress,
        totalCableSteps,
        completedCableSteps,
    };
}

function calculateUsinaEstimatedCompletion(usinaKey) {
    const usinaStats = calculateUsinaStats(usinaKey);
    const remainingBases = usinaStats.totalBases - usinaStats.completedBases;
    const productivity = calculateProductivity();

    if (productivity <= 0 || remainingBases <= 0) return null;

    const activeUsina = getActiveUsina();
    const otherUsinaKey = usinaKey === "pimental" ? "belo-monte" : "pimental";
    const otherStats = calculateUsinaStats(otherUsinaKey);

    let daysNeeded = 0;
    const currentDate = new Date(teamConfig.dataAtual);

    if (usinaKey === activeUsina) {
        // Esta é a usina ativa - calcular apenas o tempo para suas bases restantes
        daysNeeded = Math.ceil(remainingBases / productivity);
    } else {
        // Esta usina será executada após a ativa
        const activeRemainingBases = otherStats.totalBases - otherStats.completedBases;

        if (activeRemainingBases > 0) {
            // Tempo para terminar a usina ativa + tempo para esta usina
            const daysForActiveUsina = Math.ceil(activeRemainingBases / productivity);
            const daysForThisUsina = Math.ceil(remainingBases / productivity);
            daysNeeded = daysForActiveUsina + daysForThisUsina;
        } else {
            // A usina ativa já está concluída, então esta é a próxima
            daysNeeded = Math.ceil(remainingBases / productivity);
        }
    }

    // Adicionar dias úteis
    let addedDays = 0;
    let completionDate = new Date(currentDate);

    while (addedDays < daysNeeded) {
        completionDate.setDate(completionDate.getDate() + 1);
        const weekDay = completionDate.getDay();
        if (weekDay >= 1 && weekDay <= 5) {
            addedDays++;
        }
    }

    return completionDate;
}

function updateTables() {
    updateTable("pimental", "tablePimental");
    updateTable("belo-monte", "tableBeloMonte");
    updateTable("oficina", "tableOficina");
}

// Sistema de Filtros
function initializeFilters() {
    // Filtros Pimental
    document.getElementById("filterPimentalSearch").addEventListener("input", () => {
        filterTable("pimental");
    });
    document.getElementById("filterPimentalStatus").addEventListener("change", () => {
        filterTable("pimental");
    });

    // Filtros Belo Monte
    document.getElementById("filterBeloMonteSearch").addEventListener("input", () => {
        filterTable("belo-monte");
    });
    document.getElementById("filterBeloMonteStatus").addEventListener("change", () => {
        filterTable("belo-monte");
    });

    // Filtros Oficina
    document.getElementById("filterOficinaSearch").addEventListener("input", () => {
        filterTable("oficina");
    });
    document.getElementById("filterOficinaStatus").addEventListener("change", () => {
        filterTable("oficina");
    });
}

function filterTable(usinaKey) {
    const tableId =
        usinaKey === "pimental"
            ? "tablePimental"
            : usinaKey === "belo-monte"
              ? "tableBeloMonte"
              : "tableOficina";
    const searchId =
        usinaKey === "pimental"
            ? "filterPimentalSearch"
            : usinaKey === "belo-monte"
              ? "filterBeloMonteSearch"
              : "filterOficinaSearch";
    const statusId =
        usinaKey === "pimental"
            ? "filterPimentalStatus"
            : usinaKey === "belo-monte"
              ? "filterBeloMonteStatus"
              : "filterOficinaStatus";
    const resultId =
        usinaKey === "pimental"
            ? "pimentalFilterResults"
            : usinaKey === "belo-monte"
              ? "beloMonteFilterResults"
              : "oficinaFilterResults";

    const searchTerm = document.getElementById(searchId).value.toLowerCase();
    const statusFilter = document.getElementById(statusId).value;

    const tbody = document.querySelector(`#${tableId} tbody`);
    const rows = tbody.querySelectorAll("tr");

    let visibleCount = 0;
    const totalCount = rows.length;

    rows.forEach((row) => {
        const linhaText = row.cells[0].textContent.toLowerCase();
        const statusText = row.cells[5].textContent.trim();

        const matchesSearch = linhaText.includes(searchTerm);
        const matchesStatus = !statusFilter || statusText === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    // Atualizar contador
    document.getElementById(resultId).textContent =
        `Mostrando ${visibleCount} de ${totalCount} linhas`;
}

function updateTable(usinaKey, tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = "";

    const usina = projectData[usinaKey];

    // Garantir que lineStepsStatus está inicializado para esta usina
    if (!lineStepsStatus[usinaKey]) {
        lineStepsStatus[usinaKey] = {};
    }

    // Ordenar linhas numericamente
    const linhasOrdenadas = Object.keys(usina.linhas).sort((a, b) => {
        return parseInt(a) - parseInt(b);
    });

    for (const linha of linhasOrdenadas) {
        const linhaData = usina.linhas[linha];
        const row = tbody.insertRow();

        // Calcular bases totais e concluídas
        let totalBases = 0;
        let completedBases = 0;
        let basesText = [];

        for (const tipo in linhaData.bases) {
            const quantidade = linhaData.bases[tipo];
            totalBases += quantidade;
            basesText.push(`${quantidade} ${tipo}`);

            // Calcular quantas bases deste tipo estão concluídas para esta linha específica
            const completedNaLinha =
                (progressData[usinaKey] &&
                    progressData[usinaKey][linha] &&
                    progressData[usinaKey][linha][tipo]) ||
                0;
            completedBases += completedNaLinha;
        }

        // Incluir etapas do cabo no cálculo do progresso da linha
        const completedCableSteps = calculateCableStepsCompletedOfLine(usinaKey, linha);
        const totalCableSteps = 4; // 4 etapas por linha

        const totalItems = totalBases + totalCableSteps;
        const completedItems = completedBases + completedCableSteps;
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        const status = progress === 100 ? "Concluído" : progress > 0 ? "Em Andamento" : "Pendente";
        const storedExecutionDate = getExecutionDateForLine(usinaKey, linha, executionDates);
        const executionDateDisplay = formatExecutionDateForDisplay(storedExecutionDate);

        row.innerHTML = `
                    <td><strong>Linha ${linha}</strong></td>
                    <td>${linhaData.metragem}m</td>
                    <td>${basesText.join(", ")}</td>
                    <td>${completedBases}/${totalBases}</td>
                    <td>
                        <div class="progress-bar table-progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="table-progress-text">
                            ${progress.toFixed(1)}% (${totalBases} bases)
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${progress === 100 ? "status-concluido" : progress > 0 ? "status-andamento" : "status-pendente"}">
                            ${status}
                        </span>
                    </td>
                    <td class="execution-date-cell">
                        ${
                            executionDateDisplay
                                ? executionDateDisplay
                                : completedBases > 0
                                  ? '<span style="color: #6b7280; font-style: italic;">Não informada</span>'
                                  : ""
                        }
                    </td>
                    <td>
                        <div class="cable-steps">
                            <div class="step-item">
                                <span class="step-label">Passagem:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].passagemCabo ? "step-done" : "step-pending"}" 
                                        title="Clique para alternar o status da passagem"
                                        onclick="App.toggleStep('${usinaKey}', '${linha}', 'passagemCabo')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].passagemCabo ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Crimpagem:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].crimpagemCabo ? "step-done" : "step-pending"}" 
                                        title="Clique para alternar o status da crimpagem"
                                        onclick="App.toggleStep('${usinaKey}', '${linha}', 'crimpagemCabo')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].crimpagemCabo ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Aferição:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].afericaoCrimpagem ? "step-done" : "step-pending"}" 
                                        title="Clique para alternar o status da aferição"
                                        onclick="App.toggleStep('${usinaKey}', '${linha}', 'afericaoCrimpagem')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].afericaoCrimpagem ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Tensionamento:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].tensionamentoCabo ? "step-done" : "step-pending"}"
                                        title="Clique para alternar o status do tensionamento"
                                        onclick="App.toggleStep('${usinaKey}', '${linha}', 'tensionamentoCabo')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].tensionamentoCabo ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Lacre Tensionador:</span>
                                <span class="seal-display seal-editable" data-usina="${usinaKey}" data-linha="${linha}" data-field="lacreTensionador">
                                    ${(lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].lacreTensionador) || "-"}
                                </span>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Lacre Loop Abs:</span>
                                <span class="seal-display seal-editable" data-usina="${usinaKey}" data-linha="${linha}" data-field="lacreLoopAbs">
                                    ${(lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].lacreLoopAbs) || "-"}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-small" onclick="App.openLineModal('${usinaKey}', '${linha}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="App.openObservationModal('${usinaKey}', '${linha}')" style="margin-left: 5px;">
                            <i class="fas fa-comment"></i>
                        </button>
                    </td>
                `;

        // Adicionar eventos de mouse para tooltip
        row.addEventListener("mouseenter", (e) => showTooltip(e, usinaKey, linha, linhaData));
        row.addEventListener("mouseleave", hideTooltip);
        row.addEventListener("mousemove", updateTooltipPosition);
    }
}

// Funções do tooltip
function showTooltip(event, usinaKey, linha, linhaData) {
    const tooltip = document.getElementById("basesTooltip");

    // Calcular detalhes das bases para esta linha
    let tooltipContent = `<div class="tooltip-header">Linha ${linha} - ${projectData[usinaKey].name}</div>`;

    tooltipContent += `<div class="tooltip-section">
                <span class="tooltip-label">Extensão:</span> 
                <span class="tooltip-value">${linhaData.metragem}m</span>
            </div>`;

    tooltipContent += `<div class="tooltip-section">
                <span class="tooltip-label">Detalhes das bases:</span>
            </div>`;

    for (const tipo in linhaData.bases) {
        const quantidade = linhaData.bases[tipo];

        // Calcular quantas bases deste tipo estão concluídas nesta linha específica
        const completedNaLinha =
            (progressData[usinaKey] &&
                progressData[usinaKey][linha] &&
                progressData[usinaKey][linha][tipo]) ||
            0;
        const pendingNaLinha = quantidade - completedNaLinha;

        tooltipContent += `<div class="tooltip-section" style="margin-left: 12px; white-space: nowrap;">
                    <span class="tooltip-label">Tipo ${tipo}:</span>
                    <span class="tooltip-value">${completedNaLinha} concluídas</span>${pendingNaLinha > 0 ? `<span class="tooltip-pending">, ${pendingNaLinha} pendentes</span>` : ""}<span style="color: #9ca3af;"> (${quantidade} total)</span>
                </div>`;
    }

    // Adicionar informações das etapas do cabo
    tooltipContent += `<div class="tooltip-section">
                <span class="tooltip-label">Etapas do cabo:</span>
            </div>`;

    const steps = (lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha]) || {
        passagemCabo: false,
        crimpagemCabo: false,
        afericaoCrimpagem: false,
        tensionamentoCabo: false,
    };
    const stepNames = {
        passagemCabo: "Passagem",
        crimpagemCabo: "Crimpagem",
        afericaoCrimpagem: "Aferição de Crimpagem",
        tensionamentoCabo: "Tensionamento",
    };

    for (const [stepKey, stepName] of Object.entries(stepNames)) {
        const isCompleted = steps[stepKey];
        const statusText = isCompleted ? "Realizado" : "Pendente";
        const statusColor = isCompleted ? "#10b981" : "#ef4444";

        tooltipContent += `<div class="tooltip-section" style="margin-left: 12px; white-space: nowrap;">
                    <span class="tooltip-label">${stepName}:</span>
                    <span class="tooltip-value" style="color: ${statusColor};">${statusText}</span>
                </div>`;
    }

    tooltip.innerHTML = tooltipContent;
    tooltip.classList.add("show");

    updateTooltipPosition(event);
}

function hideTooltip() {
    const tooltip = document.getElementById("basesTooltip");
    tooltip.classList.remove("show");
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById("basesTooltip");
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let left = event.pageX + 35;
    let top = event.pageY - rect.height - 35;

    // Ajustar posição se sair da tela
    if (left + rect.width > viewportWidth) {
        left = event.pageX - rect.width - 35;
    }

    if (top < window.pageYOffset) {
        top = event.pageY + 35;
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
}

// ===== FUNÇÕES DO MAPA INTERATIVO =====

function updateAllDisplays() {
    console.log("🔄 updateAllDisplays chamado");
    updateDashboard();
    updateUsinaStats();
    updateTables();
    updateCharts();
    updateChartInfos();
    updateMapFromExternalData(); // Atualizar mapa interativo
    updateTransversalVisuals(); // Atualizar grupos transversais
    updateLastUpdateTimestamp();
    renderBuiltTables(); // Atualizar tabelas de Built
    console.log("✅ updateAllDisplays concluído");
}

function updateLastUpdateTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
    const element = document.getElementById("lastUpdateTime");
    if (element) {
        element.textContent = timeString;

        // Adicionar efeito visual de atualização
        const indicator = element.parentElement.querySelector(".update-indicator");
        if (indicator) {
            indicator.style.animation = "none";
            indicator.offsetHeight; // Trigger reflow
            indicator.style.animation = "pulse 2s infinite";
        }
    }
}

// updateChartInfos movida para ui/charts.js

// Atualizar visuais dos grupos transversais no mapa
// Funções para modo de edição das tabelas principais
let tableEditBackup = null;

function enableTableEdit(usinaKey) {
    // Verificar autenticação antes de permitir edição
    if (!isAuthenticated) {
        pendingAction = () => enableTableEdit(usinaKey);
        showPasswordModal();
        return;
    }
    if (!requireOnlineEdits()) return;

    // Fazer backup do estado atual
    tableEditBackup = JSON.parse(JSON.stringify(lineStepsStatus));

    // Ativar modo de edição na tabela
    const tableId =
        usinaKey === "pimental"
            ? "tablePimental"
            : usinaKey === "belo-monte"
              ? "tableBeloMonte"
              : "tableOficina";
    const table = document.getElementById(tableId);
    table.classList.add("edit-mode");

    // Converter campos de lacre em inputs editáveis
    const sealDisplays = table.querySelectorAll(".seal-editable");
    sealDisplays.forEach((seal) => {
        const usina = seal.dataset.usina;
        const linha = seal.dataset.linha;
        const field = seal.dataset.field;
        const currentValue =
            (lineStepsStatus[usina] &&
                lineStepsStatus[usina][linha] &&
                lineStepsStatus[usina][linha][field]) ||
            "";

        seal.innerHTML = `<input type="text" class="seal-input-table" value="${currentValue}" maxlength="20" placeholder="Digite o lacre" data-usina="${usina}" data-linha="${linha}" data-field="${field}" style="width: 120px; padding: 4px; text-align: center; border: 2px solid var(--primary-blue); border-radius: 4px; background: white;">`;
    });

    // Alternar botões
    const buttonPrefix =
        usinaKey === "pimental" ? "pimental" : usinaKey === "belo-monte" ? "beloMonte" : "oficina";
    document.getElementById(`${buttonPrefix}ViewButtons`).style.display = "none";
    document.getElementById(`${buttonPrefix}EditButtons`).style.display = "flex";
}

function cancelTableEdit(usinaKey) {
    // Restaurar backup
    if (tableEditBackup) {
        const restored = JSON.parse(JSON.stringify(tableEditBackup));
        lineStepsStatus = restored;
        setLineStepsStatusState(restored); // Sync with state.js
        tableEditBackup = null;
    }

    // Desativar modo de edição
    const tableId =
        usinaKey === "pimental"
            ? "tablePimental"
            : usinaKey === "belo-monte"
              ? "tableBeloMonte"
              : "tableOficina";
    const table = document.getElementById(tableId);
    table.classList.remove("edit-mode");

    // Alternar botões
    const buttonPrefix =
        usinaKey === "pimental" ? "pimental" : usinaKey === "belo-monte" ? "beloMonte" : "oficina";
    document.getElementById(`${buttonPrefix}ViewButtons`).style.display = "block";
    document.getElementById(`${buttonPrefix}EditButtons`).style.display = "none";

    // Recarregar tabela com dados originais
    updateTable(usinaKey, tableId);
}

async function saveTableEdit(usinaKey) {
    if (!requireOnlineEdits()) return;
    try {
        // Capturar valores dos lacres dos inputs antes de salvar
        const tableId =
            usinaKey === "pimental"
                ? "tablePimental"
                : usinaKey === "belo-monte"
                  ? "tableBeloMonte"
                  : "tableOficina";
        const table = document.getElementById(tableId);
        const sealInputs = table.querySelectorAll(".seal-input-table");

        sealInputs.forEach((input) => {
            const usina = input.dataset.usina;
            const linha = input.dataset.linha;
            const field = input.dataset.field;
            const value = input.value.trim();

            if (!lineStepsStatus[usina]) lineStepsStatus[usina] = {};
            if (!lineStepsStatus[usina][linha]) lineStepsStatus[usina][linha] = {};

            lineStepsStatus[usina][linha][field] = value;
        });

        // Salvar no localStorage
        saveLineStepsToStorage();
        saveProgressToStorage();

        // Salvar no Firebase se configurado
        if (db && currentProjectId) {
            await saveProjectData();
        }

        // Limpar backup
        tableEditBackup = null;

        // Atualizar displays
        updateAllDisplays();
        updateTransversalVisuals();

        // Desativar modo de edição
        table.classList.remove("edit-mode");

        // Alternar botões
        const buttonPrefix =
            usinaKey === "pimental"
                ? "pimental"
                : usinaKey === "belo-monte"
                  ? "beloMonte"
                  : "oficina";
        document.getElementById(`${buttonPrefix}ViewButtons`).style.display = "block";
        document.getElementById(`${buttonPrefix}EditButtons`).style.display = "none";

        showToast("Progresso atualizado com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showToast("Erro ao salvar progresso", "error");
    }
}

// Funções para Modal de Detalhes de Linha Individual movidas para src/ui/lineModals.js

// ========== FUNÇÕES PARA BUILT INFORMATION ==========

/**
 * Inicializa dados de Built vazios baseado em projectData
 */
function initializeBuiltData() {
    builtInformations = {};

    for (const usinaKey of Object.keys(projectData)) {
        builtInformations[usinaKey] = {};

        const linhas = projectData[usinaKey].linhas;
        for (const linhaKey of Object.keys(linhas)) {
            builtInformations[usinaKey][linhaKey] = {};

            // Determinar número de pares para esta linha
            const pairCount = getBuiltPairCount(usinaKey, linhaKey);

            for (let i = 1; i <= pairCount; i++) {
                const pairKey = `${String(i).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                builtInformations[usinaKey][linhaKey][pairKey] = "";
            }
        }
    }
}

/**
 * Renderiza as tabelas de Built para as 3 usinas
 */
/**
 * Salva Built no localStorage
 */
function saveBuiltToStorage(force = false) {
    if (!force && !allowOnlineEdits) return;
    const serialized = JSON.stringify(builtInformations);
    // Chave oficial usada pelo listener/persistência
    localStorage.setItem("linhasVidaBuiltInformations", serialized);
    // Chave legada mantida por compatibilidade com backups antigos
    localStorage.setItem("linhasVidaBuilt", serialized);
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

/**
 * Carrega Built do localStorage
 */
function loadBuiltFromStorage() {
    const stored =
        localStorage.getItem("linhasVidaBuiltInformations") ||
        localStorage.getItem("linhasVidaBuilt");
    if (!stored) {
        initializeBuiltData();
        return;
    }

    try {
        const loadedData = JSON.parse(stored);
        builtInformations = sanitizeBuiltInformations(loadedData, projectData);
    } catch (error) {
        console.warn("Erro ao carregar Built do storage:", error);
        initializeBuiltData();
    }
}

/**
 * Salva Built no Firebase
 */
async function saveBuiltToFirebase() {
    if (!requireOnlineEdits()) return;

    try {
        await db.collection("projects").doc(currentProjectId).update({
            builtInformations: builtInformations,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error("Erro ao salvar Built no Firebase:", error);
        throw error;
    }
}

/**
 * Carrega Built do Firebase
 */
async function loadBuiltFromFirebase(docSnapshot) {
    if (docSnapshot.data()?.builtInformations) {
        builtInformations = sanitizeBuiltInformations(docSnapshot.data().builtInformations, projectData);
    } else {
        initializeBuiltData();
    }
}

// ========== FIM DAS FUNÇÕES PARA BUILT INFORMATION ==========

// Funções do sistema de senha
function showPasswordModal() {
    const modal = document.getElementById("passwordModal");
    const input = document.getElementById("passwordInput");
    const error = document.getElementById("passwordError");

    // Limpar e preparar modal
    input.value = "";
    error.style.display = "none";

    // Mostrar modal
    modal.style.display = "block";

    // Forçar reflow e depois focar
    modal.offsetHeight;

    // Múltiplas tentativas de foco para garantir que funcione
    setTimeout(() => {
        input.focus();
        input.select();
    }, 50);

    setTimeout(() => {
        input.focus();
    }, 200);

    showReadOnlyNotice();
}

function closePasswordModal() {
    document.getElementById("passwordModal").style.display = "none";
    pendingAction = null;
}

// Função para calcular hash SHA-256
async function calculateSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

async function checkPassword() {
    const password = document.getElementById("passwordInput").value;
    const errorDiv = document.getElementById("passwordError");

    // Garantir que o hash foi inicializado
    if (!PROJECT_PASSWORD_HASH) {
        await initializePasswordHash();
    }

    // Calcular hash da senha digitada e comparar
    const passwordHash = await calculateSHA256(password);

    if (passwordHash === PROJECT_PASSWORD_HASH) {
        isAuthenticated = true;

        // Salvar pendingAction ANTES de fechar o modal (que reseta para null)
        const actionToExecute = pendingAction;

        // Fechar modal e limpar estado
        closePasswordModal();
        hideReadOnlyNotice();

        // Executar ação pendente DEPOIS de fechar modal
        if (actionToExecute) {
            if (typeof actionToExecute === "function") {
                actionToExecute();
            } else if (actionToExecute === "openUpdate") {
                document.getElementById("updateModal").style.display = "block";
            }
        }

        // Autenticação expira em 10 minutos
        setTimeout(
            () => {
                isAuthenticated = false;
                showReadOnlyNotice();
            },
            10 * 60 * 1000
        );
    } else {
        errorDiv.style.display = "block";
        document.getElementById("passwordInput").value = "";
        document.getElementById("passwordInput").focus();
    }
}

function showReadOnlyNotice() {
    const badge = document.getElementById("readOnlyBadge");
    if (!badge) return;
    badge.style.display = "inline-flex";
}

function hideReadOnlyNotice() {
    const badge = document.getElementById("readOnlyBadge");
    if (badge) {
        badge.style.display = "none";
    }
}

// Função para alternar status das etapas do cabo
function toggleStep(usinaKey, linha, step) {
    if (!requireOnlineEdits()) return;
    // Verificar se está em modo de edição
    const tableId =
        usinaKey === "pimental"
            ? "tablePimental"
            : usinaKey === "belo-monte"
              ? "tableBeloMonte"
              : "tableOficina";
    const table = document.getElementById(tableId);
    const isEditMode = table && table.classList.contains("edit-mode");

    // Se NÃO estiver autenticado e NÃO estiver em modo de edição, pedir senha
    if (!isAuthenticated && !isEditMode) {
        pendingAction = () => toggleStep(usinaKey, linha, step);
        showPasswordModal();
        return;
    }

    // Garantir que a estrutura existe
    if (!lineStepsStatus[usinaKey]) {
        lineStepsStatus[usinaKey] = {};
    }
    if (!lineStepsStatus[usinaKey][linha]) {
        lineStepsStatus[usinaKey][linha] = {
            passagemCabo: false,
            crimpagemCabo: false,
            afericaoCrimpagem: false,
            tensionamentoCabo: false,
        };
    }

    // Alternar o status
    lineStepsStatus[usinaKey][linha][step] = !lineStepsStatus[usinaKey][linha][step];

    // Se estiver em modo de edição, apenas atualizar visual
    if (isEditMode) {
        // Atualizar apenas o visual do botão
        const tableIdForUpdate =
            usinaKey === "pimental"
                ? "tablePimental"
                : usinaKey === "belo-monte"
                  ? "tableBeloMonte"
                  : "tableOficina";
        updateTable(usinaKey, tableIdForUpdate);
        return;
    }

    // Caso contrário, salvar normalmente
    // Salvar no localStorage sempre
    saveLineStepsToStorage();

    // Salvar no Firebase se disponível
    if (db && currentProjectId) {
        try {
            // Garantir datas válidas
            if (
                !teamConfig.inicioTrabalhoBruto ||
                !(teamConfig.inicioTrabalhoBruto instanceof Date) ||
                isNaN(teamConfig.inicioTrabalhoBruto)
            ) {
                teamConfig.inicioTrabalhoBruto = new Date("2025-09-11");
            }
            if (
                !teamConfig.dataAtual ||
                !(teamConfig.dataAtual instanceof Date) ||
                isNaN(teamConfig.dataAtual)
            ) {
                teamConfig.dataAtual = new Date();
            }

            saveProjectData();
        } catch (error) {
            console.error("Erro ao salvar no Firebase:", error);
        }
    }

    // Atualizar as tabelas
    updateAllDisplays();
}

// Event listeners
document.getElementById("updateForm").addEventListener("submit", handleUpdateSubmit);
window.onclick = closeOnOutsideClick;

// Funções de persistência (implementadas em persistence.js)

function saveTeamConfigToStorage(force = false) {
    if (!force && !allowOnlineEdits) return;
    localStorage.setItem("linhasVidaTeamConfig", JSON.stringify(teamConfig));
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

function loadTeamConfigFromStorage() {
    const stored = localStorage.getItem("linhasVidaTeamConfig");

    if (stored) {
        try {
            const loadedConfig = JSON.parse(stored);
            teamConfig = sanitizeTeamConfig({
                ...teamConfig,
                ...loadedConfig,
            });
            setTeamConfig(teamConfig);
        } catch (error) {
            console.error("Erro ao carregar config:", error);
        }
    }

    // Garantir validação final sempre
    validateAndFixTeamConfigDates();

    // Salvar configuração atualizada para garantir persistência
    saveTeamConfigToStorage(true);
}

function saveLineStepsToStorage(force = false) {
    if (!force && !allowOnlineEdits) return;
    localStorage.setItem("linhasVidaLineSteps", JSON.stringify(lineStepsStatus));
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

function clearAllProgress() {
    if (!isAuthenticated) {
        pendingAction = clearAllProgress;
        showPasswordModal();
        return;
    }

    confirmActionPrompt({
        title: "Limpar todos os dados?",
        subtitle: "Esta ação não pode ser desfeita.",
        message:
            "ATENÇÃO: Isso apagará progresso, etapas do cabo, datas, observações e Built de todas as usinas. A limpeza também será salva no Firebase.",
        confirmLabel: "Apagar tudo",
        cancelLabel: "Cancelar",
        icon: "🧹",
        onConfirm: async () => {
            const sanitizedProgress = sanitizeProgressData({});
            progressData = sanitizedProgress;
            setProgressDataState(sanitizedProgress); // Sync with state.js

            const ensuredSteps = ensureLineStepsStructure({}, progressData);
            lineStepsStatus = ensuredSteps;
            setLineStepsStatusState(ensuredSteps); // Sync with state.js

            executionDates = {};
            lineObservations = ensureUsinaBuckets({});
            builtInformations = sanitizeBuiltInformations({}, projectData);
            manualActiveUsina = null;
            localStorage.removeItem("manualActiveUsina");

            saveProgressToStorage(true);
            saveLineStepsToStorage(true);
            saveBuiltToStorage(true);
            localStorage.removeItem("linhasVidaObservations");
            localStorage.removeItem("linhasVidaExecutionDates");
            localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());

            await saveProjectData();
            updateAllDisplays();

            showToast("Todo o progresso foi limpo com sucesso!", "success");
        },
    });
}

// Funções de backup e restauração de dados
function ensureUsinaBuckets(rawObject = {}) {
    const clone = rawObject ? JSON.parse(JSON.stringify(rawObject)) : {};
    ["pimental", "belo-monte", "oficina"].forEach((usina) => {
        if (!clone[usina]) {
            clone[usina] = {};
        }
    });
    return clone;
}

function ensureLineStepsStructure(rawLineSteps, referenceProgressData = progressData) {
    const base = ensureUsinaBuckets(rawLineSteps);
    const reference = referenceProgressData || {};

    for (const usina in reference) {
        for (const linha in reference[usina]) {
            const current = base[usina][linha] || {};
            base[usina][linha] = {
                passagemCabo: !!current.passagemCabo,
                crimpagemCabo: !!current.crimpagemCabo,
                afericaoCrimpagem: !!current.afericaoCrimpagem,
                tensionamentoCabo: !!current.tensionamentoCabo,
                lacreTensionador: current.lacreTensionador || "",
                lacreLoopAbs: current.lacreLoopAbs || "",
            };
        }
    }

    return base;
}

function exportProgressData() {
    const sanitizedProgress = sanitizeProgressData(progressData);
    const sanitizedLineSteps = ensureLineStepsStructure(lineStepsStatus, sanitizedProgress);
    const sanitizedExecutionDates = sanitizeExecutionDates(executionDates);
    const sanitizedObservations = ensureUsinaBuckets(lineObservations);
    const sanitizedBuilt = ensureUsinaBuckets(builtInformations);

    let completedBases = 0;
    for (const usina in sanitizedProgress) {
        for (const linha in sanitizedProgress[usina]) {
            for (const tipo in sanitizedProgress[usina][linha]) {
                completedBases += sanitizedProgress[usina][linha][tipo];
            }
        }
    }

    let completedCableSteps = 0;
    for (const usina in sanitizedLineSteps) {
        for (const linha in sanitizedLineSteps[usina]) {
            const steps = sanitizedLineSteps[usina][linha];
            if (steps.passagemCabo) completedCableSteps++;
            if (steps.crimpagemCabo) completedCableSteps++;
            if (steps.afericaoCrimpagem) completedCableSteps++;
            if (steps.tensionamentoCabo) completedCableSteps++;
        }
    }

    const totalBases = calculateTotalBases();
    const totalItems = totalBases + calculateTotalCableSteps();
    const progressPercent =
        totalItems > 0 ? ((completedBases + completedCableSteps) / totalItems) * 100 : 0;

    teamConfig = sanitizeTeamConfig(teamConfig);
    setTeamConfig(teamConfig);

    const teamConfigForExport = {
        ...teamConfig,
        inicioTrabalhoBruto: teamConfig.inicioTrabalhoBruto?.toISOString
            ? teamConfig.inicioTrabalhoBruto.toISOString()
            : teamConfig.inicioTrabalhoBruto,
        dataAtual: new Date().toISOString(),
    };

    const exportData = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        project: "Linhas de Vida - Thommen Engenharia",
        progressData: sanitizedProgress,
        lineStepsStatus: sanitizedLineSteps,
        executionDates: sanitizedExecutionDates,
        lineObservations: sanitizedObservations,
        builtInformations: sanitizedBuilt,
        manualActiveUsina: manualActiveUsina,
        teamConfig: teamConfigForExport,
        metadata: {
            totalBases,
            completedBases,
            progressPercentage: progressPercent,
        },
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `backup-completo-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Backup completo exportado com sucesso!", "success");
}

function importProgressData(event) {
    if (!isAuthenticated) {
        pendingAction = () => importProgressData(event);
        showPasswordModal();
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importData = JSON.parse(e.target.result);

            // Validar estrutura do arquivo
            if (!importData.progressData || !importData.version) {
                throw new Error("Arquivo de backup inválido");
            }

            const backupVersion = importData.version || "1.0";
            const hasLineSteps = Boolean(importData.lineStepsStatus);
            const hasExecutionDates = Boolean(importData.executionDates);
            const hasObservations = Boolean(importData.lineObservations);
            const hasBuiltInfo = Boolean(importData.builtInformations);

            const camposDetalhados =
                [
                    hasLineSteps ? "lineStepsStatus" : null,
                    hasExecutionDates ? "executionDates" : null,
                    hasObservations ? "lineObservations" : null,
                    hasBuiltInfo ? "builtInformations" : null,
                ]
                    .filter(Boolean)
                    .join(", ") || "apenas progressData/teamConfig";

            const confirmMsg =
                `Importar backup (v${backupVersion}) de ${new Date(importData.timestamp).toLocaleString("pt-BR")}?\n\n` +
                `Bases concluídas no backup: ${importData.metadata?.completedBases ?? "N/A"}\n` +
                `Progresso: ${importData.metadata?.progressPercentage?.toFixed?.(1) ?? "N/A"}%\n` +
                `Campos disponíveis: ${camposDetalhados}\n\n` +
                `ATENÇÃO: Isso substituirá os dados locais e salvará no Firebase.`;

            pendingImportData = { importData };
            const confirmTextEl = document.getElementById("importConfirmText");
            if (confirmTextEl) {
                confirmTextEl.textContent = confirmMsg;
            }
            const modal = document.getElementById("importConfirmModal");
            if (modal) modal.style.display = "block";
        } catch (error) {
            console.error("Erro ao importar dados:", error);
            showToast("Erro ao importar arquivo. Verifique se é um backup válido.", "error");
        }
    };

    reader.readAsText(file);

    // Limpar input para permitir reimportação do mesmo arquivo
    event.target.value = "";
}

function cancelImportConfirm() {
    const modal = document.getElementById("importConfirmModal");
    if (modal) modal.style.display = "none";
    pendingImportData = null;
}

function openConfirmActionModal({
    title = "Confirmar ação",
    subtitle = "",
    message = "",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    icon = "!",
    eyebrow = "Confirmação",
    onConfirm = null,
}) {
    pendingConfirmAction = onConfirm;
    confirmResolve = null;

    const modal = document.getElementById("confirmActionModal");
    if (!modal) return;

    modal.style.display = "flex";
    const el = (id) => document.getElementById(id);
    if (el("confirmActionTitle")) el("confirmActionTitle").textContent = title;
    if (el("confirmActionSubtitle")) el("confirmActionSubtitle").textContent = subtitle;
    if (el("confirmActionText")) el("confirmActionText").textContent = message;
    if (el("confirmActionConfirm"))
        el("confirmActionConfirm").innerHTML = `<i class="fas fa-check"></i> ${confirmLabel}`;
    if (el("confirmActionCancel")) el("confirmActionCancel").textContent = cancelLabel;
    if (el("confirmActionIcon")) el("confirmActionIcon").textContent = icon;
    if (el("confirmActionEyebrow")) el("confirmActionEyebrow").textContent = eyebrow;
}

function confirmActionPrompt(options) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        openConfirmActionModal(options);
    });
}

function cancelConfirmAction() {
    const modal = document.getElementById("confirmActionModal");
    if (modal) modal.style.display = "none";
    if (confirmResolve) confirmResolve(false);
    confirmResolve = null;
    pendingConfirmAction = null;
}

async function confirmActionProceed() {
    try {
        if (pendingConfirmAction) {
            await pendingConfirmAction();
        }
        if (confirmResolve) confirmResolve(true);
    } catch (error) {
        console.error("Erro ao concluir ação confirmada:", error);
        showToast("Erro ao concluir a ação. Verifique o console.", "error");
        if (confirmResolve) confirmResolve(false);
    } finally {
        const modal = document.getElementById("confirmActionModal");
        if (modal) modal.style.display = "none";
        pendingConfirmAction = null;
        confirmResolve = null;
    }
}

function confirmImportData() {
    if (!pendingImportData || !pendingImportData.importData) {
        cancelImportConfirm();
        return;
    }

    try {
        const importData = pendingImportData.importData;

        const backupVersion = importData.version || "1.0";
        const hasLineSteps = Boolean(importData.lineStepsStatus);
        const hasExecutionDates = Boolean(importData.executionDates);
        const hasObservations = Boolean(importData.lineObservations);
        const hasBuiltInfo = Boolean(importData.builtInformations);

        const sanitizedProgress = sanitizeProgressData(importData.progressData);
        progressData = sanitizedProgress;
        setProgressDataState(sanitizedProgress); // Sync with state.js

        // Atualizar lineStepsStatus se estiver no backup
        const ensuredLineSteps = ensureLineStepsStructure(
            hasLineSteps ? importData.lineStepsStatus : lineStepsStatus,
            sanitizedProgress
        );
        lineStepsStatus = ensuredLineSteps;
        setLineStepsStatusState(ensuredLineSteps); // Sync with state.js

        // Atualizar datas de execução se disponíveis
        if (hasExecutionDates) {
            executionDates = sanitizeExecutionDates(importData.executionDates);
        }

        // Atualizar observações e built se disponíveis
        lineObservations = ensureUsinaBuckets(
            hasObservations ? importData.lineObservations : lineObservations
        );
        builtInformations = hasBuiltInfo
            ? sanitizeBuiltInformations(importData.builtInformations, projectData)
            : sanitizeBuiltInformations(builtInformations, projectData);

        // Carregar usina ativa se existir no backup
        if (importData.manualActiveUsina) {
            manualActiveUsina = importData.manualActiveUsina;
            localStorage.setItem("manualActiveUsina", manualActiveUsina);
        }

        // Atualizar teamConfig se disponível
        if (importData.teamConfig) {
            const currentDate = teamConfig.dataAtual;
            teamConfig = sanitizeTeamConfig({
                ...teamConfig,
                ...importData.teamConfig,
                dataAtual: currentDate,
            });
            setTeamConfig(teamConfig);
            saveTeamConfigToStorage(true);
        }

        // Salvar no localStorage
        // Forçar persistência local mesmo em modo somente leitura/offline
        saveProgressToStorage(true);

        // Salvar no Firebase também
        saveProjectData();

        // Atualizar interface
        updateAllDisplays();

        showToast(`Backup v${backupVersion} importado com sucesso!`, "success");
    } catch (error) {
        console.error("Erro ao confirmar importação:", error);
        showToast("Erro ao importar arquivo. Verifique se é um backup válido.", "error");
    } finally {
        cancelImportConfirm();
    }
}

// Função para criar snapshot manual da versão atual
async function createCurrentSnapshot() {
    try {
        const historyRef = db.collection("projects").doc(currentProjectId).collection("history");

        await historyRef.add({
            progressData: progressData,
            lineStepsStatus: lineStepsStatus,
            executionDates: executionDates,
            teamConfig: teamConfig,
            lineObservations: lineObservations,
            builtInformations: builtInformations,
            savedAt: firebase.firestore.FieldValue.serverTimestamp(),
            version: "2.0",
            manual: true, // Marcador de snapshot manual
        });

        return true;
    } catch (error) {
        console.error("Erro ao criar snapshot:", error);
        showToast("Erro ao criar snapshot.", "error");
        return false;
    }
}

// Garantir que o modal de histórico use o layout novo mesmo com caches antigos
function ensureVersionHistoryStyles() {
    const existing = document.getElementById("version-history-inline-style");
    if (existing) return;

    const style = document.createElement("style");
    style.id = "version-history-inline-style";
    style.textContent = `
        #versionHistoryModal .modal-content {
            border-radius: 18px;
            padding: 18px 20px;
            max-width: 820px;
            border: 1px solid var(--border-gray);
            box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-height: 75vh;
            margin: 18px auto;
        }
        #versionHistoryList {
            max-height: calc(75vh - 180px);
            overflow-y: auto;
            margin: 12px 0 4px 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 1;
            min-height: 0;
        }
        #versionHistoryList .version-item {
            border: 1px solid var(--border-gray);
            border-radius: 12px;
            padding: 12px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            transition: transform 0.1s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        #versionHistoryList .version-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 32px -18px rgba(0, 0, 0, 0.35);
            border-color: var(--primary-blue);
        }
        #versionHistoryList .version-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            width: 100%;
        }
        #versionHistoryList .version-item-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            color: var(--dark-gray);
        }
        #versionHistoryList .version-item-title {
            font-weight: 700;
            color: var(--primary-blue);
        }
        #versionHistoryList .version-item-meta {
            font-size: 0.9rem;
            color: var(--medium-gray);
        }
        #versionHistoryList .version-item-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 8px;
        }
        #versionHistoryList .version-item--latest {
            box-shadow: 0 8px 24px -12px rgba(37, 99, 235, 0.25);
            border-color: rgba(37, 99, 235, 0.35);
        }
    `;
    document.head.appendChild(style);
}

// Função para abrir modal de histórico de versões
async function forceRestoreFromFirebase() {
    if (!requireOnlineEdits()) return;
    if (!isAuthenticated) {
        pendingAction = forceRestoreFromFirebase;
        showPasswordModal();
        return;
    }

    if (!db) {
        showToast("Firebase não está conectado. Verifique sua conexão.", "error");
        return;
    }

    await showVersionHistoryModal();
}

// Mostrar modal de histórico
async function showVersionHistoryModal() {
    try {
        ensureVersionHistoryStyles();
        showToast("Carregando histórico de versões...", "info");

        const historyRef = db.collection("projects").doc(currentProjectId).collection("history");

        // Primeiro, verificar se há documentos sem usar orderBy
        let snapshot;
        try {
            snapshot = await historyRef.orderBy("savedAt", "desc").limit(20).get();
        } catch (orderByError) {
            // Se der erro de índice, tentar sem ordenação
            console.log("OrderBy falhou, tentando sem ordenação:", orderByError.message);
            try {
                snapshot = await historyRef.limit(20).get();
            } catch (limitError) {
                console.error("Erro ao buscar histórico:", limitError);
                showToast("Erro ao carregar histórico. Verifique o console.", "error");
                throw limitError;
            }
        }

        if (snapshot.empty) {
            // Oferecer criar snapshot da versão atual usando modal customizado
            const createSnapshot = await confirmActionPrompt({
                title: "Criar primeiro snapshot?",
                subtitle: "Nenhuma versão anterior encontrada no histórico.",
                message:
                    "Nenhuma versão anterior encontrada no histórico.\n\n" +
                    "Deseja criar um snapshot da versão atual agora?\n\n" +
                    "Isso permitirá que você tenha um ponto de restauração.",
                confirmLabel: "Criar snapshot",
                cancelLabel: "Agora não",
                icon: "💾",
                eyebrow: "Histórico vazio",
            });

            if (createSnapshot) {
                await createCurrentSnapshot();
                showToast(
                    "Snapshot criado! Agora você pode fazer mudanças com segurança.",
                    "success"
                );
            } else {
                showToast(
                    "Faça qualquer modificação no projeto para criar a primeira versão.",
                    "info"
                );
            }
            return;
        }

        const versionList = document.getElementById("versionHistoryList");
        versionList.innerHTML = "";
        versionList.classList.add("version-list");

        const modalContent = document.querySelector("#versionHistoryModal .modal-content");
        if (modalContent) {
            modalContent.classList.add("version-modal");
        }

        // Ordenar manualmente se necessário
        const versions = [];
        snapshot.forEach((doc) => {
            versions.push({
                id: doc.id,
                data: doc.data(),
            });
        });

        versions.sort((a, b) => {
            const dateA = a.data.savedAt ? a.data.savedAt.toDate() : new Date(0);
            const dateB = b.data.savedAt ? b.data.savedAt.toDate() : new Date(0);
            return dateB - dateA; // Ordem decrescente (mais recente primeiro)
        });

        versions.forEach((version, index) => {
            const doc = { id: version.id };
            const data = version.data;
            const savedAt = data.savedAt ? data.savedAt.toDate() : new Date();
            const formattedDate = savedAt.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });

            // Calcular progresso desta versão (bases + etapas do cabo)
            let completedBases = 0;
            let totalBases = 0;
            if (data.progressData) {
                for (const usina in data.progressData) {
                    for (const linha in data.progressData[usina]) {
                        for (const tipo in data.progressData[usina][linha]) {
                            const valor = data.progressData[usina][linha][tipo];
                            completedBases += valor;
                            if (projectData[usina]?.linhas?.[linha]?.bases?.[tipo]) {
                                totalBases += projectData[usina].linhas[linha].bases[tipo];
                            }
                        }
                    }
                }
            }

            // Calcular etapas do cabo completadas
            let completedCableSteps = 0;
            if (data.lineStepsStatus) {
                for (const usina in data.lineStepsStatus) {
                    for (const linha in data.lineStepsStatus[usina]) {
                        const steps = data.lineStepsStatus[usina][linha];
                        if (steps.passagemCabo) completedCableSteps++;
                        if (steps.crimpagemCabo) completedCableSteps++;
                        if (steps.afericaoCrimpagem) completedCableSteps++;
                        if (steps.tensionamentoCabo) completedCableSteps++;
                    }
                }
            }

            // Total de etapas do cabo (92 linhas x 4 etapas)
            const totalCableSteps = 368;

            // Progresso combinado (bases + etapas)
            const totalItems = totalBases + totalCableSteps;
            const completedItems = completedBases + completedCableSteps;
            const progress = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;

            const versionCard = document.createElement("div");
            versionCard.classList.add("version-item");
            if (index === 0) versionCard.classList.add("version-item--latest");
            versionCard.removeAttribute("style");

            const header = document.createElement("div");
            header.classList.add("version-item-header");

            const title = document.createElement("div");
            title.classList.add("version-item-title");
            title.textContent = index === 0 ? "🌟 Versão Mais Recente" : `📦 Versão ${index + 1}`;

            const dateMeta = document.createElement("div");
            dateMeta.classList.add("version-item-meta");
            dateMeta.textContent = `📅 ${formattedDate}`;

            const statsMeta = document.createElement("div");
            statsMeta.classList.add("version-item-meta");
            statsMeta.textContent = `📊 ${progress}% • ✅ ${completedBases}/${totalBases} bases • 🔧 ${completedCableSteps}/${totalCableSteps} etapas`;

            const info = document.createElement("div");
            info.classList.add("version-item-info");
            info.appendChild(title);
            info.appendChild(dateMeta);
            info.appendChild(statsMeta);

            const restoreBtn = document.createElement("button");
            restoreBtn.className = "btn btn-primary btn-small";
            restoreBtn.innerHTML = `<i class="fas fa-undo"></i> Restaurar`;
            restoreBtn.onclick = (e) => {
                e.stopPropagation();
                restoreVersion(doc.id, data, formattedDate);
            };

            const actions = document.createElement("div");
            actions.classList.add("version-item-actions");
            actions.appendChild(restoreBtn);

            header.appendChild(info);
            header.appendChild(actions);

            versionCard.appendChild(header);
            versionCard.onclick = () => restoreVersion(doc.id, data, formattedDate);

            versionList.appendChild(versionCard);
        });

        document.getElementById("versionHistoryModal").style.display = "flex";
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        const errorMsg = error.message || error.toString();
        showToast(`Erro ao carregar histórico: ${errorMsg}`, "error");
    }
}

// Fechar modal de histórico
function closeVersionHistoryModal() {
    document.getElementById("versionHistoryModal").style.display = "none";
}

// Restaurar versão específica
async function restoreVersion(versionId) {
    if (!requireOnlineEdits()) return;
    await confirmActionPrompt({
        title: "Restaurar versão?",
        subtitle: "Essa ação substituirá todos os dados atuais.",
        message:
            "Deseja restaurar esta versão?\n\n" +
            "ATENÇÃO: Isso irá substituir todos os dados atuais.\n\n" +
            "Esta ação não pode ser desfeita.",
        confirmLabel: "Restaurar",
        cancelLabel: "Cancelar",
        icon: "⏪",
        eyebrow: "Histórico de versões",
        onConfirm: async () => {
            try {
                showToast("Restaurando versão...", "info");

                const versionDoc = await db
                    .collection("projects")
                    .doc(currentProjectId)
                    .collection("history")
                    .doc(versionId)
                    .get();

                if (!versionDoc.exists) {
                    showToast("Versão não encontrada.", "error");
                    return;
                }

                const versionData = versionDoc.data();

                // Restaurar todos os dados
                console.log("🔄 Restaurando dados da versão:", versionId);

                if (versionData.progressData) {
                    const sanitizedProgress = sanitizeProgressData(versionData.progressData);
                    progressData = sanitizedProgress;
                    setProgressDataState(sanitizedProgress); // Sync with state.js
                    console.log("✓ progressData restaurado");
                }
                if (versionData.lineStepsStatus) {
                    lineStepsStatus = versionData.lineStepsStatus;
                    setLineStepsStatusState(versionData.lineStepsStatus); // Sync with state.js
                    console.log("✓ lineStepsStatus restaurado");
                }
                if (versionData.executionDates) {
                    executionDates = sanitizeExecutionDates(versionData.executionDates);
                    console.log("✓ executionDates restaurado");
                }
                if (versionData.lineObservations) {
                    lineObservations = versionData.lineObservations;
                    console.log("✓ lineObservations restaurado");
                }
                if (versionData.builtInformations) {
                    builtInformations = versionData.builtInformations;
                    console.log("✓ builtInformations restaurado");
                }
                if (versionData.teamConfig) {
                    const currentDate = teamConfig.dataAtual;
                    Object.assign(teamConfig, versionData.teamConfig);
                    teamConfig.dataAtual = currentDate;
                    console.log("✓ teamConfig restaurado");
                }
                if (versionData.manualActiveUsina !== undefined) {
                    manualActiveUsina = versionData.manualActiveUsina;
                    console.log("✓ manualActiveUsina restaurado");
                }

                console.log("💾 Salvando no localStorage...");
                // Salvar no localStorage
                saveProgressToStorage();
                saveTeamConfigToStorage();

                // Salvar como versão atual no Firebase
                await saveProjectData();

                // Atualizar interface
                updateAllDisplays();

                // Fechar modal
                closeVersionHistoryModal();

                const timestamp = versionData.savedAt
                    ? new Date(versionData.savedAt.toDate()).toLocaleString("pt-BR")
                    : "N/A";

                showToast(
                    `Versão restaurada com sucesso!\nData da versão: ${timestamp}`,
                    "success"
                );
            } catch (error) {
                console.error("Erro ao restaurar versão:", error);
                showToast("Erro ao restaurar versão.", "error");
            }
        },
    });
}

// Funções de exportação de relatórios
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 20;

    // Função auxiliar para adicionar quebra de página se necessário
    function checkPageBreak(addHeight = 20) {
        if (currentY + addHeight > 280) {
            doc.addPage();
            currentY = 20;
            return true;
        }
        return false;
    }

    // Cabeçalho principal
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO COMPLETO - LINHAS DE VIDA", 20, currentY);
    currentY += 15;

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Usinas Hidrelétricas Belo Monte, Pimental e Oficina", 20, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.text("Thommen Engenharia • Norte Energia", 20, currentY);
    currentY += 8;

    const now = new Date();
    doc.text(
        `Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`,
        20,
        currentY
    );
    currentY += 15;

    // Dados gerais
    const progress = calculateProgress();
    const totalBases = calculateTotalBases();
    const completedBases = calculateCompletedBases();
    const productivity = calculateProductivity();
    const estimatedCompletion = calculateEstimatedCompletion();

    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("1. RESUMO EXECUTIVO", 20, currentY);
    currentY += 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`• Progresso Geral: ${progress.toFixed(1)}%`, 25, currentY);
    currentY += 8;
    doc.text(`• Bases Concluídas: ${completedBases} de ${totalBases} bases`, 25, currentY);
    currentY += 8;
    doc.text(`• Produtividade Atual: ${productivity.toFixed(1)} bases/dia útil`, 25, currentY);
    currentY += 8;
    doc.text(`• Equipe: 4 pessoas • 6h/dia • 80% de aproveitamento`, 25, currentY);
    currentY += 8;

    if (estimatedCompletion) {
        doc.text(
            `• Estimativa de Conclusão: ${estimatedCompletion.toLocaleDateString("pt-BR")}`,
            25,
            currentY
        );
        currentY += 8;
    }

    // Dias trabalhados
    const startDate = new Date("2025-09-01");
    const workDays = calculateWorkDays(startDate, new Date());
    doc.text(`• Dias Trabalhados: ${workDays} dias úteis desde 01/09/2025`, 25, currentY);
    currentY += 15;

    // Detalhamento por usina
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. DETALHAMENTO POR USINA", 20, currentY);
    currentY += 12;

    const pimentalStats = calculateUsinaStats("pimental");
    const beloMonteStats = calculateUsinaStats("belo-monte");
    const oficinaStats = calculateUsinaStats("oficina");

    // Pimental
    doc.setFontSize(14);
    doc.text("2.1 Usina Pimental", 25, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`• Progresso: ${pimentalStats.progress.toFixed(1)}%`, 30, currentY);
    currentY += 8;
    doc.text(
        `• Bases: ${pimentalStats.completedBases}/${pimentalStats.totalBases} concluídas`,
        30,
        currentY
    );
    currentY += 8;
    doc.text(`• Linhas Ativas: 6 linhas`, 30, currentY);
    currentY += 8;
    doc.text(`• Extensão Total: 395,7m`, 30, currentY);
    currentY += 12;

    // Belo Monte
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2.2 Usina Belo Monte", 25, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`• Progresso: ${beloMonteStats.progress.toFixed(1)}%`, 30, currentY);
    currentY += 8;
    doc.text(
        `• Bases: ${beloMonteStats.completedBases}/${beloMonteStats.totalBases} concluídas`,
        30,
        currentY
    );
    currentY += 8;
    doc.text(`• Linhas Ativas: 20 linhas`, 30, currentY);
    currentY += 8;
    doc.text(`• Extensão Total: 1.738,9m`, 30, currentY);
    currentY += 12;

    // Oficina
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2.3 Oficina", 25, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`• Progresso: ${oficinaStats.progress.toFixed(1)}%`, 30, currentY);
    currentY += 8;
    doc.text(
        `• Bases: ${oficinaStats.completedBases}/${oficinaStats.totalBases} concluídas`,
        30,
        currentY
    );
    currentY += 8;
    doc.text(`• Linhas Ativas: 3 linhas`, 30, currentY);
    currentY += 8;
    doc.text(`• Extensão Total: 75,2m`, 30, currentY);
    currentY += 15;

    // Seção de Built - totais por linha
    checkPageBreak(20);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. DISTÂNCIAS ENTRE BASES (BUILT) - TOTAIS", 20, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
        "Totais por linha (soma das distâncias informadas). Valores vazios são ignorados.",
        20,
        currentY
    );
    currentY += 10;

    // Calcular totais de distâncias entre bases (Built)
    function parseBuiltNumber(value) {
        if (value === null || value === undefined || value === "") return NaN;
        return parseFloat(String(value).replace(",", "."));
    }

    function getBuiltTotals() {
        const totals = {};
        for (const usinaKey in builtInformations) {
            totals[usinaKey] = {};
            const linhas = builtInformations[usinaKey];
            for (const linha in linhas) {
                const pairs = linhas[linha];
                const sum = Object.keys(pairs || {}).reduce((acc, key) => {
                    const num = parseBuiltNumber(pairs[key]);
                    return Number.isNaN(num) ? acc : acc + num;
                }, 0);
                totals[usinaKey][linha] = sum;
            }
        }
        return totals;
    }

    const builtTotals = getBuiltTotals();

    function renderBuiltTotalsSection(usinaKey, titulo) {
        doc.setFont("helvetica", "bold");
        doc.text(titulo, 25, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");

        const linhas = Object.keys(builtTotals[usinaKey] || {}).sort(
            (a, b) => parseInt(a, 10) - parseInt(b, 10)
        );

        let colCount = 0;
        linhas.forEach((linha) => {
            const total = builtTotals[usinaKey][linha];
            const display = total > 0 ? `${total.toFixed(2)} m` : "-";
            doc.text(`L ${linha}: ${display}`, 30 + colCount * 60, currentY);
            colCount++;
            if (colCount >= 3) {
                colCount = 0;
                currentY += 8;
                if (checkPageBreak(16)) {
                    doc.setFont("helvetica", "bold");
                    doc.text(titulo, 25, currentY);
                    currentY += 8;
                    doc.setFont("helvetica", "normal");
                }
            }
        });
        if (colCount > 0) {
            currentY += 10;
        } else {
            currentY += 4;
        }
        currentY += 6;
    }

    renderBuiltTotalsSection("pimental", "Pimental");
    renderBuiltTotalsSection("belo-monte", "Belo Monte");
    renderBuiltTotalsSection("oficina", "Oficina");

    // Análise por tipo de base
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("4. ANÁLISE POR TIPO DE BASE", 20, currentY);
    currentY += 12;

    const tiposBases = ["extremidade", "J", "C", "K", "E", "E/F", "D"];
    for (const tipo of tiposBases) {
        const total = calculateTotalBasesOfType(tipo);
        if (total > 0) {
            const completed = calculateCompletedBasesOfType(tipo);
            const percent = (completed / total) * 100;

            doc.setFontSize(11);
            doc.text(
                `• Tipo ${tipo}: ${completed}/${total} bases (${percent.toFixed(1)}%)`,
                25,
                currentY
            );
            currentY += 8;
        }
    }
    currentY += 10;

    // Detalhamento linha por linha - Pimental
    checkPageBreak(80);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("5. DETALHAMENTO LINHA POR LINHA", 20, currentY);
    currentY += 12;

    doc.setFontSize(14);
    doc.text("5.1 Pimental - Detalhamento", 25, currentY);
    currentY += 10;

    for (const linha in projectData.pimental.linhas) {
        checkPageBreak(25);
        const linhaData = projectData.pimental.linhas[linha];
        let totalLinea = 0;
        let completedLinea = 0;

        for (const tipo in linhaData.bases) {
            totalLinea += linhaData.bases[tipo];
            if (
                progressData.pimental &&
                progressData.pimental[linha] &&
                progressData.pimental[linha][tipo]
            ) {
                completedLinea += progressData.pimental[linha][tipo];
            }
        }

        const progressLinea = totalLinea > 0 ? (completedLinea / totalLinea) * 100 : 0;

        doc.setFontSize(11);
        doc.text(
            `Linha ${linha}: ${completedLinea}/${totalLinea} bases (${progressLinea.toFixed(1)}%) - ${linhaData.metragem}m`,
            30,
            currentY
        );
        currentY += 8;

        // Tipos de base da linha
        for (const tipo in linhaData.bases) {
            if (linhaData.bases[tipo] > 0) {
                const completedTipo =
                    progressData.pimental &&
                    progressData.pimental[linha] &&
                    progressData.pimental[linha][tipo]
                        ? progressData.pimental[linha][tipo]
                        : 0;
                doc.text(`  └ ${tipo}: ${completedTipo}/${linhaData.bases[tipo]}`, 35, currentY);
                currentY += 6;
            }
        }
        currentY += 3;
    }

    // Detalhamento linha por linha - Belo Monte
    checkPageBreak(80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("5.2 Belo Monte - Detalhamento", 25, currentY);
    currentY += 10;

    for (const linha in projectData["belo-monte"].linhas) {
        checkPageBreak(25);
        const linhaData = projectData["belo-monte"].linhas[linha];
        let totalLinea = 0;
        let completedLinea = 0;

        for (const tipo in linhaData.bases) {
            totalLinea += linhaData.bases[tipo];
            if (
                progressData["belo-monte"] &&
                progressData["belo-monte"][linha] &&
                progressData["belo-monte"][linha][tipo]
            ) {
                completedLinea += progressData["belo-monte"][linha][tipo];
            }
        }

        const progressLinea = totalLinea > 0 ? (completedLinea / totalLinea) * 100 : 0;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Linha ${linha}: ${completedLinea}/${totalLinea} bases (${progressLinea.toFixed(1)}%) - ${linhaData.metragem}m`,
            30,
            currentY
        );
        currentY += 8;

        // Tipos de base da linha
        for (const tipo in linhaData.bases) {
            if (linhaData.bases[tipo] > 0) {
                const completedTipo =
                    progressData["belo-monte"] &&
                    progressData["belo-monte"][linha] &&
                    progressData["belo-monte"][linha][tipo]
                        ? progressData["belo-monte"][linha][tipo]
                        : 0;
                doc.text(`  └ ${tipo}: ${completedTipo}/${linhaData.bases[tipo]}`, 35, currentY);
                currentY += 6;
            }
        }
        currentY += 3;
    }

    // Oficina
    checkPageBreak(80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4.3 Oficina - Detalhamento", 25, currentY);
    currentY += 10;

    for (const linha in projectData.oficina.linhas) {
        checkPageBreak(25);
        const linhaData = projectData.oficina.linhas[linha];
        let totalLinea = 0;
        let completedLinea = 0;

        for (const tipo in linhaData.bases) {
            totalLinea += linhaData.bases[tipo];
            if (
                progressData.oficina &&
                progressData.oficina[linha] &&
                progressData.oficina[linha][tipo]
            ) {
                completedLinea += progressData.oficina[linha][tipo];
            }
        }

        const progressLinea = totalLinea > 0 ? (completedLinea / totalLinea) * 100 : 0;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Linha ${linha}: ${completedLinea}/${totalLinea} bases (${progressLinea.toFixed(1)}%) - ${linhaData.metragem}m`,
            30,
            currentY
        );
        currentY += 8;

        // Tipos de base da linha
        for (const tipo in linhaData.bases) {
            if (linhaData.bases[tipo] > 0) {
                const completedTipo =
                    progressData.oficina &&
                    progressData.oficina[linha] &&
                    progressData.oficina[linha][tipo]
                        ? progressData.oficina[linha][tipo]
                        : 0;
                doc.text(`  └ ${tipo}: ${completedTipo}/${linhaData.bases[tipo]}`, 35, currentY);
                currentY += 6;
            }
        }
        currentY += 3;
    }

    // Status das etapas de cabos
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("5. STATUS DAS ETAPAS DE CABOS", 20, currentY);
    currentY += 12;

    let totalLines = 0;
    let completedSteps = {
        passagemCabo: 0,
        crimpagemCabo: 0,
        afericaoCrimpagem: 0,
        tensionamentoCabo: 0,
    };

    // Contar etapas concluídas
    for (const usinaKey in lineStepsStatus) {
        for (const linha in lineStepsStatus[usinaKey]) {
            totalLines++;
            for (const step in completedSteps) {
                if (lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha][step]) {
                    completedSteps[step]++;
                }
            }
        }
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
        `• Passagem de Cabo: ${completedSteps.passagemCabo}/${totalLines} linhas (${((completedSteps.passagemCabo / totalLines) * 100).toFixed(1)}%)`,
        25,
        currentY
    );
    currentY += 8;
    doc.text(
        `• Crimpagem de Cabo: ${completedSteps.crimpagemCabo}/${totalLines} linhas (${((completedSteps.crimpagemCabo / totalLines) * 100).toFixed(1)}%)`,
        25,
        currentY
    );
    currentY += 8;
    doc.text(
        `• Aferição de Crimpagem: ${completedSteps.afericaoCrimpagem}/${totalLines} linhas (${((completedSteps.afericaoCrimpagem / totalLines) * 100).toFixed(1)}%)`,
        25,
        currentY
    );
    currentY += 8;
    doc.text(
        `• Tensionamento: ${completedSteps.tensionamentoCabo}/${totalLines} linhas (${((completedSteps.tensionamentoCabo / totalLines) * 100).toFixed(1)}%)`,
        25,
        currentY
    );
    currentY += 15;

    // Observações e próximos passos
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    // Seção 6: Informações para as Built
    checkPageBreak(80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("6. INFORMAÇÕES PARA AS BUILT", 20, currentY);
    currentY += 12;

    // Belo Monte Built
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("6.1 Belo Monte", 25, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const beloMonteBuiltLines = Object.keys(builtInformations["belo-monte"] || {})
        .filter((l) => projectData["belo-monte"].linhas[l])
        .sort((a, b) => parseInt(a) - parseInt(b));

    beloMonteBuiltLines.forEach((linha) => {
        const pairs = builtInformations["belo-monte"][linha] || {};
        const pairEntries = Object.entries(pairs).filter(([, v]) => v);

        if (pairEntries.length > 0) {
            checkPageBreak(15);
            const pairStr = pairEntries.map(([k, v]) => `${k}: ${v}m`).join(" | ");
            doc.text(`Linha ${linha}: ${pairStr}`, 30, currentY);
            currentY += 8;
        }
    });

    currentY += 5;

    // Pimental Built
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("6.2 Pimental", 25, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const pimentalBuiltLines = Object.keys(builtInformations["pimental"] || {})
        .filter((l) => projectData["pimental"].linhas[l])
        .sort((a, b) => parseInt(a) - parseInt(b));

    pimentalBuiltLines.forEach((linha) => {
        const pairs = builtInformations["pimental"][linha] || {};
        const pairEntries = Object.entries(pairs).filter(([, v]) => v);

        if (pairEntries.length > 0) {
            checkPageBreak(15);
            const pairStr = pairEntries.map(([k, v]) => `${k}: ${v}m`).join(" | ");
            doc.text(`Linha ${linha}: ${pairStr}`, 30, currentY);
            currentY += 8;
        }
    });

    currentY += 5;

    // Oficina Built
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("6.3 Oficina", 25, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const oficinaBuiltLines = Object.keys(builtInformations["oficina"] || {})
        .filter((l) => projectData["oficina"].linhas[l])
        .sort((a, b) => parseInt(a) - parseInt(b));

    oficinaBuiltLines.forEach((linha) => {
        const pairs = builtInformations["oficina"][linha] || {};
        const pairEntries = Object.entries(pairs).filter(([, v]) => v);

        if (pairEntries.length > 0) {
            checkPageBreak(15);
            const pairStr = pairEntries.map(([k, v]) => `${k}: ${v}m`).join(" | ");
            doc.text(`Linha ${linha}: ${pairStr}`, 30, currentY);
            currentY += 8;
        }
    });

    currentY += 10;

    doc.text("7. OBSERVAÇÕES E PRÓXIMOS PASSOS", 20, currentY);
    currentY += 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("• Manter ritmo atual de produtividade para cumprir cronograma", 25, currentY);
    currentY += 8;
    doc.text("• Focar em linhas com maior complexidade técnica", 25, currentY);
    currentY += 8;
    doc.text("• Acompanhar condições climáticas que possam afetar o cronograma", 25, currentY);
    currentY += 8;
    doc.text("• Realizar inspeções de qualidade periódicas", 25, currentY);
    currentY += 15;

    // Rodapé
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
        "Este relatório foi gerado automaticamente pelo Sistema de Gestão de Linhas de Vida",
        20,
        currentY
    );

    // Salvar
    const filename = `relatorio-completo-linhas-vida-${now.toISOString().split("T")[0]}.pdf`;
    doc.save(filename);

    showToast("Relatório PDF completo gerado com sucesso!", "success");
}

    function exportToExcel() {
        const workbook = XLSX.utils.book_new();

        // Função auxiliar para formatar tipos de bases
        function formatBasesTypes(bases) {
        const tipos = [];
        for (const [tipo, quantidade] of Object.entries(bases)) {
            if (quantidade > 0) {
                tipos.push(`${quantidade} ${tipo}`);
            }
        }
        return tipos.join(", ");
        }

        function parseBuiltNumber(value) {
            if (value === null || value === undefined || value === "") return NaN;
            return parseFloat(String(value).replace(",", "."));
        }

        // Planilha para cada usina no formato solicitado
        for (const usinaKey in projectData) {
            const usina = projectData[usinaKey];
            const usinaData = [
            [
                "LINHA",
                "COMPRIMENTO",
                "BASES",
                "TOTAL DE BASES",
                "BASES CONCLUÍDAS",
                "PROGRESSO REAL",
                "BASES RESTANTES",
                "DATA DE EXECUÇÃO",
            ],
        ];

        // Ordenar linhas numericamente
        const linhasOrdenadas = Object.keys(usina.linhas).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            return numA - numB;
        });

        for (const linha of linhasOrdenadas) {
            const linhaData = usina.linhas[linha];
            let totalBases = 0;
            let completedBases = 0;

            // Calcular total de bases
            for (const tipo in linhaData.bases) {
                totalBases += linhaData.bases[tipo];
            }

            // Calcular bases concluídas
            if (progressData[usinaKey] && progressData[usinaKey][linha]) {
                for (const tipo in progressData[usinaKey][linha]) {
                    completedBases += progressData[usinaKey][linha][tipo] || 0;
                }
            }

            const progress = totalBases > 0 ? (completedBases / totalBases) * 100 : 0;
            const basesRestantes = totalBases - completedBases;

            // Obter data de execução
            let executionDate = "";
            const storedDate = getExecutionDateForLine(usinaKey, linha, executionDates);
            if (storedDate) {
                executionDate = formatExecutionDateForDisplay(storedDate) || storedDate;
            } else if (completedBases > 0) {
                executionDate = "Não informado";
            }

            usinaData.push([
                parseInt(linha), // Linha como número
                linhaData.metragem, // Comprimento
                formatBasesTypes(linhaData.bases), // Bases (formatadas)
                totalBases, // Total de bases
                completedBases, // Bases concluídas
                `${progress.toFixed(0)}%`, // Progresso real
                basesRestantes, // Bases restantes
                executionDate, // Data de execução
            ]);
        }

        const usinaSheet = XLSX.utils.aoa_to_sheet(usinaData);

        // Configurar larguras das colunas
        usinaSheet["!cols"] = [
            { wch: 8 }, // LINHA
            { wch: 12 }, // COMPRIMENTO
            { wch: 20 }, // BASES
            { wch: 15 }, // TOTAL DE BASES
            { wch: 18 }, // BASES CONCLUÍDAS
            { wch: 18 }, // PROGRESSO REAL
            { wch: 16 }, // BASES RESTANTES
            { wch: 18 }, // DATA DE EXECUÇÃO
        ];

        // Adicionar formatação condicional para progresso 100%
        for (let i = 2; i <= usinaData.length; i++) {
            const cellRef = `F${i}`; // Coluna de progresso
            const progressValue = usinaData[i - 1][5];

            if (progressValue === "100%") {
                if (!usinaSheet[cellRef]) usinaSheet[cellRef] = {};
                usinaSheet[cellRef].s = {
                    fill: { fgColor: { rgb: "90EE90" } }, // Verde claro
                    font: { bold: true },
                };
            }
        }

        XLSX.utils.book_append_sheet(workbook, usinaSheet, usina.name);
    }

        // Planilha de Built (distâncias entre bases)
        const builtSheetData = [["USINA", "LINHA", "PAR", "DISTÂNCIA (m)", "TOTAL DA LINHA"]];

        for (const usinaKey of Object.keys(builtInformations)) {
            const linhas = Object.keys(builtInformations[usinaKey] || {}).sort(
                (a, b) => parseInt(a, 10) - parseInt(b, 10)
            );

            linhas.forEach((linha) => {
                const pairs = builtInformations[usinaKey][linha] || {};
                const pairKeys = Object.keys(pairs).sort((a, b) => {
                    const aNum = parseInt(a.split("-")[0], 10);
                    const bNum = parseInt(b.split("-")[0], 10);
                    return aNum - bNum;
                });

                const totalLinha = pairKeys.reduce((acc, key) => {
                    const num = parseBuiltNumber(pairs[key]);
                    return Number.isNaN(num) ? acc : acc + num;
                }, 0);

                pairKeys.forEach((pairKey) => {
                    builtSheetData.push([
                        projectData[usinaKey].name,
                        linha,
                        pairKey,
                        pairs[pairKey] || "-",
                        "",
                    ]);
                });

                builtSheetData.push([
                    projectData[usinaKey].name,
                    linha,
                    "TOTAL",
                    "",
                    totalLinha > 0 ? totalLinha.toFixed(2) : "-",
                ]);
                builtSheetData.push([]);
            });
        }

        const builtSheet = XLSX.utils.aoa_to_sheet(builtSheetData);
        builtSheet["!cols"] = [
            { wch: 18 },
            { wch: 8 },
            { wch: 10 },
            { wch: 14 },
            { wch: 16 },
        ];
        XLSX.utils.book_append_sheet(workbook, builtSheet, "Built");

        // Planilha de Etapas do Cabo
        const stepsSheetData = [
            [
                "USINA",
                "LINHA",
                "PASSAGEM",
                "CRIMPAGEM",
                "AFERIÇÃO",
                "TENSIONAMENTO",
                "TOTAL CONCLUÍDAS",
                "PROGRESSO (%)",
            ],
        ];

        for (const usinaKey of Object.keys(projectData)) {
            const linhasOrdenadas = Object.keys(projectData[usinaKey].linhas).sort(
                (a, b) => parseInt(a, 10) - parseInt(b, 10)
            );

            linhasOrdenadas.forEach((linha) => {
                const steps = lineStepsStatus?.[usinaKey]?.[linha] || {};
                const completedCount =
                    (steps.passagemCabo ? 1 : 0) +
                    (steps.crimpagemCabo ? 1 : 0) +
                    (steps.afericaoCrimpagem ? 1 : 0) +
                    (steps.tensionamentoCabo ? 1 : 0);
                const progressStep = ((completedCount / 4) * 100).toFixed(0) + "%";

                stepsSheetData.push([
                    projectData[usinaKey].name,
                    linha,
                    steps.passagemCabo ? "OK" : "Pendente",
                    steps.crimpagemCabo ? "OK" : "Pendente",
                    steps.afericaoCrimpagem ? "OK" : "Pendente",
                    steps.tensionamentoCabo ? "OK" : "Pendente",
                    completedCount,
                    progressStep,
                ]);
            });
            stepsSheetData.push([]);
        }

        const stepsSheet = XLSX.utils.aoa_to_sheet(stepsSheetData);
        stepsSheet["!cols"] = [
            { wch: 18 },
            { wch: 8 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 16 },
            { wch: 18 },
            { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(workbook, stepsSheet, "Etapas do Cabo");

    // Adicionar planilha de resumo
    const resumoData = [
        ["RELATÓRIO - LINHAS DE VIDA"],
        ["Thommen Engenharia • Norte Energia"],
        [
            `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
        ],
        [`Usina ativa: ${manualActiveUsina || "Não definida"}`],
        [],
        ["RESUMO EXECUTIVO"],
        [`Progresso Geral: ${calculateProgress().toFixed(1)}%`],
        [`Bases Concluídas: ${calculateCompletedBases()} de ${calculateTotalBases()}`],
        [`Produtividade: ${calculateProductivity().toFixed(1)} bases/dia útil`],
        [],
        ["DETALHAMENTO POR USINA"],
    ];

    for (const usinaKey in projectData) {
        const stats = calculateUsinaStats(usinaKey);
        resumoData.push([
            `${projectData[usinaKey].name}: ${stats.progress.toFixed(1)}% (${stats.completedBases}/${stats.totalBases} bases)`,
        ]);
    }

    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
    resumoSheet["!cols"] = [{ wch: 50 }];

    // Inserir resumo no início
    XLSX.utils.book_append_sheet(workbook, resumoSheet, "Resumo", 0);

    // Salvar arquivo com timestamp
    const now = new Date();
    const filename = `cronograma-linhas-vida-${now.toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);

    showToast("Relatório Excel gerado com sucesso!", "success");
}

const exportedFunctions = {
    switchMapTab,
    setActiveUsina,
    forceSaveActiveUsina,
    openUpdateModal,
    openLineModal,
    closeModal,
    loadLinhas,
    loadBases,
    updateSelectAllState,
    updateSelectAllRemoveState,
    showLineDetails: showLineDetailsHandler,
    openObservationModal,
    closeObservationModal,
    updateCharacterCount,
    saveObservation,
    showTransversalDetails,
    closeTransversalModal,
    enableTransversalEdit,
    cancelTransversalEdit,
    saveTransversalEdit,
    enableTableEdit,
    cancelTableEdit,
    saveTableEdit,
    closeLineDetailsModal,
    enableLineDetailsEdit,
    cancelLineDetailsEdit,
    saveLineDetailsEdit,
    enableBuiltEdit,
    cancelBuiltEdit,
    saveBuiltEdit,
    toggleAllBases,
    toggleAllRemoveBases,
    toggleStep,
    clearAllProgress,
    checkPassword,
    showPasswordModal,
    closePasswordModal,
    closeVersionHistoryModal,
    exportProgressData,
    importProgressData,
    confirmImportData,
    cancelImportConfirm,
    cancelConfirmAction,
    confirmActionProceed,
    forceRestoreFromFirebase,
    restoreVersion,
    exportToPDF,
    exportToExcel,
};

// Encapsular handlers públicos em um único namespace
window.App = Object.freeze({ ...exportedFunctions });

// Inicializar aplicação quando a página carregar
window.addEventListener("load", function () {
    updateAllDisplays();
});
