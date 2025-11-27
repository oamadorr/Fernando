export function createLineModalHandlers({
    requireOnlineEdits,
    saveLineStepsToStorage,
    saveProgressToStorage,
    saveProjectData,
    updateAllDisplays,
    updateTransversalVisuals,
    showToast,
    getIsAuthenticated,
    setPendingAction,
    getProjectData,
    getLineStepsStatus,
    setLineStepsStatus,
    getProgressData,
    setProgressData,
}) {
    let lineDetailsEditBackup = null;
    let currentLineDetails = { usinaKey: null, linha: null };

    function showLineDetails(usinaKey, linha) {
        currentLineDetails = { usinaKey, linha };
        const projectData = getProjectData();
        const progressData = getProgressData();
        const lineStepsStatus = getLineStepsStatus();
        const linhaData = projectData[usinaKey].linhas[linha];
        const usinaName = projectData[usinaKey].name;

        document.getElementById("lineDetailsInfo").textContent =
            `${usinaName} - Linha ${linha} (${linhaData.metragem}m)`;

        const thead = document.getElementById("lineDetailsTableHead");
        const baseTipos = Object.keys(linhaData.bases);

        let headerHTML = "<tr><th>Linha</th><th>Metragem</th>";
        baseTipos.forEach((tipo) => {
            headerHTML += `<th>${tipo}</th>`;
        });
        headerHTML +=
            "<th>Progresso</th><th>Passagem</th><th>Crimpagem</th><th>Aferição</th><th>Tensionamento</th><th>Lacre Tensionador</th><th>Lacre Loop Abs</th></tr>";
        thead.innerHTML = headerHTML;

        const tbody = document.getElementById("lineDetailsBody");
        const steps = lineStepsStatus[usinaKey]?.[linha] || {};

        let rowHTML = `<tr><td style="font-weight: bold; color: var(--primary-blue);">${linha}</td><td>${linhaData.metragem}m</td>`;

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

        rowHTML += `
                <td class="editable-step" data-step="passagemCabo">${steps.passagemCabo ? "✅" : "❌"}</td>
                <td class="editable-step" data-step="crimpagemCabo">${steps.crimpagemCabo ? "✅" : "❌"}</td>
                <td class="editable-step" data-step="afericaoCrimpagem">${steps.afericaoCrimpagem ? "✅" : "❌"}</td>
                <td class="editable-step" data-step="tensionamentoCabo">${steps.tensionamentoCabo ? "✅" : "❌"}</td>
                <td class="editable-seal" data-seal="lacreTensionador">${steps.lacreTensionador || "-"}</td>
                <td class="editable-seal" data-seal="lacreLoopAbs">${steps.lacreLoopAbs || "-"}</td>
            </tr>`;

        tbody.innerHTML = rowHTML;

        document.getElementById("lineDetailsTable").classList.remove("edit-mode");
        document.getElementById("lineDetailsViewButtons").style.display = "flex";
        document.getElementById("lineDetailsEditButtons").style.display = "none";

        document.getElementById("lineDetailsModal").style.display = "flex";
    }

    function closeLineDetailsModal() {
        document.getElementById("lineDetailsModal").style.display = "none";
    }

    function toggleLineDetailsStep(event) {
        const lineStepsStatus = getLineStepsStatus();
        const cell = event.currentTarget;
        const step = cell.dataset.step;
        const { usinaKey, linha } = currentLineDetails;

        if (!lineStepsStatus[usinaKey]) lineStepsStatus[usinaKey] = {};
        if (!lineStepsStatus[usinaKey][linha]) lineStepsStatus[usinaKey][linha] = {};

        lineStepsStatus[usinaKey][linha][step] = !lineStepsStatus[usinaKey][linha][step];
        cell.textContent = lineStepsStatus[usinaKey][linha][step] ? "✅" : "❌";
    }

    function enableLineDetailsEdit() {
        if (!getIsAuthenticated()) {
            setPendingAction(() => enableLineDetailsEdit());
            if (typeof window.showPasswordModal === "function") {
                window.showPasswordModal();
            }
            return;
        }

        const lineStepsStatus = getLineStepsStatus();
        const progressData = getProgressData();

        lineDetailsEditBackup = {
            steps: JSON.parse(JSON.stringify(lineStepsStatus)),
            progress: JSON.parse(JSON.stringify(progressData)),
        };

        document.getElementById("lineDetailsTable").classList.add("edit-mode");

        document.querySelectorAll("#lineDetailsBody .completed-display").forEach((span) => {
            span.style.display = "none";
        });
        document.querySelectorAll("#lineDetailsBody .completed-input").forEach((input) => {
            input.style.display = "inline-block";
        });
        document.querySelectorAll("#lineDetailsBody .total-display").forEach((span) => {
            span.style.display = "inline";
        });

        document.querySelectorAll("#lineDetailsBody .editable-step").forEach((cell) => {
            cell.addEventListener("click", toggleLineDetailsStep);
        });

        const { usinaKey, linha } = currentLineDetails;
        const steps = lineStepsStatus[usinaKey]?.[linha] || {};

        document.querySelectorAll("#lineDetailsBody .editable-seal").forEach((cell) => {
            const sealType = cell.dataset.seal;
            const currentValue = steps[sealType] || "";

            cell.innerHTML = `<input type="text" class="seal-input" value="${currentValue}" maxlength="20" placeholder="Digite o lacre" style="width: 120px; padding: 4px; text-align: center; border: 2px solid var(--primary-blue); border-radius: 4px;">`;
        });

        document.getElementById("lineDetailsViewButtons").style.display = "none";
        document.getElementById("lineDetailsEditButtons").style.display = "flex";
    }

    function cancelLineDetailsEdit() {
        if (lineDetailsEditBackup) {
            setLineStepsStatus(JSON.parse(JSON.stringify(lineDetailsEditBackup.steps)));
            setProgressData(JSON.parse(JSON.stringify(lineDetailsEditBackup.progress)));
            lineDetailsEditBackup = null;
        }

        document.getElementById("lineDetailsTable").classList.remove("edit-mode");

        document.querySelectorAll("#lineDetailsBody .editable-step").forEach((cell) => {
            cell.removeEventListener("click", toggleLineDetailsStep);
        });

        const { usinaKey, linha } = currentLineDetails;
        if (usinaKey && linha) {
            showLineDetails(usinaKey, linha);
        }
    }

    async function saveLineDetailsEdit() {
        if (!requireOnlineEdits()) return;
        const lineStepsStatus = getLineStepsStatus();
        const progressData = getProgressData();
        try {
            const { usinaKey, linha } = currentLineDetails;

            if (!progressData[usinaKey]) progressData[usinaKey] = {};
            if (!progressData[usinaKey][linha]) progressData[usinaKey][linha] = {};

            document.querySelectorAll("#lineDetailsBody .editable-completed-cell").forEach((cell) => {
                const tipo = cell.dataset.tipo;
                const input = cell.querySelector(".completed-input");
                const completedValue = parseInt(input.value, 10) || 0;

                progressData[usinaKey][linha][tipo] = completedValue;
            });

            if (!lineStepsStatus[usinaKey]) lineStepsStatus[usinaKey] = {};
            if (!lineStepsStatus[usinaKey][linha]) lineStepsStatus[usinaKey][linha] = {};

            document.querySelectorAll("#lineDetailsBody .editable-seal").forEach((cell) => {
                const sealType = cell.dataset.seal;
                const input = cell.querySelector(".seal-input");
                const sealValue = input ? input.value.trim() : "";

                lineStepsStatus[usinaKey][linha][sealType] = sealValue;
            });

            saveLineStepsToStorage();
            saveProgressToStorage();

            await saveProjectData();

            lineDetailsEditBackup = null;

            updateAllDisplays();
            updateTransversalVisuals();

            document.getElementById("lineDetailsTable").classList.remove("edit-mode");

            document.querySelectorAll("#lineDetailsBody .editable-step").forEach((cell) => {
                cell.removeEventListener("click", toggleLineDetailsStep);
            });

            document.querySelectorAll("#lineDetailsBody .completed-display").forEach((span) => {
                span.style.display = "inline-block";
            });
            document.querySelectorAll("#lineDetailsBody .completed-input").forEach((input) => {
                input.style.display = "none";
            });

            document.getElementById("lineDetailsViewButtons").style.display = "flex";
            document.getElementById("lineDetailsEditButtons").style.display = "none";

            showLineDetails(usinaKey, linha);

            showToast("Progresso atualizado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar:", error);
            showToast("Erro ao salvar progresso", "error");
        }
    }

    return {
        showLineDetails,
        closeLineDetailsModal,
        enableLineDetailsEdit,
        cancelLineDetailsEdit,
        saveLineDetailsEdit,
    };
}
