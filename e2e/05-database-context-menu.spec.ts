import { test, expect, Page } from "@playwright/test";

async function connectToTestDb(page: Page) {
  await page.request.delete("http://localhost:4173/api/mongo/connections?id=all");
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection", exact: true }).click();
  await page.getByRole("button", { name: "From URI" }).click();
  await page.getByPlaceholder(/mongodb:\/\/username:password@/).fill(
    "mongodb://mongox:mongoxpass@127.0.0.1:27017/test_db?authSource=admin"
  );
  await page.getByRole("button", { name: "Parse & Apply" }).click();
  await page.locator("#conn-name-input").fill("Docker Test DB");
  await page.getByRole("button", { name: "Save & Connect" }).click();
  await expect(page.locator("aside").getByText("Docker Test DB")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("aside").getByText("test_db", { exact: true })).toBeVisible({ timeout: 5000 });
}

test.describe("Database Right-Click Context Menu & Action Modals", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should display Dump, Restore, Export, Import, and Drop Database in context menu", async ({ page }) => {
    // Right click 'test_db' in Object Explorer
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });

    // Verify all 5 context menu items
    await expect(page.locator("aside").getByRole("button", { name: "Dump", exact: true })).toBeVisible();
    await expect(page.locator("aside").getByRole("button", { name: "Restore", exact: true })).toBeVisible();
    await expect(page.locator("aside").getByRole("button", { name: "Export", exact: true })).toBeVisible();
    await expect(page.locator("aside").getByRole("button", { name: "Import", exact: true })).toBeVisible();
    await expect(page.locator("aside").getByRole("button", { name: /Drop Database/ })).toBeVisible();
  });

  test("should open Export modal from database context menu, configure masking, and export", async ({ page }) => {
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Export", exact: true }).click();

    // Verify Export modal
    await expect(page.getByText(/Export Collection Data/)).toBeVisible();
    await expect(page.getByText("JSON Array")).toBeVisible();
    await expect(page.getByText("CSV")).toBeVisible();

    // Switch to CSV
    await page.getByText("CSV").click();

    // Add smart data masking rule
    await page.getByPlaceholder("Field name (e.g. ssn, token)").fill("email");
    await page.getByTitle("Add Rule").click();
    await expect(page.getByText("email").first()).toBeVisible();

    // Run Export
    await page.getByRole("button", { name: "Start Export" }).click();
    await expect(page.getByText(/Export Collection Data/)).not.toBeVisible();
  });

  test("should open Dump modal and execute real backup", async ({ page }) => {
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Dump", exact: true }).click();

    // Verify Dump modal
    await expect(page.getByText(/Create Database (Backup|Dump)/)).toBeVisible();
    await expect(page.getByText("Gzip Compression (--gzip)")).toBeVisible();
    await expect(page.getByText("Single Archive (--archive)")).toBeVisible();

    // Run Dump / Backup
    await page.getByRole("button", { name: /Start (Backup|Dump)/ }).click();
    await expect(page.getByText(/Create Database (Backup|Dump)/)).not.toBeVisible({ timeout: 10000 });
  });

  test("should open Import and Restore modals and execute real import and restore", async ({ page }) => {
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });

    // Test Import execution
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByText(/Import Data into/)).toBeVisible();
    await page.locator("form input[type='text']").first().fill("export_test_db_products.csv");
    await page.getByRole("button", { name: "Run Import" }).click();
    await expect(page.getByText(/Import Data into/)).not.toBeVisible({ timeout: 10000 });

    // Test Restore execution
    const restoreDbNode = page.locator("aside").getByText("test_db", { exact: true });
    await expect(restoreDbNode).toBeVisible({ timeout: 8000 });
    await restoreDbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.getByText(/Restore Database Archive/)).toBeVisible();
    await page.locator("form input[type='text']").first().fill("backup_test.dump.gz");
    await page.getByRole("button", { name: "Run Restore" }).click();
    await expect(page.getByText(/Restore Database Archive/)).not.toBeVisible({ timeout: 10000 });
  });

  test("should open Create Database modal from connection context menu and create new database", async ({ page }) => {
    const connNode = page.locator("aside").getByText("Docker Test DB", { exact: true });
    await connNode.click({ button: "right" });
    await page.getByRole("button", { name: "Create Database", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Create Database" })).toBeVisible();
    await page.getByPlaceholder("e.g. analytics_db").fill("custom_qa_db");
    await page.getByPlaceholder("e.g. events").fill("qa_events");

    await page.getByRole("button", { name: "Create Database" }).click();
    await expect(page.getByRole("heading", { name: "Create Database" })).not.toBeVisible();
    await expect(page.locator("aside").getByText("custom_qa_db")).toBeVisible({ timeout: 8000 });
  });
});
