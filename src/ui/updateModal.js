export function createUpdateModalHandlers({
    requireOnlineEdits,
    saveProgressToStorage,
    saveProjectData,
    updateAllDisplays,
    showToast,
    getProjectData,
    getProgressData,
    setProgressData,
    getExecutionDates,
    setExecutionDates,
    formatExecutionDateForDisplay,
    getExecutionDateForLine,
    sanitizeExecutionDates,
    getIsAuthenticated,
    setPendingAction,
    showPasswordModal,
}) {
    function openUpdateModal() {
        if (!getIsAuthenticated()) {
            setPendingAction("openUpdate");
            showPasswordModal();
            return;
        }
        if (!requireOnlineEdits()) return;
        document.getElementById("updateModal").style.display = "block";
    }

    function openLineModal(usina, linha) {
        if (!getIsAuthenticated()) {
            setPendingAction(() => openLineModal(usina, linha));
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
        document.getElementById("selectAllBases").checked = false;
        document.getElementById("selectAllRemoveBases").checked = false;
    }

    function loadLinhas() {
        const projectData = getProjectData();
        const usinaSelect = document.getElementById("usinaSelect");
        const linhaSelect = document.getElementById("linhaSelect");

        linhaSelect.innerHTML = '<option value="">Selecione uma linha</option>';
        linhaSelect.disabled = !usinaSelect.value;

        if (usinaSelect.value) {
            const usina = projectData[usinaSelect.value];
            const linhasOrdenadas = Object.keys(usina.linhas).sort(
                (a, b) => parseInt(a, 10) - parseInt(b, 10)
            );

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
        const projectData = getProjectData();
        const progressData = getProgressData();
        const executionDates = getExecutionDates();
        const usinaSelect = document.getElementById("usinaSelect");
        const linhaSelect = document.getElementById("linhaSelect");
        const basesContainer = document.getElementById("basesCheckboxes");
        const removeBasesContainer = document.getElementById("removeBasesCheckboxes");
        const executionDateInput = document.getElementById("executionDate");

        basesContainer.innerHTML = "";
        removeBasesContainer.innerHTML = "";

        document.getElementById("selectAllBases").checked = false;
        document.getElementById("selectAllRemoveBases").checked = false;

        if (executionDateInput) {
            executionDateInput.value = "";
        }

        if (usinaSelect.value && linhaSelect.value) {
            const usinaKey = usinaSelect.value;
            const linhaData = projectData[usinaKey].linhas[linhaSelect.value];

            if (executionDateInput) {
                executionDateInput.value = getExecutionDateForLine(
                    usinaKey,
                    linhaSelect.value,
                    executionDates
                );
            }

            for (const tipo in linhaData.bases) {
                const quantidade = linhaData.bases[tipo];
                const completedNaLinha =
                    (progressData[usinaKey] &&
                        progressData[usinaKey][linhaSelect.value] &&
                        progressData[usinaKey][linhaSelect.value][tipo]) ||
                    0;

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

    function updateSelectAllState() {
        const basesCheckboxes = document.querySelectorAll('#basesCheckboxes input[type="checkbox"]');
        const selectAllCheckbox = document.getElementById("selectAllBases");
        const total = basesCheckboxes.length;
        const checked = document.querySelectorAll('#basesCheckboxes input[type="checkbox"]:checked').length;

        selectAllCheckbox.checked = total > 0 && checked === total;
    }

    function updateSelectAllRemoveState() {
        const removeBasesCheckboxes = document.querySelectorAll(
            '#removeBasesCheckboxes input[type="checkbox"]'
        );
        const selectAllRemoveCheckbox = document.getElementById("selectAllRemoveBases");
        const total = removeBasesCheckboxes.length;
        const checked = document.querySelectorAll(
            '#removeBasesCheckboxes input[type="checkbox"]:checked'
        ).length;

        selectAllRemoveCheckbox.checked = total > 0 && checked === total;
    }

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

    function handleSubmit(event) {
        event.preventDefault();
        const projectData = getProjectData();
        const progressData = getProgressData();
        const executionDates = getExecutionDates();

        const usinaSelect = document.getElementById("usinaSelect");
        const linhaSelect = document.getElementById("linhaSelect");
        const executionDateInput = document.getElementById("executionDate");
        const selectedUsina = usinaSelect.value;
        const selectedLinha = linhaSelect.value;
        const executionDate = executionDateInput.value;
        const normalizedExecutionDate = executionDate ? executionDate.trim() : "";
        const storedExecutionDate = getExecutionDateForLine(
            selectedUsina,
            selectedLinha,
            executionDates
        );

        if (!selectedUsina) {
            showToast("Por favor, selecione uma usina.", "warning");
            return;
        }

        if (!selectedLinha) {
            showToast("Por favor, selecione uma linha.", "warning");
            return;
        }

        const addCheckboxes = document.querySelectorAll('input[name="addBases"]:checked');
        let additions = {};

        addCheckboxes.forEach((checkbox) => {
            const [tipo] = checkbox.value.split("-");
            additions[tipo] = (additions[tipo] || 0) + 1;
        });

        const removeCheckboxes = document.querySelectorAll('input[name="removeBases"]:checked');
        let removals = {};

        removeCheckboxes.forEach((checkbox) => {
            const [tipo] = checkbox.value.split("-");
            removals[tipo] = (removals[tipo] || 0) + 1;
        });

        const hasBaseChanges = Object.keys(additions).length > 0 || Object.keys(removals).length > 0;
        const hasDateChange = normalizedExecutionDate !== storedExecutionDate;

        if (!hasBaseChanges && !hasDateChange) {
            showToast(
                "Selecione pelo menos uma base para adicionar/remover ou defina uma data de execução.",
                "warning"
            );
            return;
        }

        if (hasBaseChanges) {
            if (!progressData[selectedUsina]) {
                progressData[selectedUsina] = {};
            }
            if (!progressData[selectedUsina][selectedLinha]) {
                progressData[selectedUsina][selectedLinha] = {};
            }

            for (const tipo in additions) {
                const totalPermitido =
                    projectData[selectedUsina].linhas[selectedLinha].bases[tipo] || 0;
                const atual = progressData[selectedUsina][selectedLinha][tipo] || 0;
                progressData[selectedUsina][selectedLinha][tipo] = Math.min(
                    totalPermitido,
                    atual + additions[tipo]
                );
            }

            for (const tipo in removals) {
                const currentValue = progressData[selectedUsina][selectedLinha][tipo] || 0;
                progressData[selectedUsina][selectedLinha][tipo] = Math.max(
                    0,
                    currentValue - removals[tipo]
                );
            }
        }

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

            const sanitized = sanitizeExecutionDates(executionDates);
            setExecutionDates(sanitized);
            localStorage.setItem("linhasVidaExecutionDates", JSON.stringify(sanitized));
        }

        setProgressData(progressData);
        saveProgressToStorage();
        saveProjectData();
        updateAllDisplays();
        closeModal();

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
    }

    function closeOnOutsideClick(event) {
        const updateModal = document.getElementById("updateModal");
        if (event.target === updateModal) {
            closeModal();
        }
    }

    return {
        openUpdateModal,
        openLineModal,
        closeModal,
        loadLinhas,
        loadBases,
        updateSelectAllState,
        updateSelectAllRemoveState,
        toggleAllBases,
        toggleAllRemoveBases,
        handleUpdateSubmit: handleSubmit,
        closeOnOutsideClick,
    };
}
