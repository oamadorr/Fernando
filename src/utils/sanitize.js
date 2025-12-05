import state from "../state.js";

const { projectData } = state;

function normalizeDate(rawValue, fallbackDate) {
    if (!rawValue) return new Date(fallbackDate);

    if (typeof rawValue?.toDate === "function") {
        const parsed = rawValue.toDate();
        return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : new Date(fallbackDate);
    }

    const parsed = rawValue instanceof Date ? rawValue : new Date(rawValue);
    return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : new Date(fallbackDate);
}

function getBuiltPairCount(usinaKey, linhaKey, projectDataOverride = projectData) {
    const linha = String(linhaKey);

    if (usinaKey === "pimental") {
        if (linha === "01" || linha === "03") return 12;
        if (linha === "02" || linha === "04") return 13;
        return 2; // transversais 05-18
    }

    if (usinaKey === "belo-monte") {
        if (linha === "01" || linha === "10") return 11;
        if (
            [
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "11",
                "12",
                "13",
                "14",
                "15",
                "16",
                "17",
            ].includes(linha)
        ) {
            return 12;
        }
        if (linha === "09" || linha === "18") return 7;
        return 4; // transversais 19-71
    }

    if (usinaKey === "oficina") {
        if (linha === "73") return 7;
        return 1; // 72 e 74
    }

    // Default minimal structure
    return 1;
}

function sanitizeBuiltInformations(raw, projectDataOverride = projectData) {
    const sanitized = {};

    for (const usinaKey of Object.keys(projectDataOverride)) {
        sanitized[usinaKey] = {};

        const linhas = projectDataOverride[usinaKey].linhas;
        for (const linhaKey of Object.keys(linhas)) {
            const pairCount = getBuiltPairCount(usinaKey, linhaKey, projectDataOverride);
            const rawLine = raw?.[usinaKey]?.[linhaKey] || {};

            sanitized[usinaKey][linhaKey] = {};
            for (let i = 1; i <= pairCount; i++) {
                const pairKey = `${String(i).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                sanitized[usinaKey][linhaKey][pairKey] = rawLine[pairKey] || "";
            }
        }
    }

    return sanitized;
}

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

function sanitizeTeamConfig(rawConfig = {}) {
    const defaults = {
        pessoas: 4,
        horasPorDia: 6,
        aproveitamento: 0.8,
        inicioTrabalhoBruto: new Date("2025-09-11"),
        dataAtual: new Date(),
    };

    const merged = {
        ...defaults,
        ...(rawConfig || {}),
    };

    const inicioTrabalhoBruto = normalizeDate(merged.inicioTrabalhoBruto, defaults.inicioTrabalhoBruto);
    const dataAtual = normalizeDate(merged.dataAtual, new Date());

    const pessoas = typeof merged.pessoas === "number" && merged.pessoas > 0 ? merged.pessoas : defaults.pessoas;
    const horasPorDia =
        typeof merged.horasPorDia === "number" && merged.horasPorDia > 0 ? merged.horasPorDia : defaults.horasPorDia;
    const aproveitamento =
        typeof merged.aproveitamento === "number" &&
        merged.aproveitamento > 0 &&
        merged.aproveitamento <= 1
            ? merged.aproveitamento
            : defaults.aproveitamento;

    return {
        pessoas,
        horasPorDia,
        aproveitamento,
        inicioTrabalhoBruto,
        dataAtual,
    };
}

export {
    sanitizeProgressData,
    normalizeExecutionDateValue,
    getExecutionDateForLine,
    sanitizeExecutionDates,
    formatExecutionDateForDisplay,
    sanitizeBuiltInformations,
    getBuiltPairCount,
    sanitizeTeamConfig,
};
