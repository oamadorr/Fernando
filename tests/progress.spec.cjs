const { test, expect } = require("@playwright/test");

const overflownProgress = {
    pimental: {
        "01": { A: 10, C: 50, E: 5, K: 12 },
        "02": { C: 25, G: 5, K: 20 },
        "03": { B: 5, D: 40, F: 10, K: 15 },
        "04": { D: 30, H: 5, K: 18 },
        "05": { J: 9 },
        18: { J: 6 },
    },
    "belo-monte": {
        "01": { A: 4, C: 30, E: 4, K: 15 },
        "02": { C: 25, E: 4, K: 18 },
        "03": { C: 25, E: 4, K: 18 },
        "04": { C: 25, E: 4, K: 18 },
        "05": { C: 25, E: 4, K: 18 },
        "06": { C: 25, E: 4, K: 18 },
        "07": { C: 25, E: 4, K: 18 },
        "08": { C: 25, E: 4, K: 18 },
        "09": { C: 15, G: 6, K: 12 },
        10: { B: 6, D: 25, F: 8, K: 12 },
        11: { C: 25, F: 8, K: 16 },
        12: { C: 25, F: 8, K: 16 },
        13: { C: 25, F: 8, K: 16 },
        14: { C: 25, F: 8, K: 16 },
        15: { C: 25, F: 8, K: 16 },
        16: { C: 25, F: 8, K: 16 },
        17: { C: 25, F: 8, K: 16 },
        18: { D: 15, H: 6, K: 12 },
        19: { J: 12 },
        71: { J: 12 },
    },
};

test.describe("Sanitização de progresso", () => {
    test("limita dados excedentes do localStorage aos totais oficiais", async ({ page }) => {
        await page.addInitScript(
            ({ progress }) => {
                localStorage.setItem("linhasVidaProgress", JSON.stringify(progress));
                localStorage.setItem("linhasVidaLastUpdate", new Date().toISOString());
            },
            { progress: overflownProgress }
        );

        await page.goto("/index.html", { waitUntil: "domcontentloaded" });

        await page.waitForFunction(() => {
            const overlay = document.getElementById("loadingOverlay");
            return overlay && overlay.style.display === "none";
        });

        const sanitizedSnapshot = await page.evaluate(() => {
            const stored = localStorage.getItem("linhasVidaProgress");
            const parsed = stored ? JSON.parse(stored) : {};
            return {
                pimental05: parsed?.pimental?.["05"]?.J,
                pimental01K: parsed?.pimental?.["01"]?.K,
                beloMonte01K: parsed?.["belo-monte"]?.["01"]?.K,
                beloMonte19J: parsed?.["belo-monte"]?.["19"]?.J,
            };
        });

        expect(sanitizedSnapshot.pimental05).toBe(1);
        expect(sanitizedSnapshot.pimental01K).toBe(6);
        expect(sanitizedSnapshot.beloMonte01K).toBe(5);
        expect(sanitizedSnapshot.beloMonte19J).toBe(3);

        const barPercents = await page.$$eval(".bar-percentage", (nodes) =>
            nodes
                .map((node) => parseFloat(node.textContent?.replace("%", "") || "0"))
                .filter((value) => !Number.isNaN(value))
        );

        for (const percent of barPercents) {
            expect(percent).toBeLessThanOrEqual(100);
        }
    });
});
