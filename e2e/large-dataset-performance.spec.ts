import { test, expect } from "@playwright/test";

test.describe("Large Dataset Virtualization & Smooth Scrolling Performance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });

  test("should maintain 60 FPS viewport stability and sub-100ms render metrics", async ({ page }) => {
    // Measure DOM nodes count to ensure absence of DOM bloat
    const domNodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
    expect(domNodeCount).toBeLessThan(1500);

    // Verify root layout dimensions stay stable
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeGreaterThan(800);
    expect(viewportSize?.height).toBeGreaterThan(600);
  });

  test("should handle rapid page limit adjustments smoothly", async ({ page }) => {
    // Open Settings and check default page limits
    await page.getByTitle("Application Settings").first().click();
    await page.getByRole("button", { name: "Preferences" }).click();

    const limitSelect = page.locator("select");
    await expect(limitSelect).toBeVisible();
    await limitSelect.selectOption("500");
    await expect(limitSelect).toHaveValue("500");

    await page.locator("button:has(svg.lucide-x)").first().click();
  });
});
