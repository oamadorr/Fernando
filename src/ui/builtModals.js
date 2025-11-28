export function createBuiltHandlers({
    requireOnlineEdits,
    showToast,
    saveBuiltToStorage,
    saveBuiltToFirebase,
    saveProjectData,
    getBuiltInformations,
    setBuiltInformations,
    getProjectData,
    getIsAuthenticated,
    setPendingAction,
    showPasswordModal,
}) {
    let builtEditBackup = null;

    function renderBuiltTable(usinaKey) {
        const projectData = getProjectData();
        const builtInformations = getBuiltInformations();
        const tableId =
            usinaKey === "pimental"
                ? "tableBuiltPimental"
                : usinaKey === "belo-monte"
                  ? "tableBuiltBeloMonte"
                  : "tableBuiltOficina";
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        let html = "";

        const linhas = Object.keys(projectData[usinaKey].linhas).sort(
            (a, b) => parseInt(a, 10) - parseInt(b, 10)
        );

        linhas.forEach((linha) => {
            if (!builtInformations[usinaKey] || !builtInformations[usinaKey][linha]) {
                return;
            }
            const pares = builtInformations[usinaKey][linha];
            if (!pares) return;

            const pairKeys = Object.keys(pares).sort((a, b) => {
                const aNum = parseInt(a.split("-")[0], 10);
                const bNum = parseInt(b.split("-")[0], 10);
                return aNum - bNum;
            });

            const total = pairKeys.reduce((sum, pair) => {
                const raw = pares[pair];
                if (raw === null || raw === undefined || raw === "") return sum;
                const normalized = String(raw).replace(",", ".").trim();
                const value = parseFloat(normalized);
                if (Number.isNaN(value)) return sum;
                return sum + value;
            }, 0);
            const hasNumericValues = pairKeys.some((pair) => {
                const raw = pares[pair];
                if (raw === null || raw === undefined || raw === "") return false;
                return !Number.isNaN(parseFloat(String(raw).replace(",", ".").trim()));
            });

            let rowHTML = `<tr>`;
            rowHTML += `<td style="font-weight: bold; color: var(--primary-blue);">Linha ${linha}</td>`;

            pairKeys.forEach((pair) => {
                const value = pares[pair] || "";
                rowHTML += `
                        <td class="built-input-cell view-mode" data-pair="${pair}" data-linha="${linha}" data-usina="${usinaKey}">
                            <div style="font-size: 0.75rem; color: #666; margin-bottom: 2px;">${pair}</div>
                            <span class="built-display">${value || "-"}</span>
                            <input type="text" class="built-input" value="${value}" placeholder="-" />
                        </td>
                    `;
            });

            const maxCols = 13;
            const currentCols = pairKeys.length;
            for (let i = currentCols; i < maxCols; i++) {
                rowHTML += `<td class="empty-cell"></td>`;
            }

            const totalDisplay = hasNumericValues ? total.toFixed(2) : "-";
            rowHTML += `<td class="built-total-cell">${totalDisplay}</td>`;

            rowHTML += `</tr>`;
            html += rowHTML;
        });

        tbody.innerHTML = html;
    }

    function renderBuiltTables() {
        renderBuiltTable("pimental");
        renderBuiltTable("belo-monte");
        renderBuiltTable("oficina");
    }

    function enableBuiltEdit() {
        if (!getIsAuthenticated()) {
            setPendingAction(() => enableBuiltEdit());
            if (showPasswordModal) showPasswordModal();
            return;
        }
        if (!requireOnlineEdits()) return;

        builtEditBackup = JSON.parse(JSON.stringify(getBuiltInformations()));

        ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach((tableId) => {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.classList.add("edit-mode");

            table.querySelectorAll(".built-input-cell").forEach((cell) => {
                cell.classList.remove("view-mode");
                const display = cell.querySelector(".built-display");
                const input = cell.querySelector(".built-input");

                if (display) display.style.display = "none";
                if (input) input.style.display = "inline-block";
            });
        });

        document.getElementById("builtViewButtons").style.display = "none";
        document.getElementById("builtEditButtons").style.display = "flex";
    }

    function cancelBuiltEdit() {
        if (builtEditBackup) {
            setBuiltInformations(JSON.parse(JSON.stringify(builtEditBackup)));
            builtEditBackup = null;
        }

        ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach((tableId) => {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.classList.remove("edit-mode");

            table.querySelectorAll(".built-input-cell").forEach((cell) => {
                cell.classList.add("view-mode");
                const display = cell.querySelector(".built-display");
                const input = cell.querySelector(".built-input");

                if (display) display.style.display = "inline";
                if (input) input.style.display = "none";
            });
        });

        document.getElementById("builtViewButtons").style.display = "flex";
        document.getElementById("builtEditButtons").style.display = "none";

        renderBuiltTables();
    }

    async function saveBuiltEdit() {
        if (!requireOnlineEdits()) return;
        const builtInformations = getBuiltInformations();
        try {
            ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach(
                (tableId) => {
                    const table = document.getElementById(tableId);
                    if (!table) return;

                    table.querySelectorAll(".built-input-cell").forEach((cell) => {
                        const pair = cell.dataset.pair;
                        const linha = cell.dataset.linha;
                        const usinaKey = cell.dataset.usina;
                        const input = cell.querySelector(".built-input");

                        if (usinaKey && builtInformations[usinaKey] && builtInformations[usinaKey][linha]) {
                            builtInformations[usinaKey][linha][pair] = input.value.trim();
                        }
                    });
                }
            );

            saveBuiltToStorage();
            setBuiltInformations(builtInformations);

            ["tableBuiltBeloMonte", "tableBuiltPimental", "tableBuiltOficina"].forEach(
                (tableId) => {
                    const table = document.getElementById(tableId);
                    if (!table) return;

                    table.classList.remove("edit-mode");

                    table.querySelectorAll(".built-input-cell").forEach((cell) => {
                        cell.classList.add("view-mode");
                        const display = cell.querySelector(".built-display");
                        const input = cell.querySelector(".built-input");

                        if (display) display.style.display = "inline";
                        if (input) input.style.display = "none";
                    });
                }
            );

            document.getElementById("builtViewButtons").style.display = "flex";
            document.getElementById("builtEditButtons").style.display = "none";

            if (saveProjectData) {
                await saveProjectData();
            } else if (saveBuiltToFirebase) {
                await saveBuiltToFirebase();
            }

            renderBuiltTables();

            showToast("Informações de Built salvas com sucesso!", "success");
            builtEditBackup = null;
        } catch (error) {
            console.error("Erro ao salvar Built:", error);
            showToast("Erro ao salvar informações de Built", "error");
        }
    }

    return {
        renderBuiltTables,
        enableBuiltEdit,
        cancelBuiltEdit,
        saveBuiltEdit,
    };
}
