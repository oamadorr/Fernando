const { test, expect } = require("@playwright/test");

const password = process.env.SMOKE_PASSWORD || "thommen2025";

test.describe("Namespace App", () => {
    test("expõe handlers essenciais e abre modal de atualização", async ({ page }) => {
        await page.goto("/index.html", { waitUntil: "domcontentloaded" });

        // Esperar carregamento inicial
        await page.waitForFunction(() => {
            const overlay = document.getElementById("loadingOverlay");
            return overlay && overlay.style.display === "none";
        });

        const hasApp = await page.evaluate(() => typeof window.App === "object");
        expect(hasApp).toBe(true);

        const hasUpdate = await page.evaluate(() => typeof window.App.openUpdateModal === "function");
        expect(hasUpdate).toBe(true);

        await page.evaluate(() => window.App.openUpdateModal());

        const passwordModal = page.locator("#passwordModal");
        if (await passwordModal.isVisible()) {
            await page.fill("#passwordInput", password);
            await page.getByRole("button", { name: /Confirmar/i }).click();
        }

        await expect(page.locator("#updateModal")).toBeVisible();

        // Fechar para não interferir em outros testes locais
        await page.evaluate(() => window.App.closeModal());
        await expect(page.locator("#updateModal")).toBeHidden();
    });
});
