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

test.describe("Large Dataset Virtualization & Query Performance (5,000 Records)", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should handle 5,000 documents with virtualized table, query filter, and explain plan", async ({ page }) => {
    // Open 'large_dataset' collection
    await page.locator("aside").getByText("large_dataset", { exact: true }).click();

    // Verify records count badge
    await expect(page.getByText(/of \d+,\d+ documents/)).toBeVisible({ timeout: 8000 });

    // Measure DOM elements count: virtualizer must keep rendered rows under 200 DOM nodes
    const rowCount = await page.locator("tbody tr").count();
    expect(rowCount).toBeLessThanOrEqual(100);

    // Scroll virtualized container down
    const tableContainer = page.locator(".overflow-auto").first();
    await tableContainer.evaluate((el) => {
      el.scrollTop = 1000;
    });

    // Test query filter: find Company 1
    const queryInput = page.getByPlaceholder(/Filter:/);
    await queryInput.fill(JSON.stringify({ company: "Company 1" }));
    await page.getByRole("button", { name: /Run/ }).click();

    // Verify filtered results
    await expect(page.getByText("Company 1").first()).toBeVisible({ timeout: 5000 });

    // Test Explain Plan
    await page.getByRole("button", { name: "Explain" }).click();
    await expect(page.getByText("Visual Query Profiler & Explain Plan")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Docs Examined")).toBeVisible();
  });
});
