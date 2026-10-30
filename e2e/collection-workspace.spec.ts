import { test, expect } from "@playwright/test";

test.describe("Collection Workspace, Index Management & Schema Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should display getting-started guidance when no collection is selected", async ({ page }) => {
    await expect(page.getByText(/Connected to|No Active Connection/)).toBeVisible();
    await expect(page.getByRole("button", { name: "New Connection", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings & CLI Tools" })).toBeVisible();
  });

  test("should open Settings modal from getting-started screen", async ({ page }) => {
    await page.getByRole("button", { name: "Settings & CLI Tools" }).click();
    await expect(page.getByText("Mongox Application Settings")).toBeVisible();

    // Verify tabs inside Settings
    await page.getByRole("button", { name: "Storage & Directories" }).click();
    await expect(page.getByText("Default Backup Storage")).toBeVisible();
    await expect(page.getByText("Open in Explorer")).toBeVisible();

    await page.getByRole("button", { name: "Preferences" }).click();
    await expect(page.getByText("Default Query Result Limit")).toBeVisible();
    await expect(page.getByText("Linear Dark-Tech")).toBeVisible();

    // Close
    await page.locator("button:has(svg.lucide-x)").first().click();
    await expect(page.getByText("Mongox Application Settings")).not.toBeVisible();
  });
});
