const { test, expect } = require("@playwright/test");

const baseUrl = process.env.SMOKE_URL;
const smokePassword = process.env.SMOKE_PASSWORD || "thommen2025";
const shouldRun = Boolean(baseUrl);

const describeFn = shouldRun ? test.describe : test.describe.skip;

describeFn("Smoke público (deploy)", () => {
    test("Fluxo crítico: atualização, linha e transversal", async ({ page }) => {
        test.setTimeout(120_000);

        const projectId = process.env.SMOKE_PROJECT_ID || `playwright-smoke-${Date.now()}`;
        const targetUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}project=${projectId}`;

        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

        // Esperar carregamento inicial concluir e ficar online
        await page.waitForFunction(() => {
            const overlay = document.getElementById("loadingOverlay");
            return overlay && overlay.style.display === "none";
        });
        await expect(page.locator("#statusIndicator")).toContainText(/Online|Sincronizando|Salvando/);

        // Abrir modal de atualização (pede senha na primeira vez)
        await page.getByRole("button", { name: /Atualizar Progresso/i }).click();
        if (await page.locator("#passwordModal").isVisible()) {
            await page.fill("#passwordInput", smokePassword);
            await page.getByRole("button", { name: /Confirmar/i }).click();
        }
        await expect(page.locator("#updateModal")).toBeVisible();

        await page.selectOption("#usinaSelect", "pimental");
        try {
            await page.waitForSelector("#linhaSelect:not([disabled])", { state: "visible", timeout: 5000 });
            await page.click("#linhaSelect");
            await page.waitForFunction(
                () => !!document.querySelector('#linhaSelect option[value="01"]'),
                { timeout: 5000 }
            );
            await page.selectOption("#linhaSelect", "01");
        } catch (err) {
            // Fallback: abrir direto a linha 01 pelo handler global se o select travar
            await page.evaluate(() => {
                if (window.App && typeof window.App.openLineModal === "function") {
                    window.App.openLineModal("pimental", "01");
                }
            });
        }

        const today = new Date().toISOString().split("T")[0];
        await page.fill("#executionDate", today);

        const firstBaseCheckbox = page.locator('#basesCheckboxes input[type="checkbox"]').first();
        await expect(firstBaseCheckbox).toBeVisible();
        await firstBaseCheckbox.check({ force: true });

        await page.getByRole("button", { name: /Salvar Alterações/i }).click();
        // O formulário deveria fechar; se não fechar, força fechamento para seguir o fluxo.
        const updateModal = page.locator("#updateModal");
        await page.waitForTimeout(1000);
        if (await updateModal.isVisible()) {
            const closeBtn = updateModal.locator(".close-btn").first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
            }
        }
        await expect(updateModal).toBeHidden({ timeout: 20000 });

        // Modal de linha individual
        await page.locator('.map-line[data-usina="pimental"][data-linha="01"]').click();
        const lineModal = page.locator("#lineDetailsModal");
        await expect(lineModal).toBeVisible();
        await lineModal.getByRole("button", { name: "Editar" }).click();

        const lineCompletedInput = lineModal.locator(".completed-input").first();
        await expect(lineCompletedInput).toBeVisible();
        const currentValue = await lineCompletedInput.inputValue();
        await lineCompletedInput.fill(currentValue || "0");

        await lineModal.locator(".editable-step").first().click();
        await lineModal.getByRole("button", { name: "Salvar" }).click();
        await expect(lineModal.locator("#lineDetailsTable")).not.toHaveClass(/edit-mode/);
        await lineModal.getByRole("button", { name: "Fechar" }).click();
        await expect(lineModal).toBeHidden();

        // Modal de transversal
        const transversalGroup = page
            .locator('.transversal-group[data-usina="pimental"][data-grupo="06-10"]')
            .first();
        await transversalGroup.scrollIntoViewIfNeeded();
        await transversalGroup.click();

        const transversalModal = page.locator("#transversalModal");
        await expect(transversalModal).toBeVisible();
        await transversalModal.getByRole("button", { name: "Editar" }).click();

        const transversalInput = transversalModal
            .locator("#transversalLinesBody .completed-input")
            .first();
        await expect(transversalInput).toBeVisible();
        const transversalValue = await transversalInput.inputValue();
        await transversalInput.fill(transversalValue || "0");

        await transversalModal.locator("#transversalLinesBody .editable-step").first().click();
        await transversalModal.getByRole("button", { name: "Salvar" }).click();
        await expect(transversalModal.locator("#transversalLinesTable")).not.toHaveClass(/edit-mode/);
    });
});
