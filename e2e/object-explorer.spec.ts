import { test, expect } from "@playwright/test";

test.describe("Object Explorer Multi-Connection Tree Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should render connection root with environment badge", async ({ page }) => {
    await expect(page.locator("aside").getByText("Local MongoDB")).toBeVisible();
    await expect(page.locator("aside").getByText("LOCAL", { exact: true })).toBeVisible();
  });

  test("should filter tree items dynamically using search input", async ({ page }) => {
    const filterInput = page.getByPlaceholder("Filter databases & collections...");
    await expect(filterInput).toBeVisible();

    // Type non-existing query
    await filterInput.fill("non_existing_db_xyz");
    // Verify databases disappear
    await expect(page.getByText("store_db")).not.toBeVisible();

    // Clear filter
    await filterInput.clear();
  });

  test("should open Backups folder trigger in sidebar footer", async ({ page }) => {
    const openBackupsBtn = page.getByRole("button", { name: /Open Backups/ });
    await expect(openBackupsBtn).toBeVisible();
  });

  test("should open Settings modal via sidebar footer button", async ({ page }) => {
    const settingsBtn = page.getByRole("button", { name: /Settings/ }).last();
    await settingsBtn.click();

    await expect(page.getByText("Mongox Application Settings")).toBeVisible();
    await page.getByRole("button", { name: "CLI Engine & Tooling" }).click();
    await expect(page.getByText("mongosh", { exact: true })).toBeVisible();

    // Close settings modal
    await page.locator("button:has(svg.lucide-x)").first().click();
    await expect(page.getByText("Mongox Application Settings")).not.toBeVisible();
  });
});
