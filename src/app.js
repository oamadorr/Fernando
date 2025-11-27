// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCBk1dt3vKyHO3-RIm6TBqC2GpCxiZTvfQ",
    authDomain: "fernando-bce22.firebaseapp.com",
    databaseURL: "https://fernando-bce22-default-rtdb.firebaseio.com",
    projectId: "fernando-bce22",
    storageBucket: "fernando-bce22.firebasestorage.app",
    messagingSenderId: "909134111459",
    appId: "1:909134111459:web:dc75f291b972f664999bd6",
};

// Firebase variables
let db;
let currentProjectId = null;
let allowOnlineEdits = false; // controle central de edição (desliga quando offline)

// Sistema de senha
// Hash SHA-256 da senha - será calculado na primeira execução
let PROJECT_PASSWORD_HASH = null;
let isAuthenticated = false;
let pendingAction = null;

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
}

function requireOnlineEdits() {
    const canEdit = allowOnlineEdits && navigator.onLine && db && currentProjectId;
    if (!canEdit) {
        showToast("Modo somente leitura: conecte-se ao Firebase para editar.", "error");
        return false;
    }
    return true;
}

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

function sanitizeProgressData(raw) {
    const sanitized = {};
    for (const usinaKey of Object.keys(projectData)) {
        sanitized[usinaKey] = {};
        const linhas = projectData[usinaKey].linhas;
        for (const linhaKey of Object.keys(linhas)) {
            sanitized[usinaKey][linhaKey] = {};
            const allowedBases = linhas[linhaKey].bases;
            const rawLine = raw?.[usinaKey]?.[linhaKey] || {};
            for (const tipo of Object.keys(allowedBases)) {
                const limite = allowedBases[tipo];
                const valor = rawLine?.[tipo] ?? 0;
                sanitized[usinaKey][linhaKey][tipo] = Math.max(0, Math.min(limite, valor));
            }
        }
    }
    return sanitized;
}

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

// Backup para cancelamento de edição
let builtEditBackup = null;

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

function normalizeExecutionDateValue(rawValue) {
    if (!rawValue) return "";

    if (rawValue instanceof Date) {
        return !isNaN(rawValue) ? rawValue.toISOString().split("T")[0] : "";
    }

    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (!trimmed) return "";

        // Se já estiver no formato ISO simples, usar diretamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split("T")[0];
        }

        return "";
    }

    return "";
}

function getExecutionDateForLine(usinaKey, linhaKey) {
    if (!executionDates[usinaKey]) return "";
    const rawValue = executionDates[usinaKey][linhaKey];
    return normalizeExecutionDateValue(rawValue);
}

function sanitizeExecutionDates(raw) {
    const sanitized = {};
    if (!raw || typeof raw !== "object") {
        return sanitized;
    }

    for (const usinaKey of Object.keys(raw)) {
        const linhas = raw[usinaKey];
        if (!linhas || typeof linhas !== "object") continue;

        for (const linhaKey of Object.keys(linhas)) {
            const normalized = normalizeExecutionDateValue(linhas[linhaKey]);
            if (normalized) {
                if (!sanitized[usinaKey]) {
                    sanitized[usinaKey] = {};
                }
                sanitized[usinaKey][linhaKey] = normalized;
            }
        }
    }

    return sanitized;
}

function formatExecutionDateForDisplay(value) {
    const normalized = normalizeExecutionDateValue(value);
    if (!normalized) return "";

    const parts = normalized.split("-");
    if (parts.length !== 3) return "";

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

// Controle manual da usina ativa
let manualActiveUsina = null; // null = automático, 'pimental' ou 'belo-monte' = manual

// Charts globais
let chartConclusaoGeral;

// Inicializar hash da senha
async function initializePasswordHash() {
    PROJECT_PASSWORD_HASH = await calculateSHA256("thommen2025");
}

// Função centralizada para garantir datas válidas no teamConfig
function validateAndFixTeamConfigDates() {
    // Sempre garantir data de início fixa
    if (
        !teamConfig.inicioTrabalhoBruto ||
        !(teamConfig.inicioTrabalhoBruto instanceof Date) ||
        isNaN(teamConfig.inicioTrabalhoBruto.getTime())
    ) {
        teamConfig.inicioTrabalhoBruto = new Date("2025-09-11");
    }

    // Data atual sempre deve ser Date válida
    if (
        !teamConfig.dataAtual ||
        !(teamConfig.dataAtual instanceof Date) ||
        isNaN(teamConfig.dataAtual.getTime())
    ) {
        teamConfig.dataAtual = new Date();
    }

    // Garantir outras propriedades padrão
    if (typeof teamConfig.pessoas !== "number" || teamConfig.pessoas <= 0) {
        teamConfig.pessoas = 4;
    }
    if (typeof teamConfig.horasPorDia !== "number" || teamConfig.horasPorDia <= 0) {
        teamConfig.horasPorDia = 6;
    }
    if (
        typeof teamConfig.aproveitamento !== "number" ||
        teamConfig.aproveitamento <= 0 ||
        teamConfig.aproveitamento > 1
    ) {
        teamConfig.aproveitamento = 0.8;
    }

    console.log("TeamConfig validado:", teamConfig);
}

// Inicialização
document.addEventListener("DOMContentLoaded", async function () {
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

// Sistema de Toast Notifications
function showToast(message, type = "info", duration = 4000) {
    const container = document.getElementById("toastContainer");
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
                <button class="toast-close" onclick="removeToast(this.parentElement)">
                    <i class="fas fa-times"></i>
                </button>
            `;

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

function removeToast(toast) {
    if (toast && toast.parentElement) {
        toast.classList.remove("show");
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }
}

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
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        updateStatusIndicator("online");
        console.log("Firebase inicializado com sucesso");
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
    loadProjectData();
}

async function loadProjectData() {
    showLoading("Carregando dados do projeto...");
    updateStatusIndicator("saving");

    // Sempre tentar Firebase primeiro, detectando e resolvendo conflitos
    if (db && currentProjectId) {
        // Em modo somente leitura, pular detecção de conflitos e carregar direto do Firebase
        const isReadOnlyMode =
            !isAuthenticated &&
            (!localStorage.getItem("linhasVidaProgress") ||
                !localStorage.getItem("linhasVidaLineSteps") ||
                !localStorage.getItem("linhasVidaTeamConfig"));

        let conflictResolved = false;
        if (!isReadOnlyMode) {
            // Detectar e resolver conflitos apenas se não estiver em modo somente leitura
            conflictResolved = await detectAndResolveDataConflicts();
        }

        if (conflictResolved) {
            // Dados já foram sincronizados, apenas atualizar displays
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
                const data = doc.data();

                // Em modo somente leitura, aplicar dados do Firebase diretamente
                if (isReadOnlyMode) {
                    progressData = data.progressData
                        ? sanitizeProgressData(data.progressData)
                        : sanitizeProgressData(progressData);
                    if (data.lineStepsStatus) {
                        lineStepsStatus = data.lineStepsStatus;
                    }
                    if (data.executionDates) {
                        executionDates = sanitizeExecutionDates(data.executionDates);
                    }
                    if (data.teamConfig) {
                        // Aplicar dados do Firebase
                        teamConfig = {
                            ...teamConfig,
                            ...data.teamConfig,
                        };

                        // Converter strings de data para objetos Date
                        if (data.teamConfig.inicioTrabalhoBruto) {
                            try {
                                teamConfig.inicioTrabalhoBruto = new Date(
                                    data.teamConfig.inicioTrabalhoBruto
                                );
                            } catch {
                                teamConfig.inicioTrabalhoBruto = new Date("2025-09-11");
                            }
                        }

                        if (data.teamConfig.dataAtual) {
                            try {
                                teamConfig.dataAtual = new Date(data.teamConfig.dataAtual);
                            } catch {
                                teamConfig.dataAtual = new Date();
                            }
                        }

                        // Garantir que as datas sejam válidas
                        validateAndFixTeamConfigDates();
                    }

                    // Carregar usina ativa do Firebase
                    if (data.manualActiveUsina) {
                        manualActiveUsina = data.manualActiveUsina;
                    }

                    // Carregar informações de Built do Firebase
                    await loadBuiltFromFirebase(doc);

                    // Atualizar displays com dados do Firebase
                    console.log("Modo somente leitura: dados carregados do Firebase", {
                        progressData: progressData,
                        lineStepsStatus: lineStepsStatus,
                        teamConfig: teamConfig,
                    });
                    saveProgressToStorage();
                    updateAllDisplays();
                    initializeCharts();
                    updateStatusIndicator("online");
                    setupRealtimeListener();
                    hideLoading();
                    return;
                }

                // Compatibilidade com sistema v1.0 (produção atual)
                if (data.version === "1.0" && data.data) {
                    // Converter dados v1.0 para v2.0
                    console.log("Convertendo dados v1.0 para v2.0...");
                    const oldData = data.data;

                    // Estimar progressData baseado no progresso simples
                    if (oldData.pimental && oldData["belo-monte"]) {
                        // Manter dados existentes ou criar base simples
                        if (!progressData.pimental) {
                            progressData.pimental = {
                                A: 0,
                                B: 0,
                                C: 0,
                                D: 0,
                                E: 0,
                                F: 0,
                                G: 0,
                                H: 0,
                                J: 0,
                                K: 0,
                            };
                        }
                        if (!progressData["belo-monte"]) {
                            progressData["belo-monte"] = {};
                            // Initialize all lines for Belo Monte
                            for (const linha in projectData["belo-monte"].linhas) {
                                progressData["belo-monte"][linha] = {};
                                for (const tipo in projectData["belo-monte"].linhas[linha].bases) {
                                    progressData["belo-monte"][linha][tipo] = 0;
                                }
                            }
                        }
                    }

                    // Salvar dados convertidos
                    await saveProjectData();
                }
                // Adaptar dados detalhados v2.0
                else if (data.progressData) {
                    progressData = sanitizeProgressData(data.progressData);

                    // Carregar status das etapas do cabo se disponível
                    if (data.lineStepsStatus) {
                        lineStepsStatus = data.lineStepsStatus;
                    }

                    // Carregar datas de execução se disponível
                    if (data.executionDates) {
                        executionDates = sanitizeExecutionDates(data.executionDates);
                    }

                    // Carregar configuração da equipe se disponível
                    if (data.teamConfig) {
                        // Aplicar dados e converter datas
                        teamConfig = {
                            ...teamConfig,
                            ...data.teamConfig,
                        };

                        // Converter strings para datas com tratamento de erro
                        if (data.teamConfig.inicioTrabalhoBruto) {
                            try {
                                teamConfig.inicioTrabalhoBruto = new Date(
                                    data.teamConfig.inicioTrabalhoBruto
                                );
                            } catch {
                                teamConfig.inicioTrabalhoBruto = new Date("2025-09-11");
                            }
                        }

                        if (data.teamConfig.dataAtual) {
                            try {
                                teamConfig.dataAtual = new Date(data.teamConfig.dataAtual);
                            } catch {
                                teamConfig.dataAtual = new Date();
                            }
                        }

                        // Garantir que as datas sejam válidas
                        validateAndFixTeamConfigDates();
                    }

                    // IMPORTANTE: Carregar usina ativa do Firebase também quando não está em modo somente leitura
                    if (data.manualActiveUsina) {
                        manualActiveUsina = data.manualActiveUsina;
                        localStorage.setItem("manualActiveUsina", manualActiveUsina);
                    }

                    // Carregar informações de Built do Firebase
                    await loadBuiltFromFirebase(doc);
                }
            } else {
                // Projeto novo, criar dados iniciais
                await saveProjectData();
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

// Função para limpar cache local órfão
function clearLocalData() {
    localStorage.removeItem("linhasVidaProgress");
    localStorage.removeItem("linhasVidaObservations");
    localStorage.removeItem("linhasVidaTeamConfig");
    localStorage.removeItem("linhasVidaLineSteps");
    localStorage.removeItem("linhasVidaExecutionDates");
    localStorage.removeItem("linhasVidaLastUpdate");
    console.log("Cache local limpo");
}

// Função para detectar e resolver conflitos entre Firebase e localStorage
async function detectAndResolveDataConflicts() {
    if (!db || !currentProjectId) return false;

    updateStatusIndicator("syncing");

    try {
        // Verificar se há dados no localStorage
        const localProgress = localStorage.getItem("linhasVidaProgress");
        const localSteps = localStorage.getItem("linhasVidaLineSteps");
        const localTeamConfig = localStorage.getItem("linhasVidaTeamConfig");
        const localExecutionRaw = localStorage.getItem("linhasVidaExecutionDates");

        if (!localProgress && !localSteps && !localTeamConfig) {
            return false; // Sem dados locais
        }

        // Buscar dados do Firebase
        const doc = await db.collection("projects").doc(currentProjectId).get();

        if (!doc.exists) {
            // Firebase vazio mas localStorage tem dados - sincronizar para Firebase
            console.log("Sincronizando dados locais para Firebase...");
            await saveProjectData();
            showToast("Dados locais sincronizados com a nuvem", "success");
            return true;
        }

        const firebaseData = doc.data();
        const firebaseUpdated = firebaseData.updatedAt
            ? firebaseData.updatedAt.toDate()
            : new Date(0);

        let localProgressSanitized = sanitizeProgressData(progressData);
        let localExecutionSanitized = sanitizeExecutionDates(executionDates);
        if (localProgress) {
            try {
                const parsedLocalProgress = JSON.parse(localProgress);
                localProgressSanitized = sanitizeProgressData(
                    migrateProgressDataIfNeeded(parsedLocalProgress)
                );
            } catch (parseError) {
                console.warn("Erro ao analisar progresso local, limpando cache...", parseError);
                clearLocalData();
                localProgressSanitized = sanitizeProgressData({});
            }
        }

        if (localExecutionRaw) {
            try {
                const parsedExecution = JSON.parse(localExecutionRaw);
                localExecutionSanitized = sanitizeExecutionDates(parsedExecution);
            } catch (parseError) {
                console.warn("Erro ao analisar datas locais, limpando cache...", parseError);
                clearLocalData();
                localExecutionSanitized = {};
            }
        }

        const firebaseProgressSanitized = firebaseData.progressData
            ? sanitizeProgressData(firebaseData.progressData)
            : sanitizeProgressData({});
        const firebaseExecutionSanitized = firebaseData.executionDates
            ? sanitizeExecutionDates(firebaseData.executionDates)
            : {};
        const hasSanitizedDiff =
            JSON.stringify(localProgressSanitized) !== JSON.stringify(firebaseProgressSanitized) ||
            JSON.stringify(localExecutionSanitized) !== JSON.stringify(firebaseExecutionSanitized);

        // Verificar timestamps dos dados locais (se disponível)
        const localTimestamp = localStorage.getItem("linhasVidaLastUpdate");
        const localUpdated = localTimestamp ? new Date(localTimestamp) : new Date(0);

        const timeDiff = Math.abs(firebaseUpdated - localUpdated);
        const significantDiff = timeDiff > 5 * 60 * 1000; // 5 minutos

        if (firebaseUpdated > localUpdated) {
            // Firebase é mais recente
            if (significantDiff || (!isAuthenticated && hasSanitizedDiff)) {
                console.log(
                    "Dados do Firebase são mais recentes que o cache local, limpando cache..."
                );
                clearLocalData();
                if (significantDiff) {
                    showToast("Carregando dados mais recentes da nuvem", "info");
                } else {
                    showToast("Dados locais desatualizados foram descartados.", "info");
                }
            }
            return false; // Deixa o loadProjectData carregar do Firebase
        } else if (localUpdated > firebaseUpdated) {
            // localStorage é mais recente
            if (!isAuthenticated && hasSanitizedDiff) {
                console.log(
                    "Cache local difere do Firebase mas usuário não autenticado; preferindo dados da nuvem."
                );
                clearLocalData();
                showToast("Dados locais desatualizados foram descartados.", "info");
                return false;
            }

            console.log("Dados locais são mais recentes, sincronizando para Firebase...");
            await saveProjectData();
            showToast("Dados locais sincronizados com a nuvem", "success");
            return true;
        }

        if (!isAuthenticated && hasSanitizedDiff) {
            console.log(
                "Dados com timestamps iguais mas diferenças detectadas; limpando cache local."
            );
            clearLocalData();
            showToast("Dados locais desatualizados foram descartados.", "info");
        }

        return false; // Dados estão sincronizados
    } catch (error) {
        console.error("Erro ao detectar conflitos:", error);
        return false;
    }
}

let unsubscribeListener = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

function setupRealtimeListener() {
    if (!db || !currentProjectId || unsubscribeListener) {
        return;
    }

    unsubscribeListener = db
        .collection("projects")
        .doc(currentProjectId)
        .onSnapshot(
            {
                includeMetadataChanges: false,
            },
            (doc) => {
                // Verificar se a página ainda está ativa e o listener não foi cancelado
                if (
                    document.visibilityState === "hidden" ||
                    document.hidden ||
                    !unsubscribeListener
                ) {
                    return;
                }

                try {
                    if (doc.exists && !doc.metadata.fromCache) {
                        const data = doc.data();
                        const newProgressData = data.progressData
                            ? sanitizeProgressData(data.progressData)
                            : null;
                        const newLineStepsStatus = data.lineStepsStatus || {};
                        const newExecutionDates = sanitizeExecutionDates(data.executionDates || {});
                        const newLineObservations = data.lineObservations || {};
                        const newBuiltInformations = data.builtInformations || {};

                        // Verificar se houve mudanças nos dados
                        let hasChanges = false;
                        if (
                            newProgressData &&
                            JSON.stringify(newProgressData) !== JSON.stringify(progressData)
                        ) {
                            progressData = newProgressData;
                            hasChanges = true;
                        }
                        if (
                            JSON.stringify(newLineStepsStatus) !== JSON.stringify(lineStepsStatus)
                        ) {
                            lineStepsStatus = newLineStepsStatus;
                            hasChanges = true;
                        }
                        if (JSON.stringify(newExecutionDates) !== JSON.stringify(executionDates)) {
                            executionDates = newExecutionDates;
                            hasChanges = true;
                        }
                        if (
                            JSON.stringify(newLineObservations) !== JSON.stringify(lineObservations)
                        ) {
                            lineObservations = newLineObservations;
                            hasChanges = true;
                        }
                        if (
                            JSON.stringify(newBuiltInformations) !==
                            JSON.stringify(builtInformations)
                        ) {
                            builtInformations = newBuiltInformations;
                            hasChanges = true;
                        }

                        // IMPORTANTE: Verificar mudanças na usina ativa
                        if (
                            data.manualActiveUsina !== undefined &&
                            data.manualActiveUsina !== manualActiveUsina
                        ) {
                            manualActiveUsina = data.manualActiveUsina;
                            localStorage.setItem("manualActiveUsina", manualActiveUsina);
                            hasChanges = true;
                            console.log("Usina ativa atualizada em tempo real:", manualActiveUsina);
                        }

                        if (hasChanges) {
                            updateAllDisplays();
                            updateCharts();
                            updateStatusIndicator("online");
                            reconnectAttempts = 0; // Reset contador em caso de sucesso
                        }
                    }
                } catch (error) {
                    console.error("Erro ao processar dados do Firebase:", error);
                }
            },
            (error) => {
                // Filtrar erros conhecidos que não são críticos
                if (
                    error.code === "cancelled" ||
                    error.message?.includes("channel closed") ||
                    error.message?.includes("asynchronous response") ||
                    error.message?.includes("message channel closed") ||
                    error.name === "FirebaseError"
                ) {
                    // Erros silenciosos - não mostrar no console nem afetar UI
                    return;
                }

                console.error("Erro no listener Firebase:", error);
                updateStatusIndicator("offline");

                // Tentar reconectar automaticamente em caso de erro de rede
                if (error.code === "unavailable" && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(() => {
                        console.log(
                            `Tentativa de reconexão ${reconnectAttempts}/${maxReconnectAttempts}`
                        );
                        disconnectRealtimeListener();
                        setupRealtimeListener();
                    }, 2000 * reconnectAttempts); // Delay progressivo
                }
            }
        );
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
        return;
    }

    updateStatusIndicator("saving");

    try {
        executionDates = sanitizeExecutionDates(executionDates);
        progressData = sanitizeProgressData(progressData);
        const simplifiedData = {
            pimental: { progress: calculateProgressOfUsina("pimental") },
            "belo-monte": { progress: calculateProgressOfUsina("belo-monte") },
        };

        // Salvar versão atual
        await db.collection("projects").doc(currentProjectId).set({
            // Dados detalhados (v2.0)
            progressData: progressData,
            lineStepsStatus: lineStepsStatus,
            executionDates: executionDates,
            teamConfig: teamConfig,
            manualActiveUsina: manualActiveUsina,
            projectData: simplifiedData,
            lineObservations: lineObservations,
            builtInformations: builtInformations,

            // Compatibilidade com v1.0
            data: simplifiedData,

            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            version: "2.0",
        });

        // Salvar snapshot no histórico (máximo 20 versões)
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
        });

        // Limpar versões antigas (manter apenas as 20 mais recentes)
        const oldSnapshots = await historyRef.orderBy("savedAt", "desc").limit(100).get();
        if (oldSnapshots.size > 20) {
            const batch = db.batch();
            oldSnapshots.docs.slice(20).forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

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

// Função para calcular progresso percentual de uma linha específica
function calculateLineProgress(usinaKey, linha) {
    if (!projectData[usinaKey] || !projectData[usinaKey].linhas[linha]) {
        return 0;
    }

    const linhaData = projectData[usinaKey].linhas[linha];
    let totalBases = 0;
    let completedBases = 0;

    // Calcular total de bases da linha
    for (const tipo in linhaData.bases) {
        totalBases += linhaData.bases[tipo];
    }

    // Calcular bases concluídas da linha
    if (progressData[usinaKey] && progressData[usinaKey][linha]) {
        for (const tipo in progressData[usinaKey][linha]) {
            completedBases += progressData[usinaKey][linha][tipo] || 0;
        }
    }

    // Incluir etapas do cabo no cálculo
    const completedCableSteps = calculateCableStepsCompletedOfLine(usinaKey, linha);
    const totalCableSteps = 4; // 4 etapas por linha

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;

    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return Math.min(progress, 100); // Limitar a 100% máximo
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
        const storedExecutionDate = getExecutionDateForLine(usinaKey, linha);
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
                                        onclick="toggleStep('${usinaKey}', '${linha}', 'passagemCabo')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].passagemCabo ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Crimpagem:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].crimpagemCabo ? "step-done" : "step-pending"}" 
                                        onclick="toggleStep('${usinaKey}', '${linha}', 'crimpagemCabo')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].crimpagemCabo ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Aferição:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].afericaoCrimpagem ? "step-done" : "step-pending"}" 
                                        onclick="toggleStep('${usinaKey}', '${linha}', 'afericaoCrimpagem')">
                                    ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].afericaoCrimpagem ? "Realizado" : "Pendente"}
                                </button>
                            </div>
                            <div class="step-item">
                                <span class="step-label">Tensionamento:</span>
                                <button class="step-toggle ${lineStepsStatus[usinaKey] && lineStepsStatus[usinaKey][linha] && lineStepsStatus[usinaKey][linha].tensionamentoCabo ? "step-done" : "step-pending"}"
                                        onclick="toggleStep('${usinaKey}', '${linha}', 'tensionamentoCabo')">
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
                        <button class="btn btn-primary btn-small" onclick="openLineModal('${usinaKey}', '${linha}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="openObservationModal('${usinaKey}', '${linha}')" style="margin-left: 5px;">
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

let currentMapTab = "pimental"; // Tab ativa atual

// Alternar entre abas das usinas
function switchMapTab(usinaKey, evt) {
    currentMapTab = usinaKey;

    // Atualizar classes das abas
    document.querySelectorAll(".map-tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });
    if (evt && evt.target) {
        evt.target.classList.add("active");
    }

    // Mostrar container correto
    document.querySelectorAll(".map-container").forEach((container) => {
        container.classList.remove("active");
    });
    const mapId =
        usinaKey === "pimental"
            ? "mapPimental"
            : usinaKey === "belo-monte"
              ? "mapBeloMonte"
              : "mapOficina";
    document.getElementById(mapId).classList.add("active");

    // Atualizar estatísticas da aba atual
    updateMapStats(usinaKey);
}

// Atualizar estatísticas do mapa
function updateMapStats(usinaKey = null) {
    const targetUsina = usinaKey || currentMapTab;

    if (!projectData[targetUsina]) return;

    let totalLines = 0;
    let completedLines = 0;
    let inProgressLines = 0;
    let totalProgress = 0;

    // Calcular estatísticas por linha
    for (const linha in projectData[targetUsina].linhas) {
        totalLines++;
        const progress = calculateLineProgress(targetUsina, linha);
        totalProgress += progress;

        if (progress === 100) {
            completedLines++;
        } else if (progress > 0) {
            inProgressLines++;
        }
    }

    const avgProgress = totalLines > 0 ? Math.round(totalProgress / totalLines) : 0;

    // Atualizar elementos da interface
    document.getElementById("mapTotalLines").textContent = totalLines;
    document.getElementById("mapCompletedLines").textContent = completedLines;
    document.getElementById("mapProgressPercent").textContent = `${avgProgress}%`;
    document.getElementById("mapInProgressLines").textContent = inProgressLines;
}

// Atualizar cores e status das linhas no mapa
function updateMapLines(usinaKey = null) {
    const targetUsina = usinaKey || currentMapTab;

    if (!projectData[targetUsina]) return;

    // Atualizar linhas da usina específica
    const mapContainer =
        targetUsina === "pimental"
            ? document.getElementById("mapPimental")
            : targetUsina === "belo-monte"
              ? document.getElementById("mapBeloMonte")
              : document.getElementById("mapOficina");

    const lines = mapContainer.querySelectorAll(".map-line");

    lines.forEach((line) => {
        const linha = line.dataset.linha;
        const progress = calculateLineProgress(targetUsina, linha);

        // Remover classes de status antigas
        const lineBar = line.querySelector(".line-bar");
        const lineLabel = line.querySelector(".line-label");

        lineBar.classList.remove("completed", "in-progress", "pending");
        lineLabel.classList.remove("completed", "in-progress", "pending");

        // Aplicar nova classe baseada no progresso
        let statusClass = "";
        if (progress === 100) {
            statusClass = "completed";
        } else if (progress > 0) {
            statusClass = "in-progress";
        } else {
            statusClass = "pending";
        }

        lineBar.classList.add(statusClass);
        lineLabel.classList.add(statusClass);
    });
}

// Mostrar tooltip do mapa
function showMapTooltip(event, usinaKey, linha) {
    const tooltip = document.getElementById("mapTooltip");
    const progress = calculateLineProgress(usinaKey, linha);

    let status = "";
    if (progress === 100) {
        status = "Concluído";
    } else if (progress > 0) {
        status = "Em Andamento";
    } else {
        status = "Pendente";
    }

    const usinaName = projectData[usinaKey].name;

    // Obter informações das bases para esta linha
    const linhaData = projectData[usinaKey]?.linhas[linha];
    if (!linhaData) return;

    const basesCompleted = [];
    const basesPending = [];

    // Verificar cada tipo de base nesta linha
    for (const tipo in linhaData.bases) {
        const total = linhaData.bases[tipo];
        const completed = progressData[usinaKey]?.[linha]?.[tipo] || 0;

        if (completed >= total) {
            basesCompleted.push(`${tipo} (${completed}/${total})`);
        } else if (completed > 0) {
            basesPending.push(`${tipo} (${completed}/${total})`);
        } else {
            basesPending.push(`${tipo} (0/${total})`);
        }
    }

    // Construir conteúdo do tooltip
    let tooltipHTML = `
                <div class="tooltip-line">${usinaName} - Linha ${linha}</div>
                <div class="tooltip-progress">Progresso: ${progress}%</div>
                <div class="tooltip-status">Status: ${status}</div>
            `;

    if (basesCompleted.length > 0) {
        tooltipHTML += `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <div style="color: #10b981; font-weight: 600; font-size: 0.75rem; margin-bottom: 4px;">✅ Concluídas:</div>
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.75rem;">${basesCompleted.join(", ")}</div>
                    </div>
                `;
    }

    if (basesPending.length > 0) {
        tooltipHTML += `
                    <div style="margin-top: 6px;">
                        <div style="color: #f59e0b; font-weight: 600; font-size: 0.75rem; margin-bottom: 4px;">⏳ Pendentes:</div>
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.75rem;">${basesPending.join(", ")}</div>
                    </div>
                `;
    }

    tooltip.querySelector(".tooltip-content").innerHTML = tooltipHTML;

    // Posicionar tooltip fixo em relação ao elemento
    const lineElement = event.currentTarget;
    const lineRect = lineElement.getBoundingClientRect();

    // Mostrar tooltip temporariamente para obter suas dimensões
    tooltip.style.visibility = "hidden";
    tooltip.classList.add("show");
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.classList.remove("show");
    tooltip.style.visibility = "visible";

    // Posição preferencial: acima e centralizado no elemento
    let left = lineRect.left + lineRect.width / 2 - tooltipRect.width / 2 + window.pageXOffset;
    let top = lineRect.top - tooltipRect.height - 10 + window.pageYOffset;

    // Ajustar se sair da tela pela esquerda
    if (left < 10) {
        left = 10;
    }

    // Ajustar se sair da tela pela direita
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }

    // Se não couber acima, mostrar abaixo
    if (top < window.pageYOffset + 10) {
        top = lineRect.bottom + 10 + window.pageYOffset;
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
    tooltip.classList.add("show");
}

// Esconder tooltip do mapa
function hideMapTooltip() {
    document.getElementById("mapTooltip").classList.remove("show");
}

// Mostrar tooltip para grupos transversais
function showTransversalTooltip(event, usinaKey, grupo) {
    const tooltip = document.getElementById("mapTooltip");
    const usinaName = projectData[usinaKey].name;

    // Extrair números das linhas do grupo (ex: "06-10" -> [06, 07, 08, 09, 10])
    const [inicio, fim] = grupo.split("-").map((n) => n.padStart(2, "0"));
    const linhas = [];
    for (let i = parseInt(inicio); i <= parseInt(fim); i++) {
        linhas.push(i.toString().padStart(2, "0"));
    }

    // Calcular progresso agregado do grupo
    let totalBases = 0;
    let completedBases = 0;
    const basesByType = {};

    linhas.forEach((linha) => {
        const linhaData = projectData[usinaKey]?.linhas[linha];
        if (!linhaData) return;

        for (const tipo in linhaData.bases) {
            const total = linhaData.bases[tipo];
            const completed = progressData[usinaKey]?.[linha]?.[tipo] || 0;

            totalBases += total;
            completedBases += completed;

            if (!basesByType[tipo]) {
                basesByType[tipo] = { total: 0, completed: 0 };
            }
            basesByType[tipo].total += total;
            basesByType[tipo].completed += completed;
        }
    });

    const progress = totalBases > 0 ? Math.round((completedBases / totalBases) * 100) : 0;

    let status = "";
    if (progress === 100) {
        status = "Concluído";
    } else if (progress > 0) {
        status = "Em Andamento";
    } else {
        status = "Pendente";
    }

    // Separar bases completas e pendentes
    const basesCompleted = [];
    const basesPending = [];

    for (const tipo in basesByType) {
        const { total, completed } = basesByType[tipo];
        if (completed >= total) {
            basesCompleted.push(`${tipo} (${completed}/${total})`);
        } else if (completed > 0) {
            basesPending.push(`${tipo} (${completed}/${total})`);
        } else {
            basesPending.push(`${tipo} (0/${total})`);
        }
    }

    // Construir conteúdo do tooltip
    let tooltipHTML = `
                <div class="tooltip-line">${usinaName} - Linhas ${grupo}</div>
                <div class="tooltip-progress">Progresso: ${progress}% (${completedBases}/${totalBases} bases)</div>
                <div class="tooltip-status">Status: ${status}</div>
            `;

    if (basesCompleted.length > 0) {
        tooltipHTML += `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <div style="color: #10b981; font-weight: 600; font-size: 0.75rem; margin-bottom: 4px;">✅ Concluídas:</div>
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.75rem;">${basesCompleted.join(", ")}</div>
                    </div>
                `;
    }

    if (basesPending.length > 0) {
        tooltipHTML += `
                    <div style="margin-top: 6px;">
                        <div style="color: #f59e0b; font-weight: 600; font-size: 0.75rem; margin-bottom: 4px;">⏳ Pendentes:</div>
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.75rem;">${basesPending.join(", ")}</div>
                    </div>
                `;
    }

    tooltip.querySelector(".tooltip-content").innerHTML = tooltipHTML;

    // Posicionar tooltip
    const groupElement = event.currentTarget;
    const groupRect = groupElement.getBoundingClientRect();

    tooltip.style.visibility = "hidden";
    tooltip.classList.add("show");
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.classList.remove("show");
    tooltip.style.visibility = "visible";

    let left = groupRect.left + groupRect.width / 2 - tooltipRect.width / 2 + window.pageXOffset;
    let top = groupRect.top - tooltipRect.height - 10 + window.pageYOffset;

    if (left < 10) {
        left = 10;
    }

    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }

    if (top < window.pageYOffset + 10) {
        top = groupRect.bottom + 10 + window.pageYOffset;
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
    tooltip.classList.add("show");
}

// Adicionar event listeners para linhas do mapa
function initializeMapEvents() {
    // Event listeners para linhas individuais
    document.querySelectorAll(".map-line").forEach((line) => {
        const usinaKey = line.dataset.usina;
        const linha = line.dataset.linha;

        // Click para abrir modal - só se não tiver onclick definido
        if (!line.hasAttribute("onclick")) {
            line.addEventListener("click", () => {
                openLineModal(usinaKey, linha);
            });
        }

        // Hover para tooltip
        line.addEventListener("mouseenter", (event) => {
            showMapTooltip(event, usinaKey, linha);
        });

        line.addEventListener("mouseleave", () => {
            hideMapTooltip();
        });
    });

    // Event listeners para grupos transversais
    document.querySelectorAll(".transversal-group").forEach((group) => {
        const usinaKey = group.dataset.usina;
        const grupo = group.dataset.grupo;

        // Hover para tooltip
        group.addEventListener("mouseenter", (event) => {
            showTransversalTooltip(event, usinaKey, grupo);
        });

        group.addEventListener("mouseleave", () => {
            hideMapTooltip();
        });
    });
}

// Função principal de integração com dados externos
function updateMapFromExternalData(externalProgressData) {
    if (externalProgressData) {
        // Usar dados externos se fornecidos
        const originalProgressData = progressData;
        progressData = externalProgressData;

        // Atualizar todas as usinas
        updateMapLines("pimental");
        updateMapLines("belo-monte");
        updateMapLines("oficina");
        updateMapStats(currentMapTab);

        // Restaurar dados originais
        progressData = originalProgressData;
    } else {
        // Usar dados internos do sistema
        updateMapLines("pimental");
        updateMapLines("belo-monte");
        updateMapLines("oficina");
        updateMapStats(currentMapTab);
    }
}

// Inicializar mapa quando documento carregar
function initializeMap() {
    // Configurar eventos iniciais
    initializeMapEvents();

    // Atualizar com dados atuais
    updateMapFromExternalData();

    console.log("🗺️ Mapa interativo inicializado com sucesso!");
}

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

function updateChartInfos() {
    // Atualizar info do Pimental
    const pimentalCompleted = calculateCompletedBasesOfUsina("pimental");
    const pimentalTotal = calculateTotalBasesOfUsina("pimental");
    document.getElementById("pimentalTotalBases").textContent =
        `${pimentalCompleted}/${pimentalTotal}`;

    // Atualizar info do Belo Monte
    const beloMonteCompleted = calculateCompletedBasesOfUsina("belo-monte");
    const beloMonteTotal = calculateTotalBasesOfUsina("belo-monte");
    document.getElementById("beloMonteTotalBases").textContent =
        `${beloMonteCompleted}/${beloMonteTotal}`;
}

// Funções de gráficos
function initializeCharts() {
    initChartConclusaoGeral();
    initChartPimental();
    initChartBeloMonte();
}

function initChartConclusaoGeral() {
    const ctx = document.getElementById("chartConclusaoGeral").getContext("2d");

    // Calcular progresso APENAS das bases (sem etapas do cabo) por usina
    const pimentalBasesCompleted = calculateCompletedBasesOfUsina("pimental");
    const pimentalBasesTotal = calculateTotalBasesOfUsina("pimental");
    const pimentalPending = pimentalBasesTotal - pimentalBasesCompleted;

    const beloMonteBasesCompleted = calculateCompletedBasesOfUsina("belo-monte");
    const beloMonteBasesTotal = calculateTotalBasesOfUsina("belo-monte");
    const beloMontePending = beloMonteBasesTotal - beloMonteBasesCompleted;

    const oficinaBasesCompleted = calculateCompletedBasesOfUsina("oficina");
    const oficinaBasesTotal = calculateTotalBasesOfUsina("oficina");
    const oficinaPending = oficinaBasesTotal - oficinaBasesCompleted;

    chartConclusaoGeral = new Chart(ctx, {
        type: "pie",
        data: {
            labels: [
                "Pimental Concluído",
                "Pimental Pendente",
                "Belo Monte Concluído",
                "Belo Monte Pendente",
                "Oficina Concluído",
                "Oficina Pendente",
            ],
            datasets: [
                {
                    data: [
                        pimentalBasesCompleted,
                        pimentalPending,
                        beloMonteBasesCompleted,
                        beloMontePending,
                        oficinaBasesCompleted,
                        oficinaPending,
                    ],
                    backgroundColor: [
                        "#3b82f6", // Azul para Pimental Concluído
                        "#bfdbfe", // Azul claro para Pimental Pendente
                        "#10b981", // Verde para Belo Monte Concluído
                        "#bbf7d0", // Verde claro para Belo Monte Pendente
                        "#f59e0b", // Laranja para Oficina Concluído
                        "#fde68a", // Laranja claro para Oficina Pendente
                    ],
                    borderWidth: 2,
                    borderColor: "#ffffff",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                        },
                    },
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage =
                                total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                            return `${label}: ${value} bases (${percentage}%)`;
                        },
                    },
                },
            },
        },
    });
}

// Função para calcular gradiente de cor baseado na porcentagem
function getProgressGradient(percentage) {
    if (percentage === 0) {
        return "linear-gradient(90deg, #e5e7eb, #d1d5db)"; // Cinza para 0%
    }

    // Transição de laranja para verde baseada na porcentagem
    if (percentage <= 50) {
        // 0-50%: De laranja escuro para laranja claro
        const intensity = percentage / 50;
        const r = Math.round(245 - (245 - 217) * intensity); // 245 -> 217
        const g = Math.round(101 + (151 - 101) * intensity); // 101 -> 151
        const b = Math.round(11 + (47 - 11) * intensity); // 11 -> 47
        return `linear-gradient(90deg, rgb(${r}, ${g}, ${b}), rgb(${Math.max(r - 20, 180)}, ${Math.max(g - 10, 130)}, ${Math.max(b - 5, 30)}))`;
    } else {
        // 50-100%: De laranja claro para verde
        const intensity = (percentage - 50) / 50;
        const r = Math.round(217 - (217 - 16) * intensity); // 217 -> 16
        const g = Math.round(151 + (185 - 151) * intensity); // 151 -> 185
        const b = Math.round(47 + (129 - 47) * intensity); // 47 -> 129
        return `linear-gradient(90deg, rgb(${r}, ${g}, ${b}), rgb(${Math.max(r - 10, 10)}, ${Math.min(g + 15, 200)}, ${Math.min(b + 20, 150)}))`;
    }
}

// Função para adicionar tooltip com detalhes de progresso nas barras
function addProgressTooltip(barElement, tipo, linesInfo, usinaKey) {
    const tooltip = document.createElement("div");
    tooltip.className = "progress-tooltip";

    // Nome da usina
    const usinaName =
        usinaKey === "pimental" ? "Pimental" : usinaKey === "belo-monte" ? "Belo Monte" : "Oficina";

    // Ordenar linhas numericamente
    const sortedCompleted = linesInfo.completed.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return numA - numB;
    });

    const sortedPending = linesInfo.pending.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return numA - numB;
    });

    // Construir conteúdo do tooltip
    let tooltipContent = `<div class="tooltip-title">Tipo ${tipo} - ${usinaName}</div>`;

    if (sortedCompleted.length > 0) {
        tooltipContent += `
                    <div class="tooltip-section">
                        <div class="tooltip-section-title">✅ Linhas concluídas (${sortedCompleted.length})</div>
                        <div class="tooltip-lines">Linhas: ${sortedCompleted.join(", ")}</div>
                    </div>
                `;
    }

    if (sortedPending.length > 0) {
        tooltipContent += `
                    <div class="tooltip-section">
                        <div class="tooltip-section-title pending">⏳ Linhas pendentes (${sortedPending.length})</div>
                        <div class="tooltip-lines">Linhas: ${sortedPending.join(", ")}</div>
                    </div>
                `;
    }

    tooltip.innerHTML = tooltipContent;
    document.body.appendChild(tooltip);

    // Event listeners para mostrar/ocultar tooltip
    barElement.addEventListener("mouseenter", (_e) => {
        const rect = barElement.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 10}px`;
        tooltip.classList.add("show");
    });

    barElement.addEventListener("mouseleave", () => {
        tooltip.classList.remove("show");
    });

    // Remover tooltip quando o elemento pai for destruído
    barElement.addEventListener("DOMNodeRemovedFromDocument", () => {
        tooltip.remove();
    });
}

function initChartPimental() {
    const container = document.getElementById("chartPimental");

    const usinaKey = "pimental";
    const tipos = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];

    // Calcular totais por tipo para Pimental
    const totalByType = {};
    const completedByType = {};
    const linesByType = {}; // Rastrear quais linhas têm cada tipo

    for (const tipo of tipos) {
        totalByType[tipo] = 0;
        completedByType[tipo] = 0;
        linesByType[tipo] = { completed: [], pending: [] };
    }

    // Calcular totais de Pimental
    if (projectData[usinaKey]) {
        for (const linha in projectData[usinaKey].linhas) {
            const bases = projectData[usinaKey].linhas[linha].bases;
            for (const tipo in bases) {
                const totalBases = bases[tipo];
                const completedBases =
                    progressData[usinaKey] && progressData[usinaKey][linha]
                        ? progressData[usinaKey][linha][tipo] || 0
                        : 0;

                totalByType[tipo] = (totalByType[tipo] || 0) + totalBases;
                completedByType[tipo] = (completedByType[tipo] || 0) + completedBases;

                // Determinar se a linha está completa ou pendente para este tipo
                if (completedBases >= totalBases) {
                    linesByType[tipo].completed.push(linha);
                } else {
                    linesByType[tipo].pending.push(linha);
                }
            }
        }
    }

    // Filtrar apenas tipos que existem em Pimental
    const tiposComBases = tipos.filter((tipo) => totalByType[tipo] > 0);

    // Encontrar o máximo para escala proporcional
    const maxBases = Math.max(...tiposComBases.map((tipo) => totalByType[tipo]));

    // Limpar container
    container.innerHTML = "";

    // Criar barras horizontais
    tiposComBases.forEach((tipo) => {
        const total = totalByType[tipo];
        const completed = completedByType[tipo] || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const barWidth = (total / maxBases) * 100; // Largura proporcional

        const barItem = document.createElement("div");
        barItem.className = "bar-item";

        const progressGradient = getProgressGradient(percentage);

        barItem.innerHTML = `
                    <div class="bar-label">Tipo ${tipo}</div>
                    <div class="bar-container" style="width: ${barWidth}%;">
                        <div class="bar-fill" style="width: ${percentage}%; background: ${progressGradient};"></div>
                        <div class="bar-text">${completed}/${total}</div>
                    </div>
                    <div class="bar-percentage">${percentage}%</div>
                `;

        // Adicionar tooltip com detalhes
        addProgressTooltip(barItem, tipo, linesByType[tipo], usinaKey);

        container.appendChild(barItem);
    });
}

function initChartBeloMonte() {
    const container = document.getElementById("chartBeloMonte");

    const usinaKey = "belo-monte";
    const tipos = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];

    // Calcular totais por tipo para Belo Monte
    const totalByType = {};
    const completedByType = {};
    const linesByType = {}; // Rastrear quais linhas têm cada tipo

    for (const tipo of tipos) {
        totalByType[tipo] = 0;
        completedByType[tipo] = 0;
        linesByType[tipo] = { completed: [], pending: [] };
    }

    // Calcular totais de Belo Monte
    if (projectData[usinaKey]) {
        for (const linha in projectData[usinaKey].linhas) {
            const bases = projectData[usinaKey].linhas[linha].bases;
            for (const tipo in bases) {
                const totalBases = bases[tipo];
                const completedBases =
                    progressData[usinaKey] && progressData[usinaKey][linha]
                        ? progressData[usinaKey][linha][tipo] || 0
                        : 0;

                totalByType[tipo] = (totalByType[tipo] || 0) + totalBases;
                completedByType[tipo] = (completedByType[tipo] || 0) + completedBases;

                // Determinar se a linha está completa ou pendente para este tipo
                if (completedBases >= totalBases) {
                    linesByType[tipo].completed.push(linha);
                } else {
                    linesByType[tipo].pending.push(linha);
                }
            }
        }
    }

    // Filtrar apenas tipos que existem em Belo Monte
    const tiposComBases = tipos.filter((tipo) => totalByType[tipo] > 0);

    // Encontrar o máximo para escala proporcional
    const maxBases = Math.max(...tiposComBases.map((tipo) => totalByType[tipo]));

    // Limpar container
    container.innerHTML = "";

    // Criar barras horizontais
    tiposComBases.forEach((tipo) => {
        const total = totalByType[tipo];
        const completed = completedByType[tipo] || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const barWidth = (total / maxBases) * 100; // Largura proporcional

        const barItem = document.createElement("div");
        barItem.className = "bar-item";

        const progressGradient = getProgressGradient(percentage);

        barItem.innerHTML = `
                    <div class="bar-label">Tipo ${tipo}</div>
                    <div class="bar-container" style="width: ${barWidth}%;">
                        <div class="bar-fill" style="width: ${percentage}%; background: ${progressGradient};"></div>
                        <div class="bar-text">${completed}/${total}</div>
                    </div>
                    <div class="bar-percentage">${percentage}%</div>
                `;

        // Adicionar tooltip com detalhes
        addProgressTooltip(barItem, tipo, linesByType[tipo], usinaKey);

        container.appendChild(barItem);
    });
}

function initChartOficina() {
    const container = document.getElementById("chartOficina");

    const usinaKey = "oficina";
    const tipos = ["M", "B", "K", "H"];

    // Calcular totais por tipo para Oficina
    const totalByType = {};
    const completedByType = {};
    const linesByType = {}; // Rastrear quais linhas têm cada tipo

    for (const tipo of tipos) {
        totalByType[tipo] = 0;
        completedByType[tipo] = 0;
        linesByType[tipo] = { completed: [], pending: [] };
    }

    // Calcular totais de Oficina
    if (projectData[usinaKey]) {
        for (const linha in projectData[usinaKey].linhas) {
            const bases = projectData[usinaKey].linhas[linha].bases;
            for (const tipo in bases) {
                const totalBases = bases[tipo];
                const completedBases =
                    progressData[usinaKey] && progressData[usinaKey][linha]
                        ? progressData[usinaKey][linha][tipo] || 0
                        : 0;

                totalByType[tipo] = (totalByType[tipo] || 0) + totalBases;
                completedByType[tipo] = (completedByType[tipo] || 0) + completedBases;

                // Determinar se a linha está completa ou pendente para este tipo
                if (completedBases >= totalBases) {
                    linesByType[tipo].completed.push(linha);
                } else {
                    linesByType[tipo].pending.push(linha);
                }
            }
        }
    }

    // Filtrar apenas tipos que existem em Oficina
    const tiposComBases = tipos.filter((tipo) => totalByType[tipo] > 0);

    // Encontrar o máximo para escala proporcional
    const maxBases = Math.max(...tiposComBases.map((tipo) => totalByType[tipo]));

    // Limpar container
    container.innerHTML = "";

    // Criar barras horizontais
    tiposComBases.forEach((tipo) => {
        const total = totalByType[tipo];
        const completed = completedByType[tipo] || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const barWidth = (total / maxBases) * 100; // Largura proporcional

        const barItem = document.createElement("div");
        barItem.className = "bar-item";

        const progressGradient = getProgressGradient(percentage);

        barItem.innerHTML = `
                    <div class="bar-label">Tipo ${tipo}</div>
                    <div class="bar-container" style="width: ${barWidth}%;">
                        <div class="bar-fill" style="width: ${percentage}%; background: ${progressGradient};"></div>
                        <div class="bar-text">${completed}/${total}</div>
                    </div>
                    <div class="bar-percentage">${percentage}%</div>
                `;

        // Adicionar tooltip com detalhes
        addProgressTooltip(barItem, tipo, linesByType[tipo], usinaKey);

        container.appendChild(barItem);
    });
}

function updateCharts() {
    if (chartConclusaoGeral) {
        chartConclusaoGeral.destroy();
        initChartConclusaoGeral();
    }
    initChartPimental();
    initChartBeloMonte();
    initChartOficina();
}

// Funções do modal
function openUpdateModal() {
    if (!isAuthenticated) {
        pendingAction = "openUpdate";
        showPasswordModal();
        return;
    }
    if (!requireOnlineEdits()) return;
    document.getElementById("updateModal").style.display = "block";
}

function openLineModal(usina, linha) {
    if (!isAuthenticated) {
        pendingAction = () => openLineModal(usina, linha);
        showPasswordModal();
        return;
    }
    if (!requireOnlineEdits()) return;
    document.getElementById("usinaSelect").value = usina;
    loadLinhas();
    document.getElementById("linhaSelect").value = linha;
    loadBases();
    document.getElementById("updateModal").style.display = "block";
}

function closeModal() {
    document.getElementById("updateModal").style.display = "none";
    document.getElementById("updateForm").reset();
    document.getElementById("linhaSelect").disabled = true;
    document.getElementById("basesCheckboxes").innerHTML = "";
    document.getElementById("removeBasesCheckboxes").innerHTML = "";
    // Resetar os checkboxes de "todas as bases"
    document.getElementById("selectAllBases").checked = false;
    document.getElementById("selectAllRemoveBases").checked = false;
}

// Variáveis globais para o modal de observação
let currentObservationUsina = "";
let currentObservationLinha = "";

function openObservationModal(usinaKey, linha) {
    currentObservationUsina = usinaKey;
    currentObservationLinha = linha;

    // Atualizar informações da linha
    const usinaName = projectData[usinaKey].name;
    document.getElementById("observationLineInfo").textContent = `${usinaName} - Linha ${linha}`;

    // Carregar observação existente
    const currentObservation =
        lineObservations[usinaKey] && lineObservations[usinaKey][linha]
            ? lineObservations[usinaKey][linha]
            : "";
    document.getElementById("observationText").value = currentObservation;

    // Atualizar contador de caracteres
    updateCharacterCount();

    // Mostrar modal
    document.getElementById("observationModal").style.display = "block";
}

function closeObservationModal() {
    document.getElementById("observationModal").style.display = "none";
    const textarea = document.getElementById("observationText");
    textarea.value = "";
    textarea.style.height = "auto"; // Reset height
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

    // Inicializar estrutura se necessário
    if (!lineObservations[currentObservationUsina]) {
        lineObservations[currentObservationUsina] = {};
    }

    // Salvar observação
    lineObservations[currentObservationUsina][currentObservationLinha] = observationText;

    // Persistir
    saveProgressToStorage();
    await saveProjectData();

    showToast("Observação salva com sucesso!", "success");
    closeObservationModal();
}

// Função para atualizar contador de caracteres e auto-resize
function updateCharacterCount() {
    const textarea = document.getElementById("observationText");
    const charCount = document.getElementById("charCount");
    const currentLength = textarea.value.length;
    const maxLength = textarea.maxLength;

    charCount.textContent = `${currentLength}/${maxLength}`;

    // Mudar cor quando próximo do limite
    if (currentLength > maxLength * 0.9) {
        charCount.style.color = "var(--error-red)";
    } else if (currentLength > maxLength * 0.75) {
        charCount.style.color = "var(--warning-orange)";
    } else {
        charCount.style.color = "var(--medium-gray)";
    }

    // Auto-resize do textarea
    textarea.style.height = "auto";
    const newHeight = Math.max(140, textarea.scrollHeight);
    textarea.style.height = newHeight + "px";
}

// Funções para Modal de Linhas Transversais
function showTransversalDetails(usinaKey, grupo) {
    const [startLine, endLine] = grupo.split("-").map(Number);
    const linhas = [];

    for (let i = startLine; i <= endLine; i++) {
        const linhaStr = String(i).padStart(2, "0");
        if (projectData[usinaKey].linhas[linhaStr]) {
            linhas.push(linhaStr);
        }
    }

    // Atualizar informações do grupo
    const usinaName = projectData[usinaKey].name;
    document.getElementById("transversalGroupInfo").textContent =
        `${usinaName} - Linhas ${grupo} (${linhas.length} linhas transversais)`;

    // Popular tabela
    const tbody = document.getElementById("transversalLinesBody");
    tbody.innerHTML = "";

    linhas.forEach((linha) => {
        const linhaData = projectData[usinaKey].linhas[linha];
        const progress = calculateLineProgress(usinaKey, linha);
        const steps = lineStepsStatus[usinaKey]?.[linha] || {};
        const completed = progressData[usinaKey]?.[linha]?.J || 0;
        const total = linhaData.bases.J || 0;

        const statusClass =
            progress === 100 ? "completed" : progress > 0 ? "in-progress" : "pending";

        const row = document.createElement("tr");
        row.dataset.usina = usinaKey;
        row.dataset.linha = linha;
        row.dataset.total = total;
        row.innerHTML = `
                    <td style="font-weight: bold; color: var(--primary-blue);">${linha}</td>
                    <td>${linhaData.metragem}m</td>
                    <td>${total}</td>
                    <td class="editable-completed-cell">
                        <span class="completed-display">${completed}</span>
                        <input type="number" class="completed-input" value="${completed}" min="0" max="${total}" style="display: none; width: 60px; text-align: center; padding: 4px; border: 2px solid var(--primary-blue); border-radius: 4px;">
                    </td>
                    <td class="progress-cell">
                        <div class="progress-bar" style="margin: 0;">
                            <div class="progress-fill ${statusClass}" style="width: ${progress}%"></div>
                            <span class="progress-text">${progress}%</span>
                        </div>
                    </td>
                    <td class="editable-step" data-step="passagemCabo">${steps.passagemCabo ? "✅" : "❌"}</td>
                    <td class="editable-step" data-step="crimpagemCabo">${steps.crimpagemCabo ? "✅" : "❌"}</td>
                    <td class="editable-step" data-step="afericaoCrimpagem">${steps.afericaoCrimpagem ? "✅" : "❌"}</td>
                    <td class="editable-step" data-step="tensionamentoCabo">${steps.tensionamentoCabo ? "✅" : "❌"}</td>
                    <td class="editable-seal" data-seal="lacreTensionador">${steps.lacreTensionador || "-"}</td>
                    <td class="editable-seal" data-seal="lacreLoopAbs">${steps.lacreLoopAbs || "-"}</td>
                `;

        tbody.appendChild(row);
    });

    // Resetar modo de visualização
    document.getElementById("transversalLinesTable").classList.remove("edit-mode");
    document.getElementById("transversalViewButtons").style.display = "flex";
    document.getElementById("transversalEditButtons").style.display = "none";

    // Abrir modal
    document.getElementById("transversalModal").style.display = "flex";
}

function closeTransversalModal() {
    document.getElementById("transversalModal").style.display = "none";
}

// Variável para armazenar estado original antes da edição
let transversalEditBackup = null;

function enableTransversalEdit() {
    // Verificar autenticação antes de permitir edição
    if (!isAuthenticated) {
        pendingAction = () => enableTransversalEdit();
        showPasswordModal();
        return;
    }
    if (!requireOnlineEdits()) return;

    // Fazer backup do estado atual (incluindo progressData)
    transversalEditBackup = {
        steps: JSON.parse(JSON.stringify(lineStepsStatus)),
        progress: JSON.parse(JSON.stringify(progressData)),
    };

    // Ativar modo de edição
    const table = document.getElementById("transversalLinesTable");
    table.classList.add("edit-mode");

    // Adicionar event listeners nas células editáveis das etapas
    document.querySelectorAll(".editable-step").forEach((cell) => {
        cell.addEventListener("click", toggleStepStatus);
    });

    // Mostrar inputs de bases concluídas e esconder displays
    document.querySelectorAll(".completed-display").forEach((span) => {
        span.style.display = "none";
    });
    document.querySelectorAll(".completed-input").forEach((input) => {
        input.style.display = "inline-block";
    });

    // Converter campos de lacre em inputs editáveis
    document.querySelectorAll("#transversalLinesTable .editable-seal").forEach((cell) => {
        const row = cell.closest("tr");
        const usina = row.dataset.usina;
        const linha = row.dataset.linha;
        const sealField = cell.dataset.seal;
        const currentValue =
            (lineStepsStatus[usina] &&
                lineStepsStatus[usina][linha] &&
                lineStepsStatus[usina][linha][sealField]) ||
            "";

        cell.innerHTML = `<input type="text" class="seal-input" value="${currentValue}" maxlength="20" placeholder="Digite o lacre" data-usina="${usina}" data-linha="${linha}" data-seal="${sealField}" style="width: 120px; padding: 4px; text-align: center; border: 2px solid var(--primary-blue); border-radius: 4px; background: white;">`;
    });

    // Alternar botões
    document.getElementById("transversalViewButtons").style.display = "none";
    document.getElementById("transversalEditButtons").style.display = "flex";
}

function toggleStepStatus(event) {
    const cell = event.currentTarget;
    const row = cell.closest("tr");
    const usinaKey = row.dataset.usina;
    const linha = row.dataset.linha;
    const step = cell.dataset.step;

    // Inicializar estrutura se não existir
    if (!lineStepsStatus[usinaKey]) lineStepsStatus[usinaKey] = {};
    if (!lineStepsStatus[usinaKey][linha]) lineStepsStatus[usinaKey][linha] = {};

    // Toggle status
    const currentStatus = lineStepsStatus[usinaKey][linha][step] || false;
    lineStepsStatus[usinaKey][linha][step] = !currentStatus;

    // Atualizar visual
    cell.textContent = lineStepsStatus[usinaKey][linha][step] ? "✅" : "❌";
}

function cancelTransversalEdit() {
    // Restaurar backup
    if (transversalEditBackup) {
        lineStepsStatus = JSON.parse(JSON.stringify(transversalEditBackup.steps));
        progressData = JSON.parse(JSON.stringify(transversalEditBackup.progress));
        transversalEditBackup = null;
    }

    // Desativar modo de edição
    const table = document.getElementById("transversalLinesTable");
    table.classList.remove("edit-mode");

    // Remover event listeners
    document.querySelectorAll(".editable-step").forEach((cell) => {
        cell.removeEventListener("click", toggleStepStatus);
    });

    // Alternar botões e recarregar dados
    document.getElementById("transversalViewButtons").style.display = "flex";
    document.getElementById("transversalEditButtons").style.display = "none";

    // Recarregar modal com dados originais
    const usinaKey = document.querySelector("#transversalLinesBody tr")?.dataset.usina;
    if (!usinaKey) return;

    const grupoText = document.getElementById("transversalGroupInfo").textContent;
    const grupoMatch = grupoText.match(/Linhas (\d+-\d+)/);
    if (grupoMatch) {
        showTransversalDetails(usinaKey, grupoMatch[1]);
    }
}

async function saveTransversalEdit() {
    if (!requireOnlineEdits()) return;
    try {
        // Atualizar progressData com os valores dos inputs
        document.querySelectorAll("#transversalLinesBody tr").forEach((row) => {
            const usinaKey = row.dataset.usina;
            const linha = row.dataset.linha;
            const input = row.querySelector(".completed-input");
            const completedValue = parseInt(input.value) || 0;

            // Inicializar estrutura se não existir
            if (!progressData[usinaKey]) progressData[usinaKey] = {};
            if (!progressData[usinaKey][linha]) progressData[usinaKey][linha] = {};

            // Atualizar bases J concluídas
            progressData[usinaKey][linha].J = completedValue;
        });

        // Atualizar campos de lacre com os valores dos inputs
        document.querySelectorAll("#transversalLinesTable .seal-input").forEach((input) => {
            const usina = input.dataset.usina;
            const linha = input.dataset.linha;
            const sealField = input.dataset.seal;
            const sealValue = input.value.trim();

            // Inicializar estrutura se não existir
            if (!lineStepsStatus[usina]) lineStepsStatus[usina] = {};
            if (!lineStepsStatus[usina][linha]) lineStepsStatus[usina][linha] = {};

            // Atualizar valor do lacre
            lineStepsStatus[usina][linha][sealField] = sealValue;
        });

        // Salvar no localStorage
        saveLineStepsToStorage();
        saveProgressToStorage();

        // Salvar no Firebase se configurado
        if (db && currentProjectId) {
            await saveProgressToFirebase();
        }

        // Limpar backup
        transversalEditBackup = null;

        // Atualizar displays
        updateAllDisplays();
        updateTransversalVisuals();

        // Desativar modo de edição
        const table = document.getElementById("transversalLinesTable");
        table.classList.remove("edit-mode");

        // Remover event listeners
        document.querySelectorAll(".editable-step").forEach((cell) => {
            cell.removeEventListener("click", toggleStepStatus);
        });

        // Esconder inputs e mostrar displays
        document.querySelectorAll(".completed-display").forEach((span) => {
            span.style.display = "inline-block";
        });
        document.querySelectorAll(".completed-input").forEach((input) => {
            input.style.display = "none";
        });

        // Alternar botões
        document.getElementById("transversalViewButtons").style.display = "flex";
        document.getElementById("transversalEditButtons").style.display = "none";

        // Recarregar modal com dados atualizados
        const usinaKey = document.querySelector("#transversalLinesBody tr")?.dataset.usina;
        if (usinaKey) {
            const grupoText = document.getElementById("transversalGroupInfo").textContent;
            const grupoMatch = grupoText.match(/Linhas (\d+-\d+)/);
            if (grupoMatch) {
                showTransversalDetails(usinaKey, grupoMatch[1]);
            }
        }

        showToast("Progresso atualizado com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showToast("Erro ao salvar progresso", "error");
    }
}

// Atualizar visuais dos grupos transversais no mapa
function updateTransversalVisuals() {
    document.querySelectorAll(".transversal-line-mini").forEach((mini) => {
        const linha = mini.dataset.linha;
        const group = mini.closest(".transversal-group");
        const usinaKey = group.dataset.usina;

        const progress = calculateLineProgress(usinaKey, linha);

        mini.classList.remove("completed", "in-progress", "pending");
        if (progress === 100) {
            mini.classList.add("completed");
        } else if (progress > 0) {
            mini.classList.add("in-progress");
        } else {
            mini.classList.add("pending");
        }
    });
}

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
        lineStepsStatus = JSON.parse(JSON.stringify(tableEditBackup));
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
            await saveProgressToFirebase();
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

// Funções para Modal de Detalhes de Linha Individual
let lineDetailsEditBackup = null;
let currentLineDetails = { usinaKey: null, linha: null };

function showLineDetails(usinaKey, linha) {
    currentLineDetails = { usinaKey, linha };
    const linhaData = projectData[usinaKey].linhas[linha];
    const usinaName = projectData[usinaKey].name;

    // Atualizar informações da linha
    document.getElementById("lineDetailsInfo").textContent =
        `${usinaName} - Linha ${linha} (${linhaData.metragem}m)`;

    // Criar cabeçalho da tabela (formato horizontal compacto)
    const thead = document.getElementById("lineDetailsTableHead");
    const baseTipos = Object.keys(linhaData.bases);

    let headerHTML = "<tr><th>Linha</th><th>Metragem</th>";

    // Adicionar uma coluna para cada tipo de base (formato X/Y)
    baseTipos.forEach((tipo) => {
        headerHTML += `<th>${tipo}</th>`;
    });

    headerHTML +=
        "<th>Progresso</th><th>Passagem</th><th>Crimpagem</th><th>Aferição</th><th>Tensionamento</th><th>Lacre Tensionador</th><th>Lacre Loop Abs</th></tr>";
    thead.innerHTML = headerHTML;

    // Popular corpo da tabela com uma única linha
    const tbody = document.getElementById("lineDetailsBody");
    const steps = lineStepsStatus[usinaKey]?.[linha] || {};

    let rowHTML = `<tr><td style="font-weight: bold; color: var(--primary-blue);">${linha}</td><td>${linhaData.metragem}m</td>`;

    // Adicionar células para cada tipo de base (formato X/Y)
    let totalCompleted = 0;
    let totalBases = 0;
    baseTipos.forEach((tipo) => {
        const total = linhaData.bases[tipo];
        const completed = progressData[usinaKey]?.[linha]?.[tipo] || 0;
        totalCompleted += completed;
        totalBases += total;

        rowHTML += `
                    <td class="editable-completed-cell" data-tipo="${tipo}" data-total="${total}">
                        <span class="completed-display">${completed}/${total}</span>
                        <input type="number" class="completed-input" value="${completed}" min="0" max="${total}"
                               style="display: none; width: 50px; text-align: center; padding: 4px; border: 2px solid var(--primary-blue); border-radius: 4px;">
                        <span class="total-display" style="display: none;">/${total}</span>
                    </td>
                `;
    });

    // Adicionar progresso geral
    const progress = totalBases > 0 ? (totalCompleted / totalBases) * 100 : 0;
    const statusClass = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "pending";

    rowHTML += `
                <td>
                    <div class="progress-bar" style="margin: 0;">
                        <div class="progress-fill ${statusClass}" style="width: ${progress}%"></div>
                        <span class="progress-text">${progress.toFixed(0)}%</span>
                    </div>
                </td>
            `;

    // Adicionar etapas do cabo
    rowHTML += `
                <td class="editable-step" data-step="passagemCabo">${steps.passagemCabo ? "✅" : "❌"}</td>
                <td class="editable-step" data-step="crimpagemCabo">${steps.crimpagemCabo ? "✅" : "❌"}</td>
                <td class="editable-step" data-step="afericaoCrimpagem">${steps.afericaoCrimpagem ? "✅" : "❌"}</td>
                <td class="editable-step" data-step="tensionamentoCabo">${steps.tensionamentoCabo ? "✅" : "❌"}</td>
                <td class="editable-seal" data-seal="lacreTensionador">${steps.lacreTensionador || "-"}</td>
                <td class="editable-seal" data-seal="lacreLoopAbs">${steps.lacreLoopAbs || "-"}</td>
            </tr>`;

    tbody.innerHTML = rowHTML;

    // Resetar modo de visualização
    document.getElementById("lineDetailsTable").classList.remove("edit-mode");
    document.getElementById("lineDetailsViewButtons").style.display = "flex";
    document.getElementById("lineDetailsEditButtons").style.display = "none";

    // Abrir modal
    document.getElementById("lineDetailsModal").style.display = "flex";
}

function closeLineDetailsModal() {
    document.getElementById("lineDetailsModal").style.display = "none";
}

function enableLineDetailsEdit() {
    // Verificar autenticação
    if (!isAuthenticated) {
        pendingAction = () => enableLineDetailsEdit();
        showPasswordModal();
        return;
    }

    // Fazer backup
    lineDetailsEditBackup = {
        steps: JSON.parse(JSON.stringify(lineStepsStatus)),
        progress: JSON.parse(JSON.stringify(progressData)),
    };

    // Ativar modo de edição
    document.getElementById("lineDetailsTable").classList.add("edit-mode");

    // Mostrar inputs de bases (formato X/Y -> input/Y)
    document.querySelectorAll("#lineDetailsBody .completed-display").forEach((span) => {
        span.style.display = "none";
    });
    document.querySelectorAll("#lineDetailsBody .completed-input").forEach((input) => {
        input.style.display = "inline-block";
    });
    document.querySelectorAll("#lineDetailsBody .total-display").forEach((span) => {
        span.style.display = "inline";
    });

    // Adicionar event listeners nas etapas
    document.querySelectorAll("#lineDetailsBody .editable-step").forEach((cell) => {
        cell.addEventListener("click", toggleLineDetailsStep);
    });

    // Converter células de lacre em inputs editáveis
    const { usinaKey, linha } = currentLineDetails;
    const steps = lineStepsStatus[usinaKey]?.[linha] || {};

    document.querySelectorAll("#lineDetailsBody .editable-seal").forEach((cell) => {
        const sealType = cell.dataset.seal;
        const currentValue = steps[sealType] || "";

        cell.innerHTML = `<input type="text" class="seal-input" value="${currentValue}" maxlength="20" placeholder="Digite o lacre" style="width: 120px; padding: 4px; text-align: center; border: 2px solid var(--primary-blue); border-radius: 4px;">`;
    });

    // Alternar botões
    document.getElementById("lineDetailsViewButtons").style.display = "none";
    document.getElementById("lineDetailsEditButtons").style.display = "flex";
}

function toggleLineDetailsStep(event) {
    const cell = event.currentTarget;
    const step = cell.dataset.step;
    const { usinaKey, linha } = currentLineDetails;

    // Inicializar estrutura
    if (!lineStepsStatus[usinaKey]) lineStepsStatus[usinaKey] = {};
    if (!lineStepsStatus[usinaKey][linha]) lineStepsStatus[usinaKey][linha] = {};

    // Toggle
    lineStepsStatus[usinaKey][linha][step] = !lineStepsStatus[usinaKey][linha][step];

    // Atualizar visual
    cell.textContent = lineStepsStatus[usinaKey][linha][step] ? "✅" : "❌";
}

function cancelLineDetailsEdit() {
    // Restaurar backup
    if (lineDetailsEditBackup) {
        lineStepsStatus = JSON.parse(JSON.stringify(lineDetailsEditBackup.steps));
        progressData = JSON.parse(JSON.stringify(lineDetailsEditBackup.progress));
        lineDetailsEditBackup = null;
    }

    // Desativar modo de edição
    document.getElementById("lineDetailsTable").classList.remove("edit-mode");

    // Remover event listeners
    document.querySelectorAll("#lineDetailsBody .editable-step").forEach((cell) => {
        cell.removeEventListener("click", toggleLineDetailsStep);
    });

    // Recarregar modal
    const { usinaKey, linha } = currentLineDetails;
    if (usinaKey && linha) {
        showLineDetails(usinaKey, linha);
    }
}

async function saveLineDetailsEdit() {
    if (!requireOnlineEdits()) return;
    try {
        const { usinaKey, linha } = currentLineDetails;

        // Atualizar progressData com valores dos inputs
        if (!progressData[usinaKey]) progressData[usinaKey] = {};
        if (!progressData[usinaKey][linha]) progressData[usinaKey][linha] = {};

        document.querySelectorAll("#lineDetailsBody .editable-completed-cell").forEach((cell) => {
            const tipo = cell.dataset.tipo;
            const input = cell.querySelector(".completed-input");
            const completedValue = parseInt(input.value) || 0;

            progressData[usinaKey][linha][tipo] = completedValue;
        });

        // Atualizar lacres com valores dos inputs
        if (!lineStepsStatus[usinaKey]) lineStepsStatus[usinaKey] = {};
        if (!lineStepsStatus[usinaKey][linha]) lineStepsStatus[usinaKey][linha] = {};

        document.querySelectorAll("#lineDetailsBody .editable-seal").forEach((cell) => {
            const sealType = cell.dataset.seal;
            const input = cell.querySelector(".seal-input");
            const sealValue = input ? input.value.trim() : "";

            lineStepsStatus[usinaKey][linha][sealType] = sealValue;
        });

        // Salvar
        saveLineStepsToStorage();
        saveProgressToStorage();

        await saveProgressToFirebase();

        // Limpar backup
        lineDetailsEditBackup = null;

        // Atualizar displays
        updateAllDisplays();
        updateTransversalVisuals();

        // Desativar modo de edição
        document.getElementById("lineDetailsTable").classList.remove("edit-mode");

        // Remover event listeners
        document.querySelectorAll("#lineDetailsBody .editable-step").forEach((cell) => {
            cell.removeEventListener("click", toggleLineDetailsStep);
        });

        // Esconder inputs
        document.querySelectorAll("#lineDetailsBody .completed-display").forEach((span) => {
            span.style.display = "inline-block";
        });
        document.querySelectorAll("#lineDetailsBody .completed-input").forEach((input) => {
            input.style.display = "none";
        });

        // Alternar botões
        document.getElementById("lineDetailsViewButtons").style.display = "flex";
        document.getElementById("lineDetailsEditButtons").style.display = "none";

        // Recarregar modal
        showLineDetails(usinaKey, linha);

        showToast("Progresso atualizado com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showToast("Erro ao salvar progresso", "error");
    }
}

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
            let pairCount = 1;
            if (usinaKey === "pimental") {
                if (linhaKey === "01" || linhaKey === "03") pairCount = 11;
                else if (linhaKey === "02" || linhaKey === "04") pairCount = 12;
                else pairCount = 1;
            } else if (usinaKey === "belo-monte") {
                if (
                    [
                        "01",
                        "02",
                        "03",
                        "04",
                        "05",
                        "06",
                        "07",
                        "08",
                        "10",
                        "11",
                        "12",
                        "13",
                        "14",
                        "15",
                        "16",
                        "17",
                    ].includes(linhaKey)
                ) {
                    pairCount = 11;
                } else if (["09", "18"].includes(linhaKey)) {
                    pairCount = 7;
                } else {
                    pairCount = 4;
                }
            } else if (usinaKey === "oficina") {
                if (linhaKey === "72" || linhaKey === "74") pairCount = 1;
                else if (linhaKey === "73") pairCount = 7;
            }

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
function renderBuiltTables() {
    renderBuiltTable("pimental");
    renderBuiltTable("belo-monte");
    renderBuiltTable("oficina");
}

/**
 * Renderiza tabela de Built para uma usina específica
 */
function renderBuiltTable(usinaKey) {
    const tableId = `tableBuilt${usinaKey === "pimental" ? "Pimental" : usinaKey === "belo-monte" ? "BeloMonte" : "Oficina"}`;
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    let html = "";

    const linhas = Object.keys(projectData[usinaKey].linhas).sort((a, b) => {
        return parseInt(a) - parseInt(b);
    });

    linhas.forEach((linha) => {
        // Verificar se a estrutura existe antes de acessar
        if (!builtInformations[usinaKey] || !builtInformations[usinaKey][linha]) {
            return;
        }
        const pares = builtInformations[usinaKey][linha];
        if (!pares) return;

        const pairKeys = Object.keys(pares).sort((a, b) => {
            const aNum = parseInt(a.split("-")[0]);
            const bNum = parseInt(b.split("-")[0]);
            return aNum - bNum;
        });

        let rowHTML = `<tr>`;
        rowHTML += `<td style="font-weight: bold; color: var(--primary-blue);">Linha ${linha}</td>`;

        pairKeys.forEach((pair) => {
            const value = pares[pair] || "";
            rowHTML += `
                        <td class="built-input-cell view-mode" data-pair="${pair}" data-linha="${linha}" data-usina="${usinaKey}">
                            <div style="font-size: 0.75rem; color: #666; margin-bottom: 2px;">${pair}</div>
                            <span class="built-display">${value || "-"}</span>
                            <input type="text" class="built-input" value="${value}" placeholder="-" />
                        </td>
                    `;
        });

        // Preencher colunas vazias para alinhamento
        const maxCols = 13;
        const currentCols = pairKeys.length;
        for (let i = currentCols; i < maxCols; i++) {
            rowHTML += `<td class="empty-cell"></td>`;
        }

        rowHTML += `</tr>`;
        html += rowHTML;
    });

    tbody.innerHTML = html;
}

/**
 * Ativa modo de edição para Built (com autenticação)
 */
function enableBuiltEdit() {
    if (!isAuthenticated) {
        pendingAction = () => enableBuiltEdit();
        showPasswordModal();
        return;
    }
    if (!requireOnlineEdits()) return;

    // Fazer backup antes de editar
    builtEditBackup = JSON.parse(JSON.stringify(builtInformations));

    // Ativar modo de edição para todas as tabelas
    ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach((tableId) => {
        const table = document.getElementById(tableId);
        if (!table) return;

        table.classList.add("edit-mode");

        // Mostrar inputs
        table.querySelectorAll(".built-input-cell").forEach((cell) => {
            cell.classList.remove("view-mode");
            const display = cell.querySelector(".built-display");
            const input = cell.querySelector(".built-input");

            if (display) display.style.display = "none";
            if (input) input.style.display = "inline-block";
        });
    });

    // Alternar botões
    document.getElementById("builtViewButtons").style.display = "none";
    document.getElementById("builtEditButtons").style.display = "flex";
}

/**
 * Cancela edição de Built (restaura backup)
 */
function cancelBuiltEdit() {
    if (builtEditBackup) {
        builtInformations = JSON.parse(JSON.stringify(builtEditBackup));
        builtEditBackup = null;
    }

    // Desativar modo de edição para todas as tabelas
    ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach((tableId) => {
        const table = document.getElementById(tableId);
        if (!table) return;

        table.classList.remove("edit-mode");

        table.querySelectorAll(".built-input-cell").forEach((cell) => {
            cell.classList.add("view-mode");
            const display = cell.querySelector(".built-display");
            const input = cell.querySelector(".built-input");

            if (display) display.style.display = "inline";
            if (input) input.style.display = "none";
        });
    });

    // Alternar botões
    document.getElementById("builtViewButtons").style.display = "flex";
    document.getElementById("builtEditButtons").style.display = "none";

    // Recarregar tabelas
    renderBuiltTables();
}

/**
 * Salva edições de Built (localStorage + Firebase)
 */
async function saveBuiltEdit() {
    if (!requireOnlineEdits()) return;
    try {
        // Atualizar builtInformations com valores dos inputs
        ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach((tableId) => {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.querySelectorAll(".built-input-cell").forEach((cell) => {
                const pair = cell.dataset.pair;
                const linha = cell.dataset.linha;
                const usinaKey = cell.dataset.usina;
                const input = cell.querySelector(".built-input");

                if (usinaKey && builtInformations[usinaKey] && builtInformations[usinaKey][linha]) {
                    builtInformations[usinaKey][linha][pair] = input.value.trim();
                }
            });
        });

        // Salvar no localStorage
        saveBuiltToStorage();

        // Desativar modo de edição
        ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach((tableId) => {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.classList.remove("edit-mode");

            table.querySelectorAll(".built-input-cell").forEach((cell) => {
                cell.classList.add("view-mode");
                const display = cell.querySelector(".built-display");
                const input = cell.querySelector(".built-input");

                if (display) display.style.display = "inline";
                if (input) input.style.display = "none";
            });
        });

        // Alternar botões
        document.getElementById("builtViewButtons").style.display = "flex";
        document.getElementById("builtEditButtons").style.display = "none";

        // Sincronizar com Firebase se autenticado
        await saveBuiltToFirebase();

        // Recarregar tabelas
        renderBuiltTables();

        showToast("Informações de Built salvas com sucesso!", "success");
        builtEditBackup = null;
    } catch (error) {
        console.error("Erro ao salvar Built:", error);
        showToast("Erro ao salvar informações de Built", "error");
    }
}

/**
 * Salva Built no localStorage
 */
function saveBuiltToStorage(force = false) {
    if (!force && !allowOnlineEdits) return;
    localStorage.setItem("linhasVidaBuilt", JSON.stringify(builtInformations));
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

/**
 * Carrega Built do localStorage
 */
function loadBuiltFromStorage() {
    const stored = localStorage.getItem("linhasVidaBuilt");
    if (stored) {
        try {
            const loadedData = JSON.parse(stored);
            builtInformations = sanitizeBuiltData(loadedData);
        } catch (error) {
            console.warn("Erro ao carregar Built do storage:", error);
            initializeBuiltData();
        }
    } else {
        initializeBuiltData();
    }
}

/**
 * Sanitiza dados de Built (garante estrutura correta)
 */
function sanitizeBuiltData(raw) {
    const sanitized = {};

    for (const usinaKey of Object.keys(projectData)) {
        sanitized[usinaKey] = {};

        const linhas = projectData[usinaKey].linhas;
        for (const linhaKey of Object.keys(linhas)) {
            // Determinar número de pares para esta linha
            let pairCount = 1;
            if (usinaKey === "pimental") {
                if (linhaKey === "01" || linhaKey === "03") pairCount = 11;
                else if (linhaKey === "02" || linhaKey === "04") pairCount = 12;
                else pairCount = 1;
            } else if (usinaKey === "belo-monte") {
                if (
                    [
                        "01",
                        "02",
                        "03",
                        "04",
                        "05",
                        "06",
                        "07",
                        "08",
                        "10",
                        "11",
                        "12",
                        "13",
                        "14",
                        "15",
                        "16",
                        "17",
                    ].includes(linhaKey)
                ) {
                    pairCount = 11;
                } else if (["09", "18"].includes(linhaKey)) {
                    pairCount = 7;
                } else {
                    pairCount = 4;
                }
            } else if (usinaKey === "oficina") {
                if (linhaKey === "72" || linhaKey === "74") pairCount = 1;
                else if (linhaKey === "73") pairCount = 7;
            }

            sanitized[usinaKey][linhaKey] = {};
            const rawLine = raw?.[usinaKey]?.[linhaKey] || {};

            // Preencher pares com valores do backup ou strings vazias
            for (let i = 1; i <= pairCount; i++) {
                const pairKey = `${String(i).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                sanitized[usinaKey][linhaKey][pairKey] = rawLine[pairKey] || "";
            }
        }
    }

    return sanitized;
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
        builtInformations = sanitizeBuiltData(docSnapshot.data().builtInformations);
    } else {
        initializeBuiltData();
    }
}

// ========== FIM DAS FUNÇÕES PARA BUILT INFORMATION ==========

function toggleAllBases(checkbox) {
    const basesCheckboxes = document.querySelectorAll('#basesCheckboxes input[type="checkbox"]');
    basesCheckboxes.forEach((cb) => {
        cb.checked = checkbox.checked;
    });
}

function toggleAllRemoveBases(checkbox) {
    const removeBasesCheckboxes = document.querySelectorAll(
        '#removeBasesCheckboxes input[type="checkbox"]'
    );
    removeBasesCheckboxes.forEach((cb) => {
        cb.checked = checkbox.checked;
    });
}

function updateSelectAllState() {
    const basesCheckboxes = document.querySelectorAll('#basesCheckboxes input[type="checkbox"]');
    const selectAllCheckbox = document.getElementById("selectAllBases");

    if (basesCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        return;
    }

    const allChecked = Array.from(basesCheckboxes).every((cb) => cb.checked);
    selectAllCheckbox.checked = allChecked;
}

function updateSelectAllRemoveState() {
    const removeBasesCheckboxes = document.querySelectorAll(
        '#removeBasesCheckboxes input[type="checkbox"]'
    );
    const selectAllRemoveCheckbox = document.getElementById("selectAllRemoveBases");

    if (removeBasesCheckboxes.length === 0) {
        selectAllRemoveCheckbox.checked = false;
        return;
    }

    const allChecked = Array.from(removeBasesCheckboxes).every((cb) => cb.checked);
    selectAllRemoveCheckbox.checked = allChecked;
}

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
    document.getElementById("readOnlyNotice").style.display = "block";
}

function hideReadOnlyNotice() {
    document.getElementById("readOnlyNotice").style.display = "none";
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

            saveProgressToFirebase();
        } catch (error) {
            console.error("Erro ao salvar no Firebase:", error);
        }
    }

    // Atualizar as tabelas
    updateAllDisplays();
}

function loadLinhas() {
    const usinaSelect = document.getElementById("usinaSelect");
    const linhaSelect = document.getElementById("linhaSelect");

    linhaSelect.innerHTML = '<option value="">Selecione uma linha</option>';
    linhaSelect.disabled = !usinaSelect.value;

    if (usinaSelect.value) {
        const usina = projectData[usinaSelect.value];
        // Ordenar linhas numericamente
        const linhasOrdenadas = Object.keys(usina.linhas).sort((a, b) => {
            return parseInt(a) - parseInt(b);
        });

        for (const linha of linhasOrdenadas) {
            const option = document.createElement("option");
            option.value = linha;
            option.textContent = `Linha ${linha}`;
            linhaSelect.appendChild(option);
        }
    }

    document.getElementById("basesCheckboxes").innerHTML = "";
}

function loadBases() {
    const usinaSelect = document.getElementById("usinaSelect");
    const linhaSelect = document.getElementById("linhaSelect");
    const basesContainer = document.getElementById("basesCheckboxes");
    const removeBasesContainer = document.getElementById("removeBasesCheckboxes");
    const executionDateInput = document.getElementById("executionDate");

    basesContainer.innerHTML = "";
    removeBasesContainer.innerHTML = "";

    // Resetar os checkboxes "selecionar todas"
    document.getElementById("selectAllBases").checked = false;
    document.getElementById("selectAllRemoveBases").checked = false;

    if (executionDateInput) {
        executionDateInput.value = "";
    }

    if (usinaSelect.value && linhaSelect.value) {
        const usinaKey = usinaSelect.value;
        const linhaData = projectData[usinaKey].linhas[linhaSelect.value];

        if (executionDateInput) {
            executionDateInput.value = getExecutionDateForLine(usinaKey, linhaSelect.value);
        }

        for (const tipo in linhaData.bases) {
            const quantidade = linhaData.bases[tipo];

            // Calcular quantas bases deste tipo estão concluídas nesta linha específica
            const completedNaLinha =
                (progressData[usinaKey] &&
                    progressData[usinaKey][linhaSelect.value] &&
                    progressData[usinaKey][linhaSelect.value][tipo]) ||
                0;

            // Seção para adicionar (apenas bases pendentes)
            const pendingNaLinha = quantidade - completedNaLinha;
            for (let i = 1; i <= pendingNaLinha; i++) {
                const checkboxItem = document.createElement("div");
                checkboxItem.className = "checkbox-item";
                checkboxItem.style.borderColor = "#10b981";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = `add-base-${tipo}-${i}`;
                checkbox.name = "addBases";
                checkbox.value = `${tipo}-${i}`;
                checkbox.addEventListener("change", updateSelectAllState);

                const label = document.createElement("label");
                label.htmlFor = checkbox.id;
                label.textContent = `Base ${tipo} ${completedNaLinha + i}`;

                checkboxItem.appendChild(checkbox);
                checkboxItem.appendChild(label);
                basesContainer.appendChild(checkboxItem);
            }

            // Seção para remover (apenas bases concluídas)
            for (let i = 1; i <= completedNaLinha; i++) {
                const checkboxItem = document.createElement("div");
                checkboxItem.className = "checkbox-item";
                checkboxItem.style.borderColor = "#ef4444";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = `remove-base-${tipo}-${i}`;
                checkbox.name = "removeBases";
                checkbox.value = `${tipo}-${i}`;
                checkbox.addEventListener("change", updateSelectAllRemoveState);

                const label = document.createElement("label");
                label.htmlFor = checkbox.id;
                label.textContent = `Base ${tipo} ${i} (concluída)`;
                label.style.color = "#6b7280";

                checkboxItem.appendChild(checkbox);
                checkboxItem.appendChild(label);
                removeBasesContainer.appendChild(checkboxItem);
            }
        }

        // Mostrar mensagens se não houver bases disponíveis
        if (basesContainer.children.length === 0) {
            basesContainer.innerHTML =
                '<p style="color: #6b7280; font-style: italic;">Todas as bases desta linha já estão concluídas.</p>';
        }

        if (removeBasesContainer.children.length === 0) {
            removeBasesContainer.innerHTML =
                '<p style="color: #6b7280; font-style: italic;">Nenhuma base concluída nesta linha.</p>';
        }
    }
}

// Event listeners
document.getElementById("updateForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const usinaSelect = document.getElementById("usinaSelect");
    const linhaSelect = document.getElementById("linhaSelect");
    const executionDateInput = document.getElementById("executionDate");
    const selectedUsina = usinaSelect.value;
    const selectedLinha = linhaSelect.value;
    const executionDate = executionDateInput.value;
    const normalizedExecutionDate = executionDate ? executionDate.trim() : "";
    const storedExecutionDate = getExecutionDateForLine(selectedUsina, selectedLinha);

    if (!selectedUsina) {
        showToast("Por favor, selecione uma usina.", "warning");
        return;
    }

    if (!selectedLinha) {
        showToast("Por favor, selecione uma linha.", "warning");
        return;
    }

    // Processar adições
    const addCheckboxes = document.querySelectorAll('input[name="addBases"]:checked');
    let additions = {};

    addCheckboxes.forEach((checkbox) => {
        const [tipo] = checkbox.value.split("-");
        additions[tipo] = (additions[tipo] || 0) + 1;
    });

    // Processar remoções
    const removeCheckboxes = document.querySelectorAll('input[name="removeBases"]:checked');
    let removals = {};

    removeCheckboxes.forEach((checkbox) => {
        const [tipo] = checkbox.value.split("-");
        removals[tipo] = (removals[tipo] || 0) + 1;
    });

    // Verificar se há algo para processar (bases ou data)
    const hasBaseChanges = Object.keys(additions).length > 0 || Object.keys(removals).length > 0;
    const hasDateChange = normalizedExecutionDate !== storedExecutionDate;

    if (!hasBaseChanges && !hasDateChange) {
        showToast(
            "Selecione pelo menos uma base para adicionar/remover ou defina uma data de execução.",
            "warning"
        );
        return;
    }

    // Atualizar progressData para a linha específica apenas se houver mudanças nas bases
    if (hasBaseChanges) {
        if (!progressData[selectedUsina]) {
            progressData[selectedUsina] = {};
        }
        if (!progressData[selectedUsina][selectedLinha]) {
            progressData[selectedUsina][selectedLinha] = {};
        }

        // Aplicar adições
        for (const tipo in additions) {
            const totalPermitido =
                projectData[selectedUsina].linhas[selectedLinha].bases[tipo] || 0;
            const atual = progressData[selectedUsina][selectedLinha][tipo] || 0;
            progressData[selectedUsina][selectedLinha][tipo] = Math.min(
                totalPermitido,
                atual + additions[tipo]
            );
        }

        // Aplicar remoções
        for (const tipo in removals) {
            const currentValue = progressData[selectedUsina][selectedLinha][tipo] || 0;
            progressData[selectedUsina][selectedLinha][tipo] = Math.max(
                0,
                currentValue - removals[tipo]
            );
        }
    }

    // Salvar data de execução se foi informada (independente de mudanças nas bases)
    if (hasDateChange) {
        if (!executionDates[selectedUsina]) {
            executionDates[selectedUsina] = {};
        }

        if (normalizedExecutionDate) {
            const testDate = new Date(normalizedExecutionDate);
            if (!isNaN(testDate.getTime())) {
                executionDates[selectedUsina][selectedLinha] = normalizedExecutionDate;
            } else {
                const fallbackDate = new Date().toISOString().split("T")[0];
                console.warn(
                    "Data inválida fornecida, usando data atual:",
                    normalizedExecutionDate
                );
                executionDates[selectedUsina][selectedLinha] = fallbackDate;
            }
        } else {
            delete executionDates[selectedUsina][selectedLinha];
            if (Object.keys(executionDates[selectedUsina]).length === 0) {
                delete executionDates[selectedUsina];
            }
        }

        executionDates = sanitizeExecutionDates(executionDates);
        localStorage.setItem("linhasVidaExecutionDates", JSON.stringify(executionDates));
    }

    saveProgressToStorage();
    saveProjectData(); // Salvar no Firebase também
    updateAllDisplays();
    closeModal();

    // Mostrar notificação de sucesso detalhada
    let message = `Progresso da ${projectData[selectedUsina].name} atualizado!\n\n`;

    if (Object.keys(additions).length > 0) {
        message += "✅ Bases concluídas:\n";
        for (const tipo in additions) {
            message += `  • ${additions[tipo]} base(s) tipo ${tipo}\n`;
        }
    }

    if (Object.keys(removals).length > 0) {
        if (Object.keys(additions).length > 0) message += "\n";
        message += "❌ Bases removidas:\n";
        for (const tipo in removals) {
            message += `  • ${removals[tipo]} base(s) tipo ${tipo}\n`;
        }
    }

    if (hasDateChange) {
        if (hasBaseChanges) message += "\n";

        if (normalizedExecutionDate) {
            const displayDate =
                formatExecutionDateForDisplay(normalizedExecutionDate) || normalizedExecutionDate;
            message += `📅 Data de execução: ${displayDate}`;
        } else if (storedExecutionDate) {
            message += "📅 Data de execução removida";
        }
    }

    showToast(message, "success");
});

// Fechar modal ao clicar fora
window.onclick = function (event) {
    const updateModal = document.getElementById("updateModal");

    if (event.target === updateModal) {
        closeModal();
    }
};

// Função para salvar no Firebase
async function saveProgressToFirebase() {
    if (!requireOnlineEdits()) return;

    try {
        executionDates = sanitizeExecutionDates(executionDates);
        progressData = sanitizeProgressData(progressData);
        const simplifiedData = {
            pimental: { progress: calculateProgressOfUsina("pimental") },
            "belo-monte": { progress: calculateProgressOfUsina("belo-monte") },
        };

        // Preparar teamConfig para Firebase (converter datas para strings de forma segura)
        const teamConfigForFirebase = {
            ...teamConfig,
            inicioTrabalhoBruto:
                teamConfig.inicioTrabalhoBruto &&
                teamConfig.inicioTrabalhoBruto instanceof Date &&
                !isNaN(teamConfig.inicioTrabalhoBruto)
                    ? teamConfig.inicioTrabalhoBruto.toISOString()
                    : new Date("2025-09-11").toISOString(),
            dataAtual:
                teamConfig.dataAtual &&
                teamConfig.dataAtual instanceof Date &&
                !isNaN(teamConfig.dataAtual)
                    ? teamConfig.dataAtual.toISOString()
                    : new Date().toISOString(),
        };

        const docRef = db.collection("projects").doc(currentProjectId);

        await docRef.set({
            // Dados detalhados (v2.0)
            progressData: progressData,
            lineStepsStatus: lineStepsStatus,
            executionDates: executionDates,
            teamConfig: teamConfigForFirebase,
            manualActiveUsina: manualActiveUsina,
            projectData: simplifiedData,
            builtInformations: builtInformations,

            // Compatibilidade com v1.0
            data: simplifiedData,

            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            version: "2.0",
        });

        // Registrar snapshot no histórico (mesmo payload principal)
        const historyRef = docRef.collection("history");
        await historyRef.add({
            progressData: progressData,
            lineStepsStatus: lineStepsStatus,
            executionDates: executionDates,
            teamConfig: teamConfigForFirebase,
            lineObservations: lineObservations,
            builtInformations: builtInformations,
            savedAt: firebase.firestore.FieldValue.serverTimestamp(),
            version: "2.0",
        });

        // Limpar versões antigas (manter 20)
        const oldSnapshots = await historyRef.orderBy("savedAt", "desc").limit(100).get();
        if (oldSnapshots.size > 20) {
            const batch = db.batch();
            oldSnapshots.docs.slice(20).forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        }
    } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        throw error;
    }
}

// Funções de persistência
function saveProgressToStorage(force = false) {
    if (!force && !allowOnlineEdits) return;
    progressData = sanitizeProgressData(progressData);
    localStorage.setItem("linhasVidaProgress", JSON.stringify(progressData));
    localStorage.setItem("linhasVidaLineSteps", JSON.stringify(lineStepsStatus));
    localStorage.setItem("linhasVidaExecutionDates", JSON.stringify(executionDates));
    localStorage.setItem("linhasVidaObservations", JSON.stringify(lineObservations));
    localStorage.setItem("linhasVidaBuiltInformations", JSON.stringify(builtInformations));
    // Salvar timestamp da última atualização
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

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

            // Aplicar dados carregados
            teamConfig = {
                ...teamConfig,
                ...loadedConfig,
            };

            // Converter datas se necessário
            if (loadedConfig.inicioTrabalhoBruto) {
                try {
                    teamConfig.inicioTrabalhoBruto = new Date(loadedConfig.inicioTrabalhoBruto);
                } catch {
                    teamConfig.inicioTrabalhoBruto = new Date("2025-09-11");
                }
            }

            if (loadedConfig.dataAtual) {
                try {
                    teamConfig.dataAtual = new Date(loadedConfig.dataAtual);
                } catch {
                    teamConfig.dataAtual = new Date();
                }
            }
        } catch (error) {
            console.error("Erro ao carregar config:", error);
        }
    }

    // Garantir validação final sempre
    validateAndFixTeamConfigDates();

    // Salvar configuração atualizada para garantir persistência
    saveTeamConfigToStorage();
}

function saveLineStepsToStorage(force = false) {
    if (!force && !allowOnlineEdits) return;
    localStorage.setItem("linhasVidaLineSteps", JSON.stringify(lineStepsStatus));
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

function loadLineStepsFromStorage() {
    const stored = localStorage.getItem("linhasVidaLineSteps");
    if (stored) {
        lineStepsStatus = JSON.parse(stored);
    }
}

function loadProgressFromStorage() {
    const stored = localStorage.getItem("linhasVidaProgress");
    if (stored) {
        const loadedData = JSON.parse(stored);
        // Check if data is in old format (type-based) and migrate to new format (line-based)
        progressData = migrateProgressDataIfNeeded(loadedData);
    }

    progressData = sanitizeProgressData(progressData);

    // Carregar status das etapas
    const storedSteps = localStorage.getItem("linhasVidaLineSteps");
    if (storedSteps) {
        try {
            lineStepsStatus = JSON.parse(storedSteps);
        } catch (error) {
            console.warn("Erro ao carregar etapas do storage:", error);
        }
    }

    // Carregar datas de execução
    const storedDates = localStorage.getItem("linhasVidaExecutionDates");
    if (storedDates) {
        try {
            const parsedDates = JSON.parse(storedDates);
            executionDates = sanitizeExecutionDates(parsedDates);
        } catch (error) {
            console.warn("Erro ao carregar datas de execução do storage, limpando...", error);
            executionDates = {};
        }
    }

    // Carregar observações
    const storedObservations = localStorage.getItem("linhasVidaObservations");
    if (storedObservations) {
        try {
            lineObservations = JSON.parse(storedObservations);
        } catch (error) {
            console.warn("Erro ao carregar observações do storage:", error);
        }
    }

    // Carregar informações para Built
    const storedBuilt = localStorage.getItem("linhasVidaBuiltInformations");
    if (storedBuilt) {
        try {
            builtInformations = JSON.parse(storedBuilt);
        } catch (error) {
            console.warn("Erro ao carregar built informations do storage:", error);
        }
    }
}

function migrateProgressDataIfNeeded(data) {
    // Check if data is already in new format (has line numbers as keys)
    for (const usina in data) {
        if (data[usina]) {
            const firstKey = Object.keys(data[usina])[0];
            // If first key looks like a line number (01, 02, etc.), it's already new format
            if (firstKey && firstKey.match(/^\d+$/)) {
                return data; // Already migrated
            }
            // If first key is a single letter (A, B, C, etc.), it's old format - needs migration
            if (firstKey && firstKey.match(/^[A-Z]$/)) {
                console.log("Migrating old progress data format to line-specific format");
                // Reset to new structure - old data can't be accurately migrated since it wasn't line-specific
                return {
                    pimental: {
                        "01": { C: 0, E: 0, K: 0 },
                        "02": { C: 0, G: 0, K: 0 },
                        "03": { D: 0, F: 0, K: 0 },
                        "04": { D: 0, H: 0, K: 0 },
                        "05": { A: 0, B: 0, K: 0 },
                        18: { K: 0 },
                    },
                    "belo-monte": {
                        "01": { C: 0, E: 0, K: 0 },
                        "02": { C: 0, E: 0, K: 0 },
                        "03": { C: 0, E: 0, K: 0 },
                        "04": { C: 0, E: 0, K: 0 },
                        "05": { C: 0, E: 0, K: 0 },
                        "06": { C: 0, E: 0, K: 0 },
                        "07": { C: 0, E: 0, K: 0 },
                        "08": { C: 0, E: 0, K: 0 },
                        "09": { C: 0, K: 0 },
                        10: { C: 0, F: 0, K: 0 },
                        11: { C: 0, F: 0, K: 0 },
                        12: { C: 0, F: 0, K: 0 },
                        13: { C: 0, F: 0, K: 0 },
                        14: { C: 0, F: 0, K: 0 },
                        15: { C: 0, F: 0, K: 0 },
                        16: { C: 0, F: 0, K: 0 },
                        17: { C: 0, F: 0, K: 0 },
                        18: { C: 0, F: 0, K: 0 },
                        19: { A: 0, B: 0, J: 0 },
                        71: { A: 0, B: 0, J: 0 },
                    },
                };
            }
        }
    }
    return data; // Unknown format, return as is
}

function clearAllProgress() {
    if (!isAuthenticated) {
        pendingAction = clearAllProgress;
        showPasswordModal();
        return;
    }

    const confirmMessage =
        "ATENÇÃO: Esta ação irá apagar TODO o progresso de ambas as usinas.\n\nTem certeza que deseja continuar?\n\nEsta ação não pode ser desfeita.";

    if (confirm(confirmMessage)) {
        // Resetar progressData para valores zerados
        progressData = {
            pimental: {
                A: 0,
                B: 0,
                C: 0,
                D: 0,
                E: 0,
                F: 0,
                G: 0,
                H: 0,
                J: 0,
                K: 0,
            },
            "belo-monte": {
                A: 0,
                B: 0,
                C: 0,
                D: 0,
                E: 0,
                F: 0,
                G: 0,
                H: 0,
                J: 0,
                K: 0,
            },
        };

        saveProgressToStorage();
        saveProjectData(); // Salvar no Firebase também
        updateAllDisplays();

        showToast("Todo o progresso foi limpo com sucesso!", "success");
    }
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

    if (file.type !== "application/json") {
        showToast("Por favor, selecione um arquivo JSON válido.", "error");
        return;
    }

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

            // Confirmar importação
            const camposDetalhados =
                [
                    hasLineSteps ? "lineStepsStatus" : null,
                    hasExecutionDates ? "executionDates" : null,
                    hasObservations ? "lineObservations" : null,
                    hasBuiltInfo ? "builtInformations" : null,
                ]
                    .filter(Boolean)
                    .join(", ") || "apenas progressData/teamConfig";

            // Confirmar importação
            const confirmMsg =
                `Importar backup (v${backupVersion}) de ${new Date(importData.timestamp).toLocaleString("pt-BR")}?\n\n` +
                `Bases concluídas no backup: ${importData.metadata?.completedBases ?? "N/A"}\n` +
                `Progresso: ${importData.metadata?.progressPercentage?.toFixed?.(1) ?? "N/A"}%\n` +
                `Campos disponíveis: ${camposDetalhados}\n\n` +
                `ATENÇÃO: Isso substituirá os dados locais e salvará no Firebase.`;

            if (!confirm(confirmMsg)) {
                return;
            }

            // Aplicar dados importados
            const sanitizedProgress = sanitizeProgressData(importData.progressData);
            progressData = sanitizedProgress;

            // Atualizar lineStepsStatus se estiver no backup
            lineStepsStatus = ensureLineStepsStructure(
                hasLineSteps ? importData.lineStepsStatus : lineStepsStatus,
                sanitizedProgress
            );

            // Atualizar datas de execução se disponíveis
            if (hasExecutionDates) {
                executionDates = sanitizeExecutionDates(importData.executionDates);
            }

            // Atualizar observações e built se disponíveis
            lineObservations = ensureUsinaBuckets(
                hasObservations ? importData.lineObservations : lineObservations
            );
            builtInformations = ensureUsinaBuckets(
                hasBuiltInfo ? importData.builtInformations : builtInformations
            );

            // Carregar usina ativa se existir no backup
            if (importData.manualActiveUsina) {
                manualActiveUsina = importData.manualActiveUsina;
                localStorage.setItem("manualActiveUsina", manualActiveUsina);
            }

            // Atualizar teamConfig se disponível
            if (importData.teamConfig) {
                // Manter datas atuais, mas permitir outras configurações
                const currentDate = teamConfig.dataAtual;
                Object.assign(teamConfig, importData.teamConfig);
                teamConfig.dataAtual = currentDate;
            }

            // Salvar no localStorage
            saveProgressToStorage();

            // Salvar no Firebase também
            saveProjectData();

            // Atualizar interface
            updateAllDisplays();

            showToast("Dados importados com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao importar dados:", error);
            showToast("Erro ao importar arquivo. Verifique se é um backup válido.", "error");
        }
    };

    reader.readAsText(file);

    // Limpar input para permitir reimportação do mesmo arquivo
    event.target.value = "";
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
            // Oferecer criar snapshot da versão atual
            const createSnapshot = confirm(
                "Nenhuma versão anterior encontrada no histórico.\n\n" +
                    "Deseja criar um snapshot da versão atual agora?\n\n" +
                    "Isso permitirá que você tenha um ponto de restauração."
            );

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
            versionCard.style.cssText = `
                        border: 2px solid var(--border-gray);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        background-color: ${index === 0 ? "var(--light-blue)" : "white"};
                    `;
            versionCard.onmouseover = () => {
                versionCard.style.borderColor = "var(--primary-blue)";
                versionCard.style.backgroundColor = "var(--light-blue)";
            };
            versionCard.onmouseout = () => {
                versionCard.style.borderColor = "var(--border-gray)";
                versionCard.style.backgroundColor = index === 0 ? "var(--light-blue)" : "white";
            };

            versionCard.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold; color: var(--primary-blue); margin-bottom: 5px;">
                                    ${index === 0 ? "🌟 Versão Mais Recente" : `📦 Versão ${index + 1}`}
                                </div>
                                <div style="color: var(--medium-gray); font-size: 0.9rem;">
                                    📅 ${formattedDate}
                                </div>
                                <div style="color: var(--dark-gray); font-size: 0.9rem; margin-top: 5px;">
                                    📊 Progresso: ${progress}%
                                </div>
                                <div style="color: var(--medium-gray); font-size: 0.85rem; margin-top: 3px;">
                                    • ${completedBases}/${totalBases} bases • ${completedCableSteps}/${totalCableSteps} etapas
                                </div>
                            </div>
                            <button class="btn btn-primary" onclick="restoreVersion('${doc.id}'); event.stopPropagation();">
                                <i class="fas fa-undo"></i> Restaurar
                            </button>
                        </div>
                    `;

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
    const confirmMessage =
        "Deseja restaurar esta versão?\n\n" +
        "ATENÇÃO: Isso irá substituir todos os dados atuais.\n\n" +
        "Esta ação não pode ser desfeita.";

    if (!confirm(confirmMessage)) {
        return;
    }

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
            progressData = sanitizeProgressData(versionData.progressData);
            console.log("✓ progressData restaurado");
        }
        if (versionData.lineStepsStatus) {
            lineStepsStatus = versionData.lineStepsStatus;
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

        showToast(`Versão restaurada com sucesso!\nData da versão: ${timestamp}`, "success");
    } catch (error) {
        console.error("Erro ao restaurar versão:", error);
        showToast("Erro ao restaurar versão.", "error");
    }
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

    // Análise por tipo de base
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. ANÁLISE POR TIPO DE BASE", 20, currentY);
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
    doc.text("4. DETALHAMENTO LINHA POR LINHA", 20, currentY);
    currentY += 12;

    doc.setFontSize(14);
    doc.text("4.1 Pimental - Detalhamento", 25, currentY);
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
    doc.text("4.2 Belo Monte - Detalhamento", 25, currentY);
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
    // Seção 4: Informações para as Built
    checkPageBreak(80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. INFORMAÇÕES PARA AS BUILT", 20, currentY);
    currentY += 12;

    // Belo Monte Built
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("4.1 Belo Monte", 25, currentY);
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
    doc.text("4.2 Pimental", 25, currentY);
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
    doc.text("4.3 Oficina", 25, currentY);
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

    doc.text("6. OBSERVAÇÕES E PRÓXIMOS PASSOS", 20, currentY);
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
            const storedDate = getExecutionDateForLine(usinaKey, linha);
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

    // Adicionar planilha de resumo
    const resumoData = [
        ["RELATÓRIO - LINHAS DE VIDA"],
        ["Thommen Engenharia • Norte Energia"],
        [
            `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
        ],
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
    openObservationModal,
    saveObservation,
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
    exportProgressData,
    importProgressData,
    forceRestoreFromFirebase,
    restoreVersion,
    exportToPDF,
    exportToExcel,
};

Object.assign(window, exportedFunctions);

// Inicializar aplicação quando a página carregar
window.addEventListener("load", function () {
    updateAllDisplays();
});
