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

test.describe("Document Explorer Pagination & Multi-Record Batch Actions", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should navigate pages, change page sizes, and jump to specific page across 5,000 records", async ({ page }) => {
    // Open 'large_dataset'
    await page.locator("aside").getByText("large_dataset", { exact: true }).click();
    await expect(page.getByText(/of \d+,\d+ documents/)).toBeVisible({ timeout: 8000 });

    // Step 1: Verify initial pagination state (Page 1)
    await expect(page.getByText(/1 - 50 of \d+,\d+ documents/)).toBeVisible();
    await expect(page.getByTitle("Previous Page")).toBeDisabled();

    // Step 2: Navigate to Next Page
    await page.getByTitle("Next Page").click();
    await expect(page.getByText(/51 - 100 of \d+,\d+ documents/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByTitle("Previous Page")).toBeEnabled();

    // Step 3: Jump to Page 5
    const pageInput = page.locator("input[type='number']").first();
    await pageInput.fill("5");
    await pageInput.press("Enter");
    await expect(page.getByText(/201 - 250 of \d+,\d+ documents/)).toBeVisible({ timeout: 5000 });

    // Step 4: Change page size to 100
    const pageSizeSelect = page.locator("select").filter({ hasText: /50/ }).first();
    await pageSizeSelect.selectOption("100");
    await expect(page.getByText(/1 - 100 of \d+,\d+ documents/)).toBeVisible({ timeout: 5000 });
  });

  test("should multi-select rows with header checkbox and trigger batch copy/deselect", async ({ page }) => {
    // Open 'customers'
    await page.locator("aside").getByText("customers", { exact: true }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Header checkbox: Select all rows on current page
    const headerCheckbox = page.locator("thead th input[type='checkbox']");
    await headerCheckbox.check({ force: true });

    // Floating batch ribbon appears
    await expect(page.getByText(/documents selected/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Copy IDs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete Selected" })).toBeVisible();

    // Trigger Copy IDs
    await page.getByRole("button", { name: "Copy IDs" }).click();
    await expect(page.getByText(/Copied \d+ IDs/)).toBeVisible({ timeout: 5000 });

    // Deselect all
    await page.getByRole("button", { name: "Deselect All" }).click();
    await expect(page.getByText(/documents selected/)).not.toBeVisible();
  });
});
