import state from "../state.js";
import {
    calculateCompletedBasesOfUsina,
    calculateTotalBasesOfUsina,
} from "../calculations.js";

let chartConclusaoGeral = null;

function getProgressGradient(percentage) {
    if (percentage === 100) {
        return "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)";
    }
    if (percentage >= 50) {
        return "linear-gradient(90deg, #2563eb 0%, #22c55e 100%)";
    }
    return "linear-gradient(90deg, #ef4444 0%, #f97316 100%)";
}

function addProgressTooltip(barItem, tipo, lineData, usinaKey) {
    const tooltip = document.createElement("div");
    tooltip.className = "progress-tooltip";

    const completedLines = lineData.completed.length > 0 ? lineData.completed.join(", ") : "Nenhuma";
    const pendingLines = lineData.pending.length > 0 ? lineData.pending.join(", ") : "Nenhuma";

    tooltip.innerHTML = `
            <div class="tooltip-title">Tipo ${tipo.toUpperCase()} (${usinaKey})</div>
            <div><strong>Linhas concluídas:</strong> ${completedLines}</div>
            <div><strong>Linhas pendentes:</strong> ${pendingLines}</div>
        `;

    barItem.appendChild(tooltip);

    barItem.addEventListener("mouseenter", () => {
        tooltip.classList.add("show");
    });

    barItem.addEventListener("mousemove", (event) => {
        tooltip.style.top = `${event.clientY - 60}px`;
        tooltip.style.left = `${event.clientX + 10}px`;
    });

    barItem.addEventListener("mouseleave", () => {
        tooltip.classList.remove("show");
    });
}

function updateChartInfos() {
    const pimentalCompleted = calculateCompletedBasesOfUsina("pimental");
    const pimentalTotal = calculateTotalBasesOfUsina("pimental");
    document.getElementById("pimentalTotalBases").textContent =
        `${pimentalCompleted}/${pimentalTotal}`;

    const beloMonteCompleted = calculateCompletedBasesOfUsina("belo-monte");
    const beloMonteTotal = calculateTotalBasesOfUsina("belo-monte");
    document.getElementById("beloMonteTotalBases").textContent =
        `${beloMonteCompleted}/${beloMonteTotal}`;
}

function initChartConclusaoGeral() {
    const ctx = document.getElementById("chartConclusaoGeral").getContext("2d");

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
                        "#3b82f6",
                        "#bfdbfe",
                        "#10b981",
                        "#bbf7d0",
                        "#f59e0b",
                        "#fde68a",
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
                        label: (context) => `${context.label}: ${context.raw} bases`,
                    },
                },
            },
        },
    });
}

function initHorizontalChart(usinaKey, tipos, containerId) {
    const container = document.getElementById(containerId);
    const projectData = state.projectData || {};
    const progressData = state.progressData || {};

    const totalByType = {};
    const completedByType = {};
    const linesByType = {};

    for (const tipo of tipos) {
        totalByType[tipo] = 0;
        completedByType[tipo] = 0;
        linesByType[tipo] = { completed: [], pending: [] };
    }

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

                if (completedBases >= totalBases) {
                    linesByType[tipo].completed.push(linha);
                } else {
                    linesByType[tipo].pending.push(linha);
                }
            }
        }
    }

    const tiposComBases = tipos.filter((tipo) => totalByType[tipo] > 0);
    if (tiposComBases.length === 0) {
        container.innerHTML =
            '<p style="color: #6b7280; font-style: italic;">Sem bases para exibir.</p>';
        return;
    }

    const maxBases = Math.max(...tiposComBases.map((tipo) => totalByType[tipo]));
    container.innerHTML = "";

    tiposComBases.forEach((tipo) => {
        const total = totalByType[tipo];
        const completed = completedByType[tipo] || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const barWidth = (total / maxBases) * 100;

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

        addProgressTooltip(barItem, tipo, linesByType[tipo], usinaKey);
        container.appendChild(barItem);
    });
}

function initChartPimental() {
    initHorizontalChart("pimental", ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"], "chartPimental");
}

function initChartBeloMonte() {
    initHorizontalChart(
        "belo-monte",
        ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"],
        "chartBeloMonte"
    );
}

function initChartOficina() {
    initHorizontalChart("oficina", ["M", "B", "K", "H"], "chartOficina");
}

function initializeCharts() {
    initChartConclusaoGeral();
    initChartPimental();
    initChartBeloMonte();
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

export { initializeCharts, updateCharts, updateChartInfos };
