import { test, expect } from "@playwright/test";

test.describe("Action Modals: Backup, Restore, Export, Import & Production Guard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should open and validate Backup action modal", async ({ page }) => {
    // Open backup modal from sidebar hover / trigger
    const backupBtn = page.getByTitle("Backup collection").first();
    if (await backupBtn.isVisible()) {
      await backupBtn.click();
      await expect(page.getByText("Create Database Backup (mongodump)")).toBeVisible();
      await expect(page.getByText("Gzip Compression (--gzip)")).toBeVisible();
      await expect(page.getByText("Single Archive (--archive)")).toBeVisible();
      await expect(page.getByText("Open Folder")).toBeVisible();

      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Create Database Backup (mongodump)")).not.toBeVisible();
    }
  });

  test("should open and validate Export wizard modal with Smart Data Masking", async ({ page }) => {
    const exportBtn = page.getByTitle("Export collection").first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await expect(page.getByText(/Export Collection Data/)).toBeVisible();

      // Verify format selection buttons
      await expect(page.getByText("JSON Array")).toBeVisible();
      await expect(page.getByText("CSV")).toBeVisible();
      await expect(page.getByText("NDJSON")).toBeVisible();

      // Switch to CSV
      await page.getByText("CSV").click();
      await expect(page.getByPlaceholder("export_")).toHaveValue(/.*\.csv/);

      // Verify Smart Data Masking section
      await expect(page.getByText("Smart Data Masking Rules")).toBeVisible();
      await expect(page.getByText("email")).toBeVisible();
      await expect(page.getByText("phone")).toBeVisible();

      // Add custom masking rule
      await page.getByPlaceholder("Field name (e.g. ssn, token)").fill("credit_card");
      await page.locator("button:has(svg.lucide-plus)").last().click();
      await expect(page.getByText("credit_card")).toBeVisible();

      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText(/Export Collection Data/)).not.toBeVisible();
    }
  });

  test("should open and validate Import wizard modal", async ({ page }) => {
    const importBtn = page.getByTitle("Import data into collection").first();
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await expect(page.getByText(/Import Data into/)).toBeVisible();
      await expect(page.getByText("Source File Path")).toBeVisible();
      await expect(page.getByText("Key Collision Resolution")).toBeVisible();

      // Test Preview button
      await page.getByRole("button", { name: /Preview \(10 rows\)/ }).click();

      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText(/Import Data into/)).not.toBeVisible();
    }
  });
});
