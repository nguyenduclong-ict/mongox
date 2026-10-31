import { test, expect, Page } from "@playwright/test";

const TEST_DB_URI =
  "mongodb://mongox:mongoxpass@127.0.0.1:27017/test_db?authSource=admin";

async function connectAndOpenCollection(page: Page, collectionName = "products") {
  await page.request.delete("http://localhost:4173/api/mongo/connections?id=all");
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection", exact: true }).click();
  await page.getByRole("button", { name: "From URI" }).click();
  await page.getByPlaceholder(/mongodb:\/\/username:password@/).fill(TEST_DB_URI);
  await page.getByRole("button", { name: "Parse & Apply" }).click();
  await page.locator("#conn-name-input").fill("Docker Test DB");
  await page.getByRole("button", { name: "Save & Connect" }).click();

  // Wait for sidebar database hierarchy
  await expect(page.locator("aside").getByText("Docker Test DB")).toBeVisible({ timeout: 5000 });
  const testDbNode = page.locator("aside").getByText("test_db", { exact: true });
  await expect(testDbNode).toBeVisible({ timeout: 10000 });
  await testDbNode.click();

  // Click collection to open in workspace tab
  const colNode = page.locator("aside").getByText(collectionName, { exact: true });
  await expect(colNode).toBeVisible({ timeout: 5000 });
  await colNode.click();

  // Wait for table headers
  await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
}

test.describe("Dump, Restore, Dynamic Export Schema & Global Toast Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await connectAndOpenCollection(page, "products");
  });

  test("1 & 2: Collection workspace has 'Dump' button and adjacent 'Restore' button", async ({ page }) => {
    // Locate the toolbar in CollectionWorkspace
    const dumpBtn = page.getByRole("button", { name: "Dump", exact: true });
    const restoreBtn = page.getByRole("button", { name: "Restore", exact: true });

    await expect(dumpBtn).toBeVisible();
    await expect(restoreBtn).toBeVisible();

    // Verify 'Backup' label is not present in workspace action buttons
    const backupBtn = page.getByRole("button", { name: "Backup", exact: true });
    await expect(backupBtn).not.toBeVisible();
  });

  test("3: Dump execution triggers global floating success toast", async ({ page }) => {
    const dumpBtn = page.getByRole("button", { name: "Dump", exact: true });
    await dumpBtn.click();

    // Verify Dump Modal opens with title
    await expect(page.getByText(/Create Database (Backup|Dump)/)).toBeVisible();
    const startDumpBtn = page.getByRole("button", { name: /Start (Dump|Backup)/ });
    await expect(startDumpBtn).toBeVisible();

    // Click Start Dump
    await startDumpBtn.click();

    // Modal closes
    await expect(page.getByText(/Create Database (Backup|Dump)/)).not.toBeVisible({ timeout: 10000 });

    // Success toast notification appears
    const toast = page.locator(".fixed.bottom-5.right-5").filter({ hasText: /dump|backup/i });
    await expect(toast).toBeVisible({ timeout: 8000 });
  });

  test("4 & 5: Export Modal dynamically discovers real collection fields and shows success toast", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: "Export", exact: true });
    await exportBtn.click();

    // Verify Export Modal opens
    await expect(page.getByText(/Export Collection Data/)).toBeVisible();

    // Verify dynamically discovered fields from 'products' collection (e.g. sku, title, price, category, stock)
    await expect(page.getByRole("button", { name: "_id", exact: true })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("button", { name: "sku", exact: true })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("button", { name: "title", exact: true })).toBeVisible({ timeout: 6000 });

    // Verify 'Select All' and 'Deselect All' controls
    const selectAllBtn = page.getByRole("button", { name: "Select All", exact: true });
    const deselectAllBtn = page.getByRole("button", { name: "Deselect All", exact: true });
    await expect(selectAllBtn).toBeVisible();
    await expect(deselectAllBtn).toBeVisible();

    // Toggle Deselect All
    await deselectAllBtn.click();
    await expect(page.getByText(/Included Fields \(0\//)).toBeVisible();

    // Toggle Select All
    await selectAllBtn.click();
    await expect(page.getByText(/Included Fields \(0\//)).not.toBeVisible();

    // Run export
    const startExportBtn = page.getByRole("button", { name: "Start Export" });
    await startExportBtn.click();

    // Modal closes
    await expect(page.getByText(/Export Collection Data/)).not.toBeVisible({ timeout: 10000 });

    // Success toast appears
    const toast = page.locator(".fixed.bottom-5.right-5").filter({ hasText: /export/i });
    await expect(toast).toBeVisible({ timeout: 8000 });
  });

  test("Restore button opens RestoreModal cleanly", async ({ page }) => {
    const restoreBtn = page.getByRole("button", { name: "Restore", exact: true });
    await restoreBtn.click();

    // Verify Restore modal opens
    await expect(page.getByText(/Restore Database Archive/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/Restore Database Archive/)).not.toBeVisible();
  });
});
