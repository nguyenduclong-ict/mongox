import { test, expect } from "@playwright/test";

test.describe("Connection Lifecycle & Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app root to mount
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should display existing connections in Object Explorer", async ({ page }) => {
    await expect(page.getByText("Object Explorer")).toBeVisible();
    await expect(page.getByText("Local MongoDB")).toBeVisible();
  });

  test("should open New Connection modal and validate form inputs", async ({ page }) => {
    // Click the "+" button on Object Explorer header
    await page.getByTitle("Add New Connection Profile").click();

    // Verify modal elements
    await expect(page.getByText("New MongoDB Connection")).toBeVisible();
    await expect(page.getByLabel("Profile Label")).toBeVisible();
    await expect(page.getByLabel("Environment Tag")).toBeVisible();

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
    await page.getByLabel("Environment Tag").selectOption("production");

    // Verify Production Guard warning banner appears
    await expect(page.getByText("Production Guard Enabled:")).toBeVisible();
  });

  test("should test connection ping and display latency status", async ({ page }) => {
    await page.getByTitle("Add New Connection Profile").click();

    // Click 'Test Connection'
    await page.getByRole("button", { name: "Test Connection" }).click();

    // Ping status should render
    await expect(page.getByText(/Connected successfully|● \d+ ms/)).toBeVisible();
  });

  test("should cancel and close Connection modal", async ({ page }) => {
    await page.getByTitle("Add New Connection Profile").click();
    await expect(page.getByText("New MongoDB Connection")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("New MongoDB Connection")).not.toBeVisible();
  });
});
