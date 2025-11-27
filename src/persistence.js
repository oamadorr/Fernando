import state, {
    setBuiltInformations,
    setExecutionDates,
    setLineObservations,
    setLineStepsStatus,
    setProgressData,
} from "./state.js";
import { sanitizeExecutionDates, sanitizeProgressData } from "./utils/sanitize.js";

let context = {
    getAllowOnlineEdits: () => state.allowOnlineEdits,
    getProgressData: () => state.progressData,
    getLineStepsStatus: () => state.lineStepsStatus,
    getExecutionDates: () => state.executionDates,
    getLineObservations: () => state.lineObservations,
    getBuiltInformations: () => state.builtInformations,
    getProjectData: () => state.projectData,
    setProgressData,
    setLineStepsStatus,
    setExecutionDates,
    setLineObservations,
    setBuiltInformations,
};

function configurePersistence(customContext = {}) {
    context = {
        ...context,
        ...customContext,
    };
}

function migrateProgressDataIfNeeded(data) {
    for (const usina in data) {
        if (data[usina]) {
            const firstKey = Object.keys(data[usina])[0];
            if (firstKey && firstKey.match(/^\d+$/)) {
                return data;
            }
            if (firstKey && firstKey.match(/^[A-Z]$/)) {
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
    return data;
}

function saveProgressToStorage(force = false) {
    if (!force && !context.getAllowOnlineEdits()) return;
    const sanitizedProgress = sanitizeProgressData(
        context.getProgressData(),
        context.getProjectData()
    );
    context.setProgressData(sanitizedProgress);
    localStorage.setItem("linhasVidaProgress", JSON.stringify(sanitizedProgress));
    localStorage.setItem("linhasVidaLineSteps", JSON.stringify(context.getLineStepsStatus()));
    localStorage.setItem("linhasVidaExecutionDates", JSON.stringify(context.getExecutionDates()));
    localStorage.setItem("linhasVidaObservations", JSON.stringify(context.getLineObservations()));
    localStorage.setItem("linhasVidaBuiltInformations", JSON.stringify(context.getBuiltInformations()));
    localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
}

function loadLineStepsFromStorage() {
    const stored = localStorage.getItem("linhasVidaLineSteps");
    if (stored) {
        context.setLineStepsStatus(JSON.parse(stored));
    }
}

function loadProgressFromStorage() {
    const stored = localStorage.getItem("linhasVidaProgress");
    if (stored) {
        const loadedData = JSON.parse(stored);
        context.setProgressData(migrateProgressDataIfNeeded(loadedData));
    }
    context.setProgressData(
        sanitizeProgressData(context.getProgressData(), context.getProjectData())
    );

    const storedSteps = localStorage.getItem("linhasVidaLineSteps");
    if (storedSteps) {
        try {
            context.setLineStepsStatus(JSON.parse(storedSteps));
        } catch (error) {
            console.warn("Erro ao carregar etapas do storage:", error);
        }
    }

    const storedDates = localStorage.getItem("linhasVidaExecutionDates");
    if (storedDates) {
        try {
            const parsedDates = JSON.parse(storedDates);
            context.setExecutionDates(sanitizeExecutionDates(parsedDates));
        } catch (error) {
            console.warn("Erro ao carregar datas de execução do storage, limpando...", error);
            context.setExecutionDates({});
        }
    }

    const storedObservations = localStorage.getItem("linhasVidaObservations");
    if (storedObservations) {
        try {
            context.setLineObservations(JSON.parse(storedObservations));
        } catch (error) {
            console.warn("Erro ao carregar observações do storage:", error);
        }
    }

    const storedBuilt = localStorage.getItem("linhasVidaBuiltInformations");
    if (storedBuilt) {
        try {
            context.setBuiltInformations(JSON.parse(storedBuilt));
        } catch (error) {
            console.warn("Erro ao carregar built informations do storage:", error);
        }
    }
}

export {
    configurePersistence,
    migrateProgressDataIfNeeded,
    saveProgressToStorage,
    loadProgressFromStorage,
    loadLineStepsFromStorage,
};
