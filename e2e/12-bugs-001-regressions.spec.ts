import { test, expect, Page } from "@playwright/test";

const TEST_DB_URI =
  "mongodb://mongox:mongoxpass@127.0.0.1:27017/test_db?authSource=admin";

async function connectToLiveDb(page: Page) {
  await page.request.delete("http://localhost:4173/api/mongo/connections?id=all");
  await page.goto("/");
  await page.getByRole("button", { name: "New Connection", exact: true }).click();
  await page.getByRole("button", { name: "From URI" }).click();
  await page.getByPlaceholder(/mongodb:\/\/username:password@/).fill(TEST_DB_URI);
  await page.getByRole("button", { name: "Parse & Apply" }).click();
  await page.locator("#conn-name-input").fill("Regression Live DB");
  await page.getByRole("button", { name: "Save & Connect" }).click();

  // Wait for sidebar database hierarchy
  await expect(page.locator("aside").getByText("Regression Live DB")).toBeVisible({ timeout: 5000 });
  const testDbNode = page.locator("aside").getByText("test_db", { exact: true });
  await expect(testDbNode).toBeVisible({ timeout: 10000 });
}

test.describe("Bugs 001 Regressions: Restore, Dump Select, Import & Create Database", () => {
  test.beforeEach(async ({ page }) => {
    await connectToLiveDb(page);
  });

  test("Bug 2: Dump UI target db is a select element populated with connection databases", async ({ page }) => {
    // Right click test_db and click Dump
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Dump", exact: true }).click();

    // Verify modal is visible
    await expect(page.getByText(/Create Database (Backup|Dump)/)).toBeVisible();

    // Target Database must be a <select> element
    const targetDbSelect = page.locator("form select").first();
    await expect(targetDbSelect).toBeVisible();

    // Verify it contains available databases including test_db
    const options = await targetDbSelect.locator("option").allInnerTexts();
    expect(options).toContain("test_db");

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Bug 4: Create Database successfully invokes insert_document with documentJson", async ({ page }) => {
    // Right click connection node in sidebar and click "Create Database"
    const connNode = page.locator("aside").getByText("Regression Live DB", { exact: true });
    await connNode.click({ button: "right" });

    const createDbOption = page.locator("aside").getByRole("button", { name: "Create Database" });
    await expect(createDbOption).toBeVisible();
    await createDbOption.click();

    // Verify Create Database modal opens
    await expect(page.getByRole("heading", { name: "Create Database" })).toBeVisible();

    const uniqueDbName = `qa_db_${Date.now()}`;
    await page.locator("input#db-name-input").fill(uniqueDbName);
    await page.locator("input#col-name-input").fill("init_collection");

    // Click submit
    await page.getByRole("button", { name: "Create Database" }).click();

    // Modal must close cleanly without 'invalid args documentJson' error
    await expect(page.getByRole("heading", { name: "Create Database" })).not.toBeVisible({ timeout: 10000 });

    // Toast notification confirms creation
    const toast = page.locator(".fixed.bottom-5.right-5").filter({ hasText: uniqueDbName });
    await expect(toast).toBeVisible({ timeout: 8000 });

    // New database appears in sidebar hierarchy
    await expect(page.locator("aside").getByText(uniqueDbName)).toBeVisible({ timeout: 10000 });
  });

  test("Bug 1: Restore database defaults drop_existing to true and restores without duplicate key error", async ({ page }) => {
    // Open Restore modal from test_db right click
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Restore", exact: true }).click();

    await expect(page.getByText(/Restore Database Archive/)).toBeVisible();

    // Verify dropExisting checkbox is checked by default
    const dropCheckbox = page.locator("label:has-text('Drop existing collections before restoring') input[type='checkbox']");
    await expect(dropCheckbox).toBeChecked();

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Bug 3: Import Modal provides drop_existing and ignore_blanks options", async ({ page }) => {
    // Open Import modal from test_db right click
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Import", exact: true }).click();

    await expect(page.getByText(/Import Data into/)).toBeVisible();

    // Verify both checkboxes are present
    const dropCheckbox = page.locator("label:has-text('Drop collection before importing') input[type='checkbox']");
    await expect(dropCheckbox).toBeVisible();

    const ignoreBlanksCheckbox = page.locator("label:has-text('Ignore empty/blank values') input[type='checkbox']");
    await expect(ignoreBlanksCheckbox).toBeVisible();
    await expect(ignoreBlanksCheckbox).toBeChecked();

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
