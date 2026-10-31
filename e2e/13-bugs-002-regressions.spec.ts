import { test, expect, Page } from "@playwright/test";

const TEST_DB_URI =
  "mongodb://mongox:mongoxpass@127.0.0.1:27017/test_db?authSource=admin";

async function connectToDockerDb(page: Page) {
  await page.request.delete("http://localhost:4173/api/mongo/connections?id=all");
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection", exact: true }).click();
  await page.getByRole("button", { name: "From URI" }).click();
  await page.getByPlaceholder(/mongodb:\/\/username:password@/).fill(TEST_DB_URI);
  await page.getByRole("button", { name: "Parse & Apply" }).click();
  await page.locator("#conn-name-input").fill("Docker Test DB");
  await page.getByRole("button", { name: "Save & Connect" }).click();

  // Wait for sidebar database hierarchy
  await expect(page.locator("aside").getByText("Docker Test DB")).toBeVisible({ timeout: 6000 });
  await expect(page.locator("aside").getByText("test_db", { exact: true })).toBeVisible({ timeout: 10000 });
}

test.describe("Bugs 002 Regressions: Restore Target DB, Export DB Conflict, and Sidebar Refresh Actions", () => {
  test.beforeEach(async ({ page }) => {
    await connectToDockerDb(page);
  });

  test("1. Restore into a new database name (test_123) refreshes hierarchy and displays test_123 in sidebar", async ({ page }) => {
    // Open Restore modal from toolbar or context menu
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Restore", exact: true }).click();

    // Verify Restore modal is open
    await expect(page.getByText(/Restore Database Archive/)).toBeVisible();

    // Change target database name to test_123
    const targetDbInput = page.getByPlaceholder("Target Database Name (e.g. store_db)");
    await targetDbInput.fill("test_123");

    // Run Restore
    const runRestoreBtn = page.getByRole("button", { name: "Run Restore" });
    await runRestoreBtn.click();

    // Modal closes upon success
    await expect(page.getByText(/Restore Database Archive/)).not.toBeVisible({ timeout: 10000 });

    // Toast notification confirms restore
    await expect(page.locator(".fixed.bottom-5.right-5").filter({ hasText: /test_123/i })).toBeVisible({ timeout: 8000 });

    // Sidebar hierarchy now contains test_123
    const newDbNode = page.locator("aside").getByText("test_123", { exact: true });
    await expect(newDbNode).toBeVisible({ timeout: 10000 });
  });

  test("2. Export from database completes without URI conflict error", async ({ page }) => {
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Export", exact: true }).click();

    // Verify Export Modal opens
    await expect(page.getByText(/Export Collection Data/)).toBeVisible();

    // Click Start Export
    await page.getByRole("button", { name: "Start Export" }).click();

    // Ensure no error toast about "Cannot specify different database in connection URI"
    await expect(page.locator("body")).not.toContainText("Cannot specify different database in connection URI");

    // Success toast appears
    await expect(page.locator(".fixed.bottom-5.right-5").filter({ hasText: /Export completed successfully/i })).toBeVisible({ timeout: 8000 });
  });

  test("3. Refresh button in context menu for Connections, Databases, and Collections", async ({ page }) => {
    // 3a. Connection Context Menu Refresh
    const connNode = page.locator("aside").getByText("Docker Test DB", { exact: true });
    await connNode.click({ button: "right" });
    const connRefresh = page.locator("aside").getByRole("button", { name: "Refresh", exact: true });
    await expect(connRefresh).toBeVisible();
    await connRefresh.click();
    await expect(page.locator(".fixed.bottom-5.right-5").filter({ hasText: /Connection hierarchy refreshed/i })).toBeVisible({ timeout: 5000 });

    // 3b. Database Context Menu Refresh
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    const dbRefresh = page.locator("aside").getByRole("button", { name: "Refresh", exact: true });
    await expect(dbRefresh).toBeVisible();
    await dbRefresh.click();
    await expect(page.locator(".fixed.bottom-5.right-5").filter({ hasText: /Database "test_db" refreshed/i })).toBeVisible({ timeout: 5000 });

    // Expand test_db to show collections
    await dbNode.click();
    const colNode = page.locator("aside").getByText("products", { exact: true });
    await expect(colNode).toBeVisible({ timeout: 5000 });

    // 3c. Collection Context Menu Refresh
    await colNode.click({ button: "right" });
    const colRefresh = page.locator("aside").getByRole("button", { name: "Refresh", exact: true });
    await expect(colRefresh).toBeVisible();
    await colRefresh.click();
    await expect(page.locator(".fixed.bottom-5.right-5").filter({ hasText: /Collection "test_db.products" refreshed/i })).toBeVisible({ timeout: 5000 });

    // Verify hover refresh buttons are removed from item rows (kept only in context menu)
    await expect(page.getByTitle("Refresh connection")).not.toBeAttached();
    await expect(page.getByTitle("Refresh database")).not.toBeAttached();
    await expect(page.getByTitle("Refresh collection")).not.toBeAttached();
  });
});
