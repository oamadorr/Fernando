import state, {
    setAllowOnlineEdits,
    setBuiltInformations,
    setDb,
    setExecutionDates,
    setLineObservations,
    setLineStepsStatus,
    setManualActiveUsina,
    setProgressData,
    setTeamConfig,
} from "./state.js";
import {
    sanitizeProgressData,
    sanitizeExecutionDates,
    sanitizeBuiltInformations,
    sanitizeTeamConfig,
} from "./utils/sanitize.js";
import { migrateProgressDataIfNeeded } from "./persistence.js";

function initializeFirebase(onReady, onFallback) {
    try {
        firebase.initializeApp(state.firebaseConfig);
        setDb(firebase.firestore());
        onReady?.();
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        setAllowOnlineEdits(false);
        onFallback?.(error);
    }
}

function applyTeamConfigFromFirebase(teamConfig, data) {
    const mergedConfig = {
        ...teamConfig,
        ...(data.teamConfig || {}),
    };
    const sanitizedConfig = sanitizeTeamConfig(mergedConfig);
    setTeamConfig(sanitizedConfig);
    return sanitizedConfig;
}

function applyFirebaseDataSnapshot(doc, opts) {
    const data = doc.data();
    const {
        isReadOnlyMode,
        progressData,
        lineStepsStatus: _lineStepsStatus,
        executionDates: _executionDates,
        teamConfig,
        manualActiveUsina: _manualActiveUsina,
        loadBuiltFromFirebase,
    } = opts;

    if (isReadOnlyMode) {
        setProgressData(
            data.progressData ? sanitizeProgressData(data.progressData) : sanitizeProgressData({})
        );
        if (data.lineStepsStatus) {
            setLineStepsStatus(data.lineStepsStatus);
        }
        if (data.executionDates) {
            setExecutionDates(sanitizeExecutionDates(data.executionDates));
        }
        if (data.teamConfig) {
            applyTeamConfigFromFirebase(teamConfig, data);
        }
        if (data.manualActiveUsina) {
            setManualActiveUsina(data.manualActiveUsina);
        }
        loadBuiltFromFirebase(doc);
        return;
    }

    if (data.version === "1.0" && data.data) {
        if (state.projectData.pimental && state.projectData["belo-monte"]) {
            if (!progressData.pimental) {
                setProgressData({
                    ...progressData,
                    pimental: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, J: 0, K: 0 },
                });
            }
            if (!progressData["belo-monte"]) {
                const cloned = { ...progressData, "belo-monte": {} };
                for (const linha in state.projectData["belo-monte"].linhas) {
                    cloned["belo-monte"][linha] = {};
                    for (const tipo in state.projectData["belo-monte"].linhas[linha].bases) {
                        cloned["belo-monte"][linha][tipo] = 0;
                    }
                }
                setProgressData(cloned);
            }
        }
        return;
    }

    if (data.progressData) {
        setProgressData(sanitizeProgressData(data.progressData));
        if (data.lineStepsStatus) setLineStepsStatus(data.lineStepsStatus);
        if (data.executionDates) setExecutionDates(sanitizeExecutionDates(data.executionDates));

        if (data.teamConfig) {
            applyTeamConfigFromFirebase(teamConfig, data);
        }

        if (data.manualActiveUsina) {
            setManualActiveUsina(data.manualActiveUsina);
            localStorage.setItem("manualActiveUsina", data.manualActiveUsina);
        }

        if (data.builtInformations) {
            setBuiltInformations(sanitizeBuiltInformations(data.builtInformations));
        }
    }
}

async function detectAndResolveDataConflicts(db, currentProjectId) {
    if (!db || !currentProjectId) return false;

    try {
        const localProgress = localStorage.getItem("linhasVidaProgress");
        const localSteps = localStorage.getItem("linhasVidaLineSteps");
        const localTeamConfig = localStorage.getItem("linhasVidaTeamConfig");
        const localExecutionRaw = localStorage.getItem("linhasVidaExecutionDates");

        if (!localProgress && !localSteps && !localTeamConfig) {
            return false;
        }

        const doc = await db.collection("projects").doc(currentProjectId).get();

        if (!doc.exists) {
            await saveProjectData(db, currentProjectId);
            return true;
        }

        const firebaseData = doc.data();
        const firebaseUpdated = firebaseData.updatedAt
            ? firebaseData.updatedAt.toDate()
            : new Date(0);

        let localProgressSanitized = sanitizeProgressData(state.progressData);
        let localExecutionSanitized = sanitizeExecutionDates(state.executionDates);
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

        const localTimestamp = localStorage.getItem("linhasVidaLastUpdate");
        const localUpdated = localTimestamp ? new Date(localTimestamp) : new Date(0);

        const timeDiff = Math.abs(firebaseUpdated - localUpdated);
        const significantDiff = timeDiff > 5 * 60 * 1000;

        if (!hasSanitizedDiff) {
            return false;
        }

        if (localUpdated > firebaseUpdated && significantDiff) {
            await saveProjectData(db, currentProjectId);
            return true;
        }

        clearLocalData();
        return false;
    } catch (error) {
        console.error("Erro ao detectar conflitos:", error);
        return false;
    }
}

function clearLocalData() {
    localStorage.removeItem("linhasVidaProgress");
    localStorage.removeItem("linhasVidaObservations");
    localStorage.removeItem("linhasVidaTeamConfig");
    localStorage.removeItem("linhasVidaLineSteps");
    localStorage.removeItem("linhasVidaExecutionDates");
    localStorage.removeItem("linhasVidaLastUpdate");
    console.log("Cache local limpo");
}

async function saveProjectData(db, currentProjectId, options = {}) {
    const {
        projectDataPartial,
        historyLimit = 20,
        onStatusChange = () => {},
        onConflict = () => {},
    } = options;

    if (!db || !currentProjectId || !navigator.onLine) {
        onStatusChange("offline");
        setAllowOnlineEdits(false);
        return;
    }

    onStatusChange("saving");

    try {
        const sanitizedExec = sanitizeExecutionDates(state.executionDates);
        const sanitizedProgress = sanitizeProgressData(state.progressData);
        const sanitizedTeamConfig = sanitizeTeamConfig(state.teamConfig);
        setExecutionDates(sanitizedExec);
        setProgressData(sanitizedProgress);
        setTeamConfig(sanitizedTeamConfig);

        const simplifiedData =
            projectDataPartial ||
            {
                pimental: { progress: 0 },
                "belo-monte": { progress: 0 },
            };

        await db.collection("projects").doc(currentProjectId).set({
            progressData: sanitizedProgress,
            lineStepsStatus: state.lineStepsStatus,
            executionDates: sanitizedExec,
            teamConfig: sanitizedTeamConfig,
            manualActiveUsina: state.manualActiveUsina,
            projectData: simplifiedData,
            lineObservations: state.lineObservations,
            builtInformations: state.builtInformations,
            data: simplifiedData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            version: "2.0",
        });

        const historyRef = db.collection("projects").doc(currentProjectId).collection("history");
        await historyRef.add({
            progressData: sanitizedProgress,
            lineStepsStatus: state.lineStepsStatus,
            executionDates: sanitizedExec,
            teamConfig: sanitizedTeamConfig,
            lineObservations: state.lineObservations,
            builtInformations: state.builtInformations,
            savedAt: firebase.firestore.FieldValue.serverTimestamp(),
            version: "2.0",
        });

        const oldSnapshots = await historyRef.orderBy("savedAt", "desc").limit(100).get();
        if (oldSnapshots.size > historyLimit) {
            const batch = db.batch();
            oldSnapshots.docs.slice(historyLimit).forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        onStatusChange("online");
    } catch (error) {
        onConflict(error);
    }
}

function setupRealtimeListener(db, currentProjectId, opts) {
    const { onChange } = opts;
    if (!db || !currentProjectId) return null;

    return db
        .collection("projects")
        .doc(currentProjectId)
        .onSnapshot(
            { includeMetadataChanges: false },
            (doc) => {
                if (document.visibilityState === "hidden" || document.hidden) {
                    return;
                }

                if (doc.exists && !doc.metadata.fromCache) {
                    const data = doc.data();
                    const newProgressData = data.progressData
                        ? sanitizeProgressData(data.progressData)
                        : null;
                    const newLineStepsStatus = data.lineStepsStatus || {};
                    const newExecutionDates = sanitizeExecutionDates(data.executionDates || {});
                    const newLineObservations = data.lineObservations || {};
                    const newBuiltInformations = sanitizeBuiltInformations(data.builtInformations || {});
                    const newTeamConfig = data.teamConfig || null;

                    let hasChanges = false;
                    if (
                        newProgressData &&
                        JSON.stringify(newProgressData) !== JSON.stringify(state.progressData)
                    ) {
                        setProgressData(newProgressData);
                        hasChanges = true;
                    }
                    if (
                        JSON.stringify(newLineStepsStatus) !== JSON.stringify(state.lineStepsStatus)
                    ) {
                        setLineStepsStatus(newLineStepsStatus);
                        hasChanges = true;
                    }
                    if (JSON.stringify(newExecutionDates) !== JSON.stringify(state.executionDates)) {
                        setExecutionDates(newExecutionDates);
                        hasChanges = true;
                    }
                    if (
                        JSON.stringify(newLineObservations) !==
                        JSON.stringify(state.lineObservations)
                    ) {
                        setLineObservations(newLineObservations);
                        hasChanges = true;
                    }
                    if (
                        JSON.stringify(newBuiltInformations) !==
                        JSON.stringify(state.builtInformations)
                    ) {
                        setBuiltInformations(newBuiltInformations);
                        hasChanges = true;
                    }

                    if (newTeamConfig && JSON.stringify(newTeamConfig) !== JSON.stringify(state.teamConfig)) {
                        const sanitizedTeamConfig = sanitizeTeamConfig({
                            ...state.teamConfig,
                            ...newTeamConfig,
                        });
                        setTeamConfig(sanitizedTeamConfig);
                        hasChanges = true;
                    }

                    if (
                        data.manualActiveUsina !== undefined &&
                        data.manualActiveUsina !== state.manualActiveUsina
                    ) {
                        setManualActiveUsina(data.manualActiveUsina);
                        localStorage.setItem("manualActiveUsina", state.manualActiveUsina);
                        hasChanges = true;
                    }

                    if (hasChanges) {
                        onChange?.();
                    }
                }
            },
            (error) => {
                console.error("Erro no listener Firebase:", error);
            }
        );
}

export {
    initializeFirebase,
    applyFirebaseDataSnapshot,
    detectAndResolveDataConflicts,
    saveProjectData,
    setupRealtimeListener,
    clearLocalData,
};
