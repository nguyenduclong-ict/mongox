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

test.describe("Real Database Operations: Document CRUD in Live MongoDB", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should insert, inspect, double-click inline edit, and delete real document", async ({ page }) => {
    // Open 'customers' collection
    await page.locator("aside").getByText("customers", { exact: true }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Step 1: Insert New Document
    await page.locator("button:has-text('Insert Document')").first().click();
    await expect(page.getByText("Insert New Document")).toBeVisible();

    const uniqueName = `QA_User_${Date.now()}`;
    const payload = JSON.stringify(
      {
        name: uniqueName,
        email: `${uniqueName}@mongox.io`,
        tier: "platinum",
        status: "active",
      },
      null,
      2
    );

    const textarea = page.locator("form textarea");
    await textarea.fill(payload);
    await page.locator("form button[type='submit']").click();

    // Verify modal closes
    await expect(page.getByText("Insert New Document")).not.toBeVisible();

    // Step 2: Query for the inserted document
    const queryInput = page.getByPlaceholder(/Filter:/);
    await queryInput.fill(JSON.stringify({ name: uniqueName }));
    await page.getByRole("button", { name: /Run/ }).click();

    // Verify record renders in table
    await expect(page.getByText(uniqueName, { exact: true })).toBeVisible({ timeout: 5000 });

    // Step 3: Edit Document via row context menu
    await page.locator("tbody tr").first().click({ button: "right" });
    await page.getByRole("button", { name: "Edit Document", exact: true }).click();
    await expect(page.getByText(/Edit Document/)).toBeVisible();

    const editPayload = JSON.stringify(
      {
        name: `${uniqueName}_EDITED`,
        email: `${uniqueName}@mongox.io`,
        tier: "diamond",
        status: "active",
      },
      null,
      2
    );
    await page.locator("form textarea").fill(editPayload);
    await page.locator("form button[type='submit']").click();

    // Query with the edited name
    await queryInput.fill(JSON.stringify({ name: `${uniqueName}_EDITED` }));
    await page.getByRole("button", { name: /Run/ }).click();

    // Verify edited value appears in table
    await expect(page.getByText(`${uniqueName}_EDITED`, { exact: true })).toBeVisible({ timeout: 5000 });

    // Step 4: Delete the document via row context menu
    await page.locator("tbody tr").first().click({ button: "right" });
    await page.getByRole("button", { name: "Delete Document", exact: true }).click();

    // Confirm deletion in Safety Confirmation Modal
    await expect(page.getByText("Delete Document?")).toBeVisible();
    await page.locator("button:has-text('Delete Document')").last().click();

    // Re-run query to verify it is gone from the real collection
    await page.getByRole("button", { name: /Run/ }).click();
    await expect(page.getByText(`${uniqueName}_EDITED`, { exact: true })).not.toBeVisible();
  });
});
