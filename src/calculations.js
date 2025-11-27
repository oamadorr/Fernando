import state from "./state.js";

const { projectData } = state;

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
    for (const usina in state.progressData) {
        for (const linha in state.progressData[usina]) {
            for (const tipo in state.progressData[usina][linha]) {
                completed += state.progressData[usina][linha][tipo];
            }
        }
    }
    return completed;
}

function calculateCompletedBasesOfUsina(usinaKey) {
    let completed = 0;
    if (state.progressData[usinaKey]) {
        for (const linha in state.progressData[usinaKey]) {
            for (const tipo in state.progressData[usinaKey][linha]) {
                completed += state.progressData[usinaKey][linha][tipo];
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
    for (const usina in state.progressData) {
        if (usinaFilter && usina !== usinaFilter) continue;
        for (const linha in state.progressData[usina]) {
            if (state.progressData[usina][linha] && state.progressData[usina][linha][tipo]) {
                completed += state.progressData[usina][linha][tipo];
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

function calculateCableStepsCompleted() {
    let completed = 0;
    let lineCount = 0;
    for (const usina in state.lineStepsStatus) {
        for (const linha in state.lineStepsStatus[usina]) {
            lineCount++;
            const steps = state.lineStepsStatus[usina][linha];
            if (steps.passagemCabo) completed++;
            if (steps.crimpagemCabo) completed++;
            if (steps.afericaoCrimpagem) completed++;
            if (steps.tensionamentoCabo) completed++;
        }
    }
    console.log("🔧 calculateCableStepsCompleted:", {
        totalLines: lineCount,
        completedSteps: completed,
        lineStepsStatus: state.lineStepsStatus,
    });
    return completed;
}

function calculateCableStepsCompletedOfUsina(usinaKey) {
    let completed = 0;
    if (state.lineStepsStatus[usinaKey]) {
        for (const linha in state.lineStepsStatus[usinaKey]) {
            const steps = state.lineStepsStatus[usinaKey][linha];
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
    if (state.lineStepsStatus[usinaKey] && state.lineStepsStatus[usinaKey][linha]) {
        const steps = state.lineStepsStatus[usinaKey][linha];
        if (steps.passagemCabo) completed++;
        if (steps.crimpagemCabo) completed++;
        if (steps.afericaoCrimpagem) completed++;
        if (steps.tensionamentoCabo) completed++;
    }
    return completed;
}

function calculateLineProgress(usinaKey, linha) {
    if (!projectData[usinaKey] || !projectData[usinaKey].linhas[linha]) {
        return 0;
    }

    const linhaData = projectData[usinaKey].linhas[linha];
    let totalBases = 0;
    let completedBases = 0;

    for (const tipo in linhaData.bases) {
        totalBases += linhaData.bases[tipo];
    }

    if (state.progressData[usinaKey] && state.progressData[usinaKey][linha]) {
        for (const tipo in state.progressData[usinaKey][linha]) {
            completedBases += state.progressData[usinaKey][linha][tipo] || 0;
        }
    }

    const completedCableSteps = calculateCableStepsCompletedOfLine(usinaKey, linha);
    const totalCableSteps = 4; // 4 etapas por linha

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;

    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return Math.min(progress, 100);
}

function calculateProgress() {
    const totalBases = calculateTotalBases();
    const completedBases = calculateCompletedBases();
    const totalCableSteps = calculateTotalCableSteps();
    const completedCableSteps = calculateCableStepsCompleted();

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;

    const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

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
    const inicio = state.teamConfig.inicioTrabalhoBruto;

    if (!inicio || !(inicio instanceof Date)) {
        return 0;
    }

    const hoje = new Date();
    const horaAtual = hoje.getHours();

    let dataFinal = new Date(hoje);
    if (horaAtual < 18) {
        dataFinal.setDate(dataFinal.getDate() - 1);
    }

    let workDays = 0;
    const currentDate = new Date(inicio);

    while (currentDate <= dataFinal) {
        const weekDay = currentDate.getDay();
        if (weekDay >= 1 && weekDay <= 5) {
            workDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDays;
}

function calculateWorkedHours() {
    const workDays = calculateWorkDays();
    const hoursPerDay = 6 * 0.8;
    return workDays * hoursPerDay;
}

function calculateProgressOfUsina(usinaKey) {
    const totalBases = calculateTotalBasesOfUsina(usinaKey);
    const completedBases = calculateCompletedBasesOfUsina(usinaKey);
    const totalCableSteps = calculateTotalCableStepsOfUsina(usinaKey);
    const completedCableSteps = calculateCableStepsCompletedOfUsina(usinaKey);

    const totalItems = totalBases + totalCableSteps;
    const completedItems = completedBases + completedCableSteps;

    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
}

function calculateUsinaStats(usinaKey) {
    const usina = projectData[usinaKey];
    let totalBases = 0;
    let totalMetros = 0;
    let completedBases = 0;

    for (const linha in usina.linhas) {
        const linhaData = usina.linhas[linha];
        totalMetros += linhaData.metragem;

        for (const tipo in linhaData.bases) {
            totalBases += linhaData.bases[tipo];
        }
    }

    if (state.progressData[usinaKey]) {
        for (const linha in state.progressData[usinaKey]) {
            for (const tipo in state.progressData[usinaKey][linha]) {
                completedBases += state.progressData[usinaKey][linha][tipo] || 0;
            }
        }
    }

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

export {
    calculateCableStepsCompleted,
    calculateCableStepsCompletedOfLine,
    calculateCableStepsCompletedOfUsina,
    calculateCompletedBases,
    calculateCompletedBasesOfType,
    calculateCompletedBasesOfUsina,
    calculateLineProgress,
    calculateProductivity,
    calculateProgress,
    calculateProgressOfUsina,
    calculateTotalBases,
    calculateTotalBasesOfType,
    calculateTotalBasesOfUsina,
    calculateTotalCableSteps,
    calculateTotalCableStepsOfUsina,
    calculateWorkDays,
    calculateWorkedHours,
    calculateUsinaStats,
};
