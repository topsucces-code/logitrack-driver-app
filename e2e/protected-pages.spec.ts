import { test, expect } from "./fixtures/auth.fixture";
import { mockSupabaseAPI } from "./helpers/mock-supabase";

test.describe("Dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for the dashboard to fully load (driver name appears)
    await expect(page.getByText(/Koné/)).toBeVisible({ timeout: 15_000 });
  });

  test("shows greeting with driver name", async ({ page }) => {
    await expect(page.getByText(/Koné/)).toBeVisible();
  });

  test("shows today earnings section", async ({ page }) => {
    // "Aujourd'hui" (FR) or "Today" (EN)
    await expect(
      page.getByRole("heading", { name: /aujourd.hui|today/i }),
    ).toBeVisible();
    await expect(page.getByText("FCFA", { exact: true })).toBeVisible();
  });

  test("shows online/offline toggle", async ({ page }) => {
    // FR: "EN LIGNE"/"HORS LIGNE", EN: "ONLINE"/"OFFLINE"
    await expect(
      page.getByText(/EN LIGNE|HORS LIGNE|ONLINE|OFFLINE/),
    ).toBeVisible();
  });

  test("shows available deliveries section", async ({ page }) => {
    // FR: "Courses disponibles"/"Aucune course disponible"
    // EN: "Available deliveries"/"No deliveries available"
    await expect(
      page.getByText(
        /courses disponibles|aucune course|available deliver|no deliver/i,
      ),
    ).toBeVisible();
  });

  test("has 5 bottom navigation tabs", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.getByRole("button")).toHaveCount(5);
  });
});

test.describe("Settings (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    // Wait for version text to confirm page loaded
    await expect(page.getByText(/LogiTrack Livreur/)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows settings header", async ({ page }) => {
    await expect(page.locator("header h1")).toBeVisible();
  });

  test("shows auto-accept toggle", async ({ page }) => {
    // FR: "Acceptation auto", EN: "Auto accept"
    await expect(page.getByText(/acceptation auto|auto accept/i)).toBeVisible();
  });

  test("shows version info", async ({ page }) => {
    await expect(page.getByText(/LogiTrack Livreur v1\.0\.0/)).toBeVisible();
  });

  test("shows tools section", async ({ page }) => {
    // FR: "Outils", EN: "Tools"
    await expect(page.getByText(/outils|tools/i)).toBeVisible();
  });
});

test.describe("Auth guard", () => {
  test("redirects unauthenticated user from /dashboard to /auth", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Mock APIs but do NOT seed auth session
    await mockSupabaseAPI(page);

    // Override auth endpoints to return unauthorized
    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant" }),
      });
    });

    await page.route("**/auth/v1/user*", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "not_authenticated" }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForURL("**/auth", { timeout: 10_000 });
    expect(page.url()).toContain("/auth");

    await context.close();
  });
});
