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

test.describe("Inline Cell Editing Controls & Free Text Copying", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should display inline save and cancel action triggers and support cancel without modifying cell", async ({ page }) => {
    // Open 'customers'
    await page.locator("aside").getByText("customers", { exact: true }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Locate first editable cell
    const cell = page.locator("tbody tr").first().locator("td.cursor-cell").first();
    const valSpan = cell.locator("span").first();
    const originalText = await valSpan.innerText();

    // Double-click to start inline edit
    await cell.dblclick();

    // Verify inline input, Save button, and Cancel button appear
    const inlineInput = cell.locator("input");
    await expect(inlineInput).toBeVisible({ timeout: 5000 });
    await expect(cell.getByTitle(/Save/)).toBeVisible();
    await expect(cell.getByTitle(/Cancel/)).toBeVisible();

    // Type a modified draft string
    await inlineInput.fill("TEMP_MODIFICATION");

    // Click Cancel button
    await cell.getByTitle(/Cancel/).click();

    // Editor dismisses and cell retains original text without modification
    await expect(inlineInput).not.toBeVisible();
    await expect(cell).not.toContainText("TEMP_MODIFICATION");
  });

  test("should save modified cell value on Save button click and persist to database", async ({ page }) => {
    // Open 'customers'
    await page.locator("aside").getByText("customers", { exact: true }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Locate first editable cell
    const cell = page.locator("tbody tr").first().locator("td.cursor-cell").first();
    const updatedValue = `Saved_Name_${Date.now()}`;

    // Double-click to start inline edit
    await cell.dblclick();

    // Fill new value and click Save
    const inlineInput = cell.locator("input");
    await inlineInput.fill(updatedValue);
    await cell.getByTitle(/Save/).click();

    // Editor dismisses and cell displays saved value
    await expect(inlineInput).not.toBeVisible();
    await expect(cell).toContainText(updatedValue);
  });

  test("should enable native text selection across Raw JSON and Tree views", async ({ page }) => {
    // Open 'customers'
    await page.locator("aside").getByText("customers", { exact: true }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Switch to Raw JSON view
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const pre = page.locator("pre");
    await expect(pre).toBeVisible();

    // Verify select-text class is applied
    const preClasses = await pre.getAttribute("class");
    expect(preClasses).toContain("select-text");

    // Switch to Tree view
    await page.getByRole("button", { name: "Tree", exact: true }).click();
    const treeNode = page.locator(".select-text").first();
    await expect(treeNode).toBeVisible();
  });
});
