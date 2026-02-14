import { test, expect } from "./fixtures/auth.fixture";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/Koné/)).toBeVisible({ timeout: 15_000 });
  });

  test("settings button navigates to settings", async ({ page }) => {
    // Header structure: div > [avatar group] [action buttons: notif, refresh, settings]
    // Then below that: [online toggle button]
    // We need the 3rd action button (settings), not the toggle
    // The action buttons are inside the first div of header
    const actionButtons = page.locator("header > :first-child button");
    const count = await actionButtons.count();
    await actionButtons.nth(count - 1).click();
    await page.waitForURL("**/settings", { timeout: 10_000 });
    expect(page.url()).toContain("/settings");
  });

  test("settings back button returns to dashboard", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/LogiTrack Livreur/)).toBeVisible({
      timeout: 15_000,
    });

    // Click the back button (first button in header)
    const backButton = page.locator("header button").first();
    await backButton.click();
    await page.waitForURL(/\/$/, { timeout: 10_000 });
  });

  test("bottom nav navigates to history", async ({ page }) => {
    const nav = page.locator("nav");
    // Click the "Historique"/"History" tab
    await nav.getByRole("button", { name: /historique|history/i }).click();
    await page.waitForURL("**/history", { timeout: 10_000 });
    expect(page.url()).toContain("/history");
  });

  test("bottom nav navigates to earnings", async ({ page }) => {
    const nav = page.locator("nav");
    // Click the "Gains"/"Earnings" tab
    await nav.getByRole("button", { name: /gains|earnings/i }).click();
    await page.waitForURL("**/earnings", { timeout: 10_000 });
    expect(page.url()).toContain("/earnings");
  });
});
