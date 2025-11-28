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

    const builtGroups = {
        "belo-monte": [
            {
                label: "Linhas 01 e 10",
                lines: ["01", "10"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                ],
            },
            {
                label: "Linhas 02 e 11",
                lines: ["02", "11"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 03 e 12",
                lines: ["03", "12"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 04 e 13",
                lines: ["04", "13"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 05 e 14",
                lines: ["05", "14"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 06 e 15",
                lines: ["06", "15"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 07 e 16",
                lines: ["07", "16"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 08 e 17",
                lines: ["08", "17"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 09 e 18",
                lines: ["09", "18"],
                pairs: ["01-02", "02-03", "03-04", "04-05", "05-06", "06-07", "07-08"],
            },
            {
                label: "Transversais 19-71",
                lines: [
                    "19",
                    "20",
                    "21",
                    "22",
                    "23",
                    "24",
                    "25",
                    "26",
                    "27",
                    "28",
                    "29",
                    "30",
                    "31",
                    "32",
                    "33",
                    "34",
                    "35",
                    "36",
                    "37",
                    "38",
                    "39",
                    "40",
                    "41",
                    "42",
                    "43",
                    "44",
                    "45",
                    "46",
                    "47",
                    "48",
                    "49",
                    "50",
                    "51",
                    "52",
                    "53",
                    "54",
                    "55",
                    "56",
                    "57",
                    "58",
                    "59",
                    "60",
                    "61",
                    "62",
                    "63",
                    "64",
                    "65",
                    "66",
                    "67",
                    "68",
                    "69",
                    "70",
                    "71",
                ],
                pairs: ["01-02", "02-03", "03-04", "04-05"],
            },
        ],
        pimental: [
            {
                label: "Linhas 01 e 03",
                lines: ["01", "03"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                ],
            },
            {
                label: "Linhas 02 e 04",
                lines: ["02", "04"],
                pairs: [
                    "01-02",
                    "02-03",
                    "03-04",
                    "04-05",
                    "05-06",
                    "06-07",
                    "07-08",
                    "08-09",
                    "09-10",
                    "10-11",
                    "11-12",
                    "12-13",
                    "13-14",
                ],
            },
            {
                label: "Transversais 05-18",
                lines: [
                    "05",
                    "06",
                    "07",
                    "08",
                    "09",
                    "10",
                    "11",
                    "12",
                    "13",
                    "14",
                    "15",
                    "16",
                    "17",
                    "18",
                ],
                pairs: ["01-02", "02-03"],
            },
        ],
        oficina: [
            { label: "Linha 72", lines: ["72"], pairs: ["01-02"] },
            {
                label: "Linha 73",
                lines: ["73"],
                pairs: ["01-02", "02-03", "03-04", "04-05", "05-06", "06-07", "07-08"],
            },
            { label: "Linha 74", lines: ["74"], pairs: ["01-02"] },
        ],
    };

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

        const groups = builtGroups[usinaKey] || [];

        groups.forEach((group) => {
            const baseLine = group.lines[0];
            if (!builtInformations[usinaKey]) builtInformations[usinaKey] = {};
            group.lines.forEach((linha) => {
                if (!builtInformations[usinaKey][linha]) builtInformations[usinaKey][linha] = {};
            });

            const pairKeys = group.pairs;

            const total = pairKeys.reduce((sum, pair) => {
                const raw =
                    builtInformations[usinaKey][baseLine][pair] ||
                    group.lines
                        .map((linha) => builtInformations[usinaKey][linha][pair])
                        .find((v) => v !== undefined && v !== null && v !== "");
                if (raw === null || raw === undefined || raw === "") return sum;
                const normalized = String(raw).replace(",", ".").trim();
                const value = parseFloat(normalized);
                if (Number.isNaN(value)) return sum;
                return sum + value;
            }, 0);
            const hasNumericValues = pairKeys.some((pair) => {
                const raw =
                    builtInformations[usinaKey][baseLine][pair] ||
                    group.lines
                        .map((linha) => builtInformations[usinaKey][linha][pair])
                        .find((v) => v !== undefined && v !== null && v !== "");
                if (raw === null || raw === undefined || raw === "") return false;
                return !Number.isNaN(parseFloat(String(raw).replace(",", ".").trim()));
            });

            let rowHTML = `<tr>`;
            const linesLabel =
                group.lines.length === 1 ? `Linha ${group.lines[0]}` : group.label || group.lines.join(", ");
            rowHTML += `<td style="font-weight: bold; color: var(--primary-blue); white-space: nowrap;">${linesLabel}</td>`;

            pairKeys.forEach((pair) => {
                const value =
                    builtInformations[usinaKey][baseLine][pair] ||
                    group.lines
                        .map((linha) => builtInformations[usinaKey][linha][pair])
                        .find((v) => v !== undefined && v !== null && v !== "") ||
                    "";
                rowHTML += `
                        <td class="built-input-cell view-mode" data-pair="${pair}" data-linhas="${group.lines.join(",")}" data-usina="${usinaKey}">
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
                        const linhas = (cell.dataset.linhas || "").split(",").filter(Boolean);
                        const usinaKey = cell.dataset.usina;
                        const input = cell.querySelector(".built-input");

                        linhas.forEach((linha) => {
                            if (!usinaKey) return;
                            if (!builtInformations[usinaKey]) builtInformations[usinaKey] = {};
                            if (!builtInformations[usinaKey][linha]) builtInformations[usinaKey][linha] = {};
                            builtInformations[usinaKey][linha][pair] = input.value.trim();
                        });
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
