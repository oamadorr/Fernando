import state from "../state.js";
import { calculateLineProgress } from "../calculations.js";

let currentMapTab = "pimental"; // Aba ativa

function updateMapStats(usinaKey = null) {
    const targetUsina = usinaKey || currentMapTab;
    const projectData = state.projectData;

    if (!projectData[targetUsina]) return;

    let totalLines = 0;
    let completedLines = 0;
    let inProgressLines = 0;
    let totalProgress = 0;

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

    document.getElementById("mapTotalLines").textContent = totalLines;
    document.getElementById("mapCompletedLines").textContent = completedLines;
    document.getElementById("mapProgressPercent").textContent = `${avgProgress}%`;
    document.getElementById("mapInProgressLines").textContent = inProgressLines;
}

function updateMapLines(usinaKey = null) {
    const targetUsina = usinaKey || currentMapTab;
    const projectData = state.projectData;

    if (!projectData[targetUsina]) return;

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

        const lineBar = line.querySelector(".line-bar");
        const lineLabel = line.querySelector(".line-label");

        lineBar.classList.remove("completed", "in-progress", "pending");
        lineLabel.classList.remove("completed", "in-progress", "pending");

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

function showMapTooltip(event, usinaKey, linha) {
    const tooltip = document.getElementById("mapTooltip");
    const progress = calculateLineProgress(usinaKey, linha);
    const projectData = state.projectData;
    const progressData = state.progressData;

    let status = "";
    if (progress === 100) {
        status = "Concluído";
    } else if (progress > 0) {
        status = "Em Andamento";
    } else {
        status = "Pendente";
    }

    const usinaName = projectData[usinaKey].name;

    const linhaData = projectData[usinaKey]?.linhas[linha];
    if (!linhaData) return;

    const basesCompleted = [];
    const basesPending = [];

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

    const lineElement = event.currentTarget;
    const lineRect = lineElement.getBoundingClientRect();

    tooltip.style.visibility = "hidden";
    tooltip.classList.add("show");
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.classList.remove("show");
    tooltip.style.visibility = "visible";

    let left = lineRect.left + lineRect.width / 2 - tooltipRect.width / 2 + window.pageXOffset;
    let top = lineRect.top - tooltipRect.height - 10 + window.pageYOffset;

    if (left < 10) {
        left = 10;
    }

    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }

    if (top < window.pageYOffset + 10) {
        top = lineRect.bottom + 10 + window.pageYOffset;
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
    tooltip.classList.add("show");
}

function hideMapTooltip() {
    document.getElementById("mapTooltip").classList.remove("show");
}

function showTransversalTooltip(event, usinaKey, grupo) {
    const tooltip = document.getElementById("mapTooltip");
    const projectData = state.projectData;
    const progressData = state.progressData;
    const usinaName = projectData[usinaKey].name;

    const [inicio, fim] = grupo.split("-").map((n) => n.padStart(2, "0"));
    const linhas = [];
    for (let i = parseInt(inicio, 10); i <= parseInt(fim, 10); i++) {
        linhas.push(i.toString().padStart(2, "0"));
    }

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

function initializeMapEvents() {
    document.querySelectorAll(".map-line").forEach((line) => {
        const usinaKey = line.dataset.usina;
        const linha = line.dataset.linha;

        if (!line.hasAttribute("onclick")) {
            line.addEventListener("click", () => {
                if (typeof window.openLineModal === "function") {
                    window.openLineModal(usinaKey, linha);
                }
            });
        }

        line.addEventListener("mouseenter", (event) => {
            showMapTooltip(event, usinaKey, linha);
        });

        line.addEventListener("mouseleave", () => {
            hideMapTooltip();
        });
    });

    document.querySelectorAll(".transversal-group").forEach((group) => {
        const usinaKey = group.dataset.usina;
        const grupo = group.dataset.grupo;

        group.setAttribute("title", `Grupo ${grupo} • Linhas transversais ${grupo}`);

        group.addEventListener("mouseenter", (event) => {
            showTransversalTooltip(event, usinaKey, grupo);
        });

        group.addEventListener("mouseleave", () => {
            hideMapTooltip();
        });
    });
}

function initializeMap() {
    initializeMapEvents();
    updateMapFromExternalData();
    console.log("🗺️ Mapa interativo inicializado com sucesso!");
}

function switchMapTab(usinaKey, evt) {
    currentMapTab = usinaKey;

    document.querySelectorAll(".map-tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });
    if (evt && evt.target) {
        evt.target.classList.add("active");
    }

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

    updateMapStats(usinaKey);
}

function updateMapFromExternalData(externalProgressData) {
    const originalProgressData = state.progressData;
    if (externalProgressData) {
        state.progressData = externalProgressData;
    }

    updateMapLines("pimental");
    updateMapLines("belo-monte");
    updateMapLines("oficina");
    updateMapStats(currentMapTab);

    if (externalProgressData) {
        state.progressData = originalProgressData;
    }
}

export {
    initializeMap,
    switchMapTab,
    updateMapFromExternalData,
    updateTransversalVisuals,
};
