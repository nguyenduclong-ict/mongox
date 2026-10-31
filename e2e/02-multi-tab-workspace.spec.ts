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

test.describe("Multi-Tab Workspace & Parallel Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should open collections into independent workspace tabs and switch smoothly", async ({ page }) => {
    // Click 'customers' collection in Object Explorer
    await page.locator("aside").getByText("customers", { exact: true }).click();

    // Verify 'customers' tab is created in tab bar
    const customersTab = page.locator("[data-testid='workspace-tab']").filter({ hasText: "customers" });
    await expect(customersTab).toBeVisible({ timeout: 5000 });

    // Verify customer documents load into the table
    await expect(page.getByRole("button", { name: "Insert Document" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/\d+ documents/)).toBeVisible();

    // Click 'orders' collection in Object Explorer
    await page.locator("aside").getByText("orders", { exact: true }).click();

    // Verify 'orders' tab is created alongside 'customers'
    const ordersTab = page.locator("[data-testid='workspace-tab']").filter({ hasText: "orders" });
    await expect(ordersTab).toBeVisible({ timeout: 5000 });

    // Switch back to 'customers' tab
    await customersTab.click();
    await expect(page.locator("main").getByText("customers", { exact: true }).first()).toBeVisible();

    // Switch to 'orders' tab
    await ordersTab.click();
    await expect(page.locator("main").getByText("orders", { exact: true }).first()).toBeVisible();

    // Close 'customers' tab using its close button
    await customersTab.locator("button[title='Close Tab']").click();
    await expect(customersTab).not.toBeVisible();
  });
});
