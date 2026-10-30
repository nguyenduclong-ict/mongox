import { test, expect } from "@playwright/test";

test.describe("Connection Lifecycle & Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should display existing connections in Object Explorer", async ({ page }) => {
    await expect(page.locator("aside").getByText("Object Explorer")).toBeVisible();
    await expect(page.locator("aside").getByText("Local MongoDB")).toBeVisible();
  });

  test("should open New Connection modal and validate form inputs", async ({ page }) => {
    // Click the "+" button on Object Explorer header
    await page.getByTitle("Add New Connection Profile").click();

    // Verify modal elements
    await expect(page.getByText("New MongoDB Connection")).toBeVisible();
    await expect(page.locator("#profile-label")).toBeVisible();
    await expect(page.locator("#env-tag")).toBeVisible();

    // Switch between URI and Detailed Parameters tabs
    await page.getByRole("button", { name: "Detailed Parameters" }).click();
    await expect(page.getByPlaceholder("localhost")).toBeVisible();
    await expect(page.getByPlaceholder("27017")).toBeVisible();
    await expect(page.getByText("Enable TLS / SSL Connection")).toBeVisible();

    await page.getByRole("button", { name: "Connection String (URI)" }).click();
    await expect(page.getByPlaceholder(/mongodb:\/\/localhost:27017/)).toBeVisible();
  });

  test("should show Production Guard warning when selecting Production environment", async ({ page }) => {
    await page.getByTitle("Add New Connection Profile").click();

    // Select 'Production' in Environment Tag dropdown
    await page.locator("#env-tag").selectOption("production");

    // Verify Production Guard warning banner appears
    await expect(page.getByText("Production Guard Enabled:")).toBeVisible();
  });

  test("should test connection ping and display latency status", async ({ page }) => {
    await page.getByTitle("Add New Connection Profile").click();

    // Click 'Test Connection'
    await page.getByRole("button", { name: "Test Connection" }).click();

    // Ping status should render
    await expect(page.getByText(/Connected successfully|● \d+ ms/).first()).toBeVisible();
  });

  test("should cancel and close Connection modal", async ({ page }) => {
    await page.getByTitle("Add New Connection Profile").click();
    await expect(page.getByText("New MongoDB Connection")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("New MongoDB Connection")).not.toBeVisible();
  });
});
