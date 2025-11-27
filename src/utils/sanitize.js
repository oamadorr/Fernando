import state from "../state.js";

const { projectData } = state;

function sanitizeProgressData(raw, projectDataOverride = projectData) {
    const sanitized = {};
    for (const usinaKey of Object.keys(projectDataOverride)) {
        sanitized[usinaKey] = {};
        const linhas = projectDataOverride[usinaKey].linhas;
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

function normalizeExecutionDateValue(rawValue) {
    if (!rawValue) return "";

    if (rawValue instanceof Date) {
        return !isNaN(rawValue) ? rawValue.toISOString().split("T")[0] : "";
    }

    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (!trimmed) return "";

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

function getExecutionDateForLine(usinaKey, linhaKey, executionDates = state.executionDates) {
    if (!executionDates[usinaKey]) return "";
    const rawValue = executionDates[usinaKey][linhaKey];
    return normalizeExecutionDateValue(rawValue);
}

function sanitizeExecutionDates(raw) {
    const sanitized = {};
    if (!raw || typeof raw !== "object") return sanitized;

    for (const usinaKey in raw) {
        const linhas = raw[usinaKey];
        if (!linhas || typeof linhas !== "object") continue;

        for (const linhaKey in linhas) {
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

export {
    sanitizeProgressData,
    normalizeExecutionDateValue,
    getExecutionDateForLine,
    sanitizeExecutionDates,
    formatExecutionDateForDisplay,
};
