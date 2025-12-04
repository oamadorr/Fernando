import { calculateLineProgress } from "../calculations.js";

export function createTransversalHandlers({
    requireOnlineEdits,
    saveProjectData,
    updateAllDisplays,
    updateTransversalVisuals,
    showToast,
    saveLineStepsToStorage,
    saveProgressToStorage,
    getIsAuthenticated,
    setPendingAction,
    getLineStepsStatus,
    setLineStepsStatus,
    getProgressData,
    setProgressData,
    getProjectData,
}) {
    let transversalEditBackup = null;

    function showTransversalDetails(usinaKey, grupo) {
        const projectData = getProjectData();
        const progressData = getProgressData();
        const lineStepsStatus = getLineStepsStatus();
        const [startLine, endLine] = grupo.split("-").map(Number);
        const linhas = [];

        for (let i = startLine; i <= endLine; i++) {
            const linhaStr = String(i).padStart(2, "0");
            if (projectData[usinaKey].linhas[linhaStr]) {
                linhas.push(linhaStr);
            }
        }

        const usinaName = projectData[usinaKey].name;
        document.getElementById("transversalGroupInfo").textContent =
            `${usinaName} - Linhas ${grupo} (${linhas.length} linhas transversais)`;

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

        document.getElementById("transversalLinesTable").classList.remove("edit-mode");
        document.getElementById("transversalViewButtons").style.display = "flex";
        document.getElementById("transversalEditButtons").style.display = "none";
        document.getElementById("transversalModal").style.display = "flex";
    }

    function closeTransversalModal() {
        document.getElementById("transversalModal").style.display = "none";
    }

    function toggleStepStatus(event) {
        const lineStepsStatus = getLineStepsStatus();
        const cell = event.currentTarget;
        const row = cell.closest("tr");
        const usinaKey = row.dataset.usina;
        const linha = row.dataset.linha;
        const step = cell.dataset.step;

        if (!lineStepsStatus[usinaKey]) lineStepsStatus[usinaKey] = {};
        if (!lineStepsStatus[usinaKey][linha]) lineStepsStatus[usinaKey][linha] = {};

        const currentStatus = lineStepsStatus[usinaKey][linha][step] || false;
        lineStepsStatus[usinaKey][linha][step] = !currentStatus;

        cell.textContent = lineStepsStatus[usinaKey][linha][step] ? "✅" : "❌";
    }

    function enableTransversalEdit() {
        if (!getIsAuthenticated()) {
            setPendingAction(() => enableTransversalEdit());
            if (typeof window.App?.showPasswordModal === "function") {
                window.App.showPasswordModal();
            }
            return;
        }
        if (!requireOnlineEdits()) return;

        const lineStepsStatus = getLineStepsStatus();
        const progressData = getProgressData();
        transversalEditBackup = {
            steps: JSON.parse(JSON.stringify(lineStepsStatus)),
            progress: JSON.parse(JSON.stringify(progressData)),
        };

        const table = document.getElementById("transversalLinesTable");
        table.classList.add("edit-mode");

        document.querySelectorAll(".editable-step").forEach((cell) => {
            cell.addEventListener("click", toggleStepStatus);
        });

        document.querySelectorAll(".completed-display").forEach((span) => {
            span.style.display = "none";
        });
        document.querySelectorAll(".completed-input").forEach((input) => {
            input.style.display = "inline-block";
        });

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

        document.getElementById("transversalViewButtons").style.display = "none";
        document.getElementById("transversalEditButtons").style.display = "flex";
    }

    function cancelTransversalEdit() {
        if (transversalEditBackup) {
            setLineStepsStatus(JSON.parse(JSON.stringify(transversalEditBackup.steps)));
            setProgressData(JSON.parse(JSON.stringify(transversalEditBackup.progress)));
            transversalEditBackup = null;
        }

        const table = document.getElementById("transversalLinesTable");
        table.classList.remove("edit-mode");

        document.querySelectorAll(".editable-step").forEach((cell) => {
            cell.removeEventListener("click", toggleStepStatus);
        });

        document.getElementById("transversalViewButtons").style.display = "flex";
        document.getElementById("transversalEditButtons").style.display = "none";

        const grupoText = document.getElementById("transversalGroupInfo").textContent;
        const match = grupoText.match(/Linhas (\d+-\d+)/);
        const usinaKey = document.querySelector("#transversalLinesBody tr")?.dataset.usina;
        if (match && usinaKey) {
            showTransversalDetails(usinaKey, match[1]);
        }
    }

    async function saveTransversalEdit() {
        const lineStepsStatus = getLineStepsStatus();
        const progressData = getProgressData();
        try {
            const table = document.getElementById("transversalLinesTable");
            const rows = table.querySelectorAll("tbody tr");

            rows.forEach((row) => {
                const linha = row.dataset.linha;
                const usina = row.dataset.usina;
                const totalBases = parseInt(row.dataset.total, 10);

                const completedInput = row.querySelector(".completed-input");
                const completed = parseInt(completedInput.value || "0", 10);

                if (!progressData[usina]) progressData[usina] = {};
                if (!progressData[usina][linha]) progressData[usina][linha] = {};

                progressData[usina][linha].J = Math.min(Math.max(completed, 0), totalBases);

                const sealInputs = row.querySelectorAll(".seal-input");
                sealInputs.forEach((input) => {
                    const sealField = input.dataset.seal;
                    const sealValue = input.value.trim();

                    if (!lineStepsStatus[usina]) lineStepsStatus[usina] = {};
                    if (!lineStepsStatus[usina][linha]) lineStepsStatus[usina][linha] = {};

                    lineStepsStatus[usina][linha][sealField] = sealValue;
                });
            });

            // Manter state.js sincronizado como nas demais telas de edição
            setLineStepsStatus(JSON.parse(JSON.stringify(lineStepsStatus)));
            setProgressData(JSON.parse(JSON.stringify(progressData)));

            saveLineStepsToStorage();
            saveProgressToStorage();

            await saveProjectData();

            transversalEditBackup = null;

            updateAllDisplays();
            updateTransversalVisuals();

            table.classList.remove("edit-mode");

            document.querySelectorAll(".editable-step").forEach((cell) => {
                cell.removeEventListener("click", toggleStepStatus);
            });

            document.querySelectorAll(".completed-display").forEach((span) => {
                span.style.display = "inline-block";
            });
            document.querySelectorAll(".completed-input").forEach((input) => {
                input.style.display = "none";
            });

            document.getElementById("transversalViewButtons").style.display = "flex";
            document.getElementById("transversalEditButtons").style.display = "none";

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

    return {
        showTransversalDetails,
        closeTransversalModal,
        enableTransversalEdit,
        cancelTransversalEdit,
        saveTransversalEdit,
    };
}
