import { test, expect } from "@playwright/test";

test.describe("FR-CON-004: Connection Management & NoSQLBooster Editor", () => {
  test.beforeEach(async ({ page }) => {
    // Reset connections via bridge API before each test
    await page.request.delete("http://localhost:4173/api/mongo/connections?id=all");
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("AC-CON-07: First launch starts clean with zero pre-populated connections", async ({ page }) => {
    // Verify quiet empty state
    await expect(page.getByText("No Active Connection")).toBeVisible();
    await expect(page.getByText("Create or choose a MongoDB connection profile to begin exploring your databases.")).toBeVisible();

    // Verify Object Explorer has no fake seed connections
    await expect(page.locator("aside").getByText("Local MongoDB")).not.toBeVisible();
    await expect(page.locator("aside").getByText("store_db")).not.toBeVisible();
  });

  test("AC-CON-08: Connection Editor replicates tabs matching clean ergonomic standard", async ({ page }) => {
    // Open Connection Editor via New Connection button
    await page.getByRole("button", { name: "New Connection", exact: true }).click();

    // Verify Title Bar
    await expect(page.getByText(/Connection Editor -/)).toBeVisible();

    // Verify tabs
    await expect(page.getByRole("button", { name: "Basic", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "SSL", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "SSH", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "In-Use Encryption", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "More", exact: true })).toBeVisible();

    // Check Basic tab fields (includes server and merged authentication)
    await expect(page.locator("select").first()).toHaveValue("direct");
    await expect(page.locator("#conn-host-input")).toBeVisible();
    await expect(page.locator("#conn-port-input")).toBeVisible();
    await expect(page.getByText("SRV Record")).toBeVisible();
    await expect(page.getByPlaceholder("mongox or admin")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByPlaceholder("admin", { exact: true })).toBeVisible();
    await expect(page.getByText("Make Connection/Database to Read Only")).toBeVisible();

    // Check SSL tab fields
    await page.getByRole("button", { name: "SSL", exact: true }).click();
    await expect(page.getByText("Use SSL / TLS Encryption")).toBeVisible();

    // Check SSH tab fields
    await page.getByRole("button", { name: "SSH", exact: true }).click();
    await expect(page.getByText("Use SSH Tunnel")).toBeVisible();

    // Check In-Use Encryption tab fields
    await page.getByRole("button", { name: "In-Use Encryption", exact: true }).click();
    await expect(page.getByText("Enable Client-Side Field Level Encryption (CSFLE)")).toBeVisible();

    // Check More tab fields
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByPlaceholder("e.g. test_db")).toBeVisible();
    await expect(page.getByText("Connect Timeout")).toBeVisible();
    await expect(page.getByText("Read Preference")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/Connection Editor -/)).not.toBeVisible();
  });

  test("AC-CON-09: Bidirectional URI translation (From URI and To URI) and live ping", async ({ page }) => {
    await page.getByRole("button", { name: "New Connection", exact: true }).click();

    // Click 'From URI'
    await page.getByRole("button", { name: "From URI" }).click();
    await expect(page.getByText("Import from Connection String (URI)")).toBeVisible();

    // Paste real Docker MongoDB URI
    const targetUri = "mongodb://mongox:mongoxpass@127.0.0.1:27017/test_db?authSource=admin";
    await page.getByPlaceholder(/mongodb:\/\/username:password@/).fill(targetUri);
    await page.getByRole("button", { name: "Parse & Apply" }).click();

    // Verify fields populated
    await expect(page.locator("#conn-host-input")).toHaveValue("127.0.0.1");
    await expect(page.locator("#conn-port-input")).toHaveValue("27017");

    // Click 'Test Connection' and verify real ping round-trip
    await page.getByRole("button", { name: "Test Connection" }).click();
    await expect(page.getByText(/Connected successfully \(7\./)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/● \d+ ms/)).toBeVisible();

    // Click 'To URI' and verify success toast
    await page.getByRole("button", { name: "To URI" }).click();
    await expect(page.getByText("URI copied to clipboard.")).toBeVisible();

    // Click 'Cancel'
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("AC-CON-10: Save & Connect saves profile and immediately connects to live database", async ({ page }) => {
    await page.getByRole("button", { name: "New Connection", exact: true }).click();

    // Populate via 'From URI'
    await page.getByRole("button", { name: "From URI" }).click();
    await page.getByPlaceholder(/mongodb:\/\/username:password@/).fill(
      "mongodb://mongox:mongoxpass@127.0.0.1:27017/test_db?authSource=admin"
    );
    await page.getByRole("button", { name: "Parse & Apply" }).click();

    // Set Name
    await page.locator("#conn-name-input").fill("Docker Test DB");

    // Click 'Save & Connect'
    await page.getByRole("button", { name: "Save & Connect" }).click();

    // Modal closes
    await expect(page.getByText(/Connection Editor -/)).not.toBeVisible();

    // Connection appears in Object Explorer with LOCAL badge
    await expect(page.locator("aside").getByText("Docker Test DB")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("aside").getByText("LOCAL", { exact: true })).toBeVisible();

    // Real hierarchy loads into Object Explorer
    await expect(page.locator("aside").getByText("test_db", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("aside").getByText("customers")).toBeVisible();
    await expect(page.locator("aside").getByText("products")).toBeVisible();
    await expect(page.locator("aside").getByText("orders")).toBeVisible();
    await expect(page.locator("aside").getByText("large_dataset")).toBeVisible();
  });
});
