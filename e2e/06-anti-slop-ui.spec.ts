import { test, expect } from "@playwright/test";

test.describe("Anti-AI-Slop & Utilitarian Cleanliness Standards (/design-taste-frontend)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should have exactly ONE authoritative Settings trigger on the entire screen (in the Sidebar header)", async ({ page }) => {
    // Locate all buttons with title 'Settings'
    const settingsButtons = page.locator("button[title='Settings']");
    const count = await settingsButtons.count();

    // Exactly one trigger permitted
    expect(count).toBe(1);

    // Verify it is inside sidebar header
    await expect(page.locator("aside button[title='Settings']")).toBeVisible();

    // Verify top header is removed
    await expect(page.locator("header")).not.toBeVisible();
  });

  test("should purge tech-stack flex badges, search bar clutter, and meaningless filler", async ({ page }) => {
    // Purged tech stack flex badge
    await expect(page.getByText("Tauri v2 + Rust")).not.toBeVisible();

    // Purged decorative search bar
    await expect(page.getByPlaceholder("Search databases, collections, vv...")).not.toBeVisible();

    // Purged open backup button from sidebar footer
    await expect(page.locator("aside").getByRole("button", { name: /Open Backups/ })).not.toBeVisible();
  });

  test("should enforce strict ban on em-dashes across rendered UI text", async ({ page }) => {
    // Scan all text content in the body for em-dashes (—)
    const hasEmDash = await page.evaluate(() => {
      const allText = document.body.innerText || "";
      return allText.includes("—");
    });

    expect(hasEmDash).toBe(false);
  });
});
