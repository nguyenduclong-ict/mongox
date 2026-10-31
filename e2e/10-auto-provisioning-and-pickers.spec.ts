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

test.describe("Target Collections Bulk Selection, File Pickers & Modal Ergonomics", () => {
  test.beforeEach(async ({ page }) => {
    await connectToTestDb(page);
  });

  test("should toggle Select All and Deselect All for Target Collections and provide file/folder picker buttons", async ({ page }) => {
    // Right-click 'test_db' and open Dump modal
    const dbNode = page.locator("aside").getByText("test_db", { exact: true });
    await dbNode.click({ button: "right" });
    await page.locator("aside").getByRole("button", { name: "Dump", exact: true }).click();

    await expect(page.getByText(/Create Database (Backup|Dump)/)).toBeVisible();

    // Verify softened backdrop (bg-black/45)
    const modalBackdrop = page.locator(".fixed.inset-0").first();
    const backdropClasses = await modalBackdrop.getAttribute("class");
    expect(backdropClasses).toContain("bg-black/45");

    // Click 'Select All' on Target Collections
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await expect(page.getByText(/\d+ selected/)).toBeVisible();

    // Click 'Deselect All'
    await page.getByRole("button", { name: "Deselect All" }).click();
    await expect(page.getByText("All collections")).toBeVisible();

    // Verify folder picker button is visible beside Destination Archive Path
    const folderPicker = page.getByTitle("Select Destination Folder");
    await expect(folderPicker).toBeVisible();

    // Close Backup modal
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
