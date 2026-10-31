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

test.describe("MongoDB Database User & Role Management", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should open User Management modal from database context menu, add user with roles, and drop user", async ({ page }) => {
    // Right click 'test_db' in Object Explorer
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });

    // Click 'Manage Users'
    await page.locator("aside").getByRole("button", { name: "Manage Users", exact: true }).click();

    // Verify User Management Modal opens
    await expect(page.getByText(/Database Users:/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Add User" })).toBeVisible();

    // Open Add User form
    await page.getByRole("button", { name: "Add User" }).click();
    await expect(page.getByText("Create New Database User")).toBeVisible();

    // Fill form
    const uniqueUser = `testuser_${Date.now()}`;
    await page.getByPlaceholder("e.g. app_service").fill(uniqueUser);
    await page.getByPlaceholder("••••••••").last().fill("secretPass123!");

    // Save User
    await page.getByRole("button", { name: "Save User" }).click();

    // Verify user appears in account list
    await expect(page.locator(".font-semibold.font-mono").filter({ hasText: uniqueUser })).toBeVisible({ timeout: 8000 });

    // Drop User
    const dropBtn = page.getByTitle("Delete User").last();
    await dropBtn.click();
    await expect(page.getByText(/Permanently drop user/)).toBeVisible();

    await page.getByRole("button", { name: "Drop User" }).click();
    await expect(page.locator(".font-semibold.font-mono").filter({ hasText: uniqueUser })).not.toBeVisible({ timeout: 5000 });

    // Close modal
    await page.locator("button:has(svg.lucide-x)").last().click();
    await expect(page.getByText(/Database Users:/)).not.toBeVisible();
  });
});
