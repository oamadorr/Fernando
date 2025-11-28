const path = require("path");
const fs = require("fs");
const { test, expect } = require("@playwright/test");

const fileUrl = "file://" + path.resolve(__dirname, "../index.html");

test.describe("Backup UI", () => {
    test("gera backup JSON com todos os campos críticos", async ({ page, context }) => {
        await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

        // Esperar carregamento inicial
        await page.waitForFunction(() => {
            const overlay = document.getElementById("loadingOverlay");
            return overlay && overlay.style.display === "none";
        });

        // Interceptar download
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            page.getByRole("button", { name: /Backup Dados/i }).click(),
        ]);

        const downloadPath = await download.path();
        const content = fs.readFileSync(downloadPath, "utf-8");
        const data = JSON.parse(content);

        // Campos esperados
        expect(data).toHaveProperty("progressData");
        expect(data).toHaveProperty("lineStepsStatus");
        expect(data).toHaveProperty("executionDates");
        expect(data).toHaveProperty("lineObservations");
        expect(data).toHaveProperty("builtInformations");
        expect(data).toHaveProperty("teamConfig");
        expect(data).toHaveProperty("manualActiveUsina");

        // Conferir que lacres existem no objeto lineStepsStatus
        const anyLacre = Object.values(data.lineStepsStatus || {}).some((usina) =>
            Object.values(usina || {}).some(
                (linha) => linha && (linha.lacreTensionador !== undefined || linha.lacreLoopAbs !== undefined)
            )
        );
        expect(anyLacre).toBe(true);
    });
});
