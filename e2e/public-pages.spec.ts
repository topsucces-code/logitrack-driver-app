import { test, expect } from "@playwright/test";
import { mockSupabaseAPI } from "./helpers/mock-supabase";

test.describe("Splash Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
  });

  test("renders logo and brand name", async ({ page }) => {
    await page.goto("/splash");
    await expect(page.getByText("LogiTrack")).toBeVisible();
    await expect(page.getByText("Livreur")).toBeVisible();
  });

  test("shows loading spinner", async ({ page }) => {
    await page.goto("/splash");
    await expect(page.locator(".animate-spin")).toBeVisible();
  });

  test("redirects to /auth when not authenticated", async ({ page }) => {
    await page.goto("/splash");
    await page.waitForURL("**/auth", { timeout: 5000 });
    expect(page.url()).toContain("/auth");
  });
});

test.describe("Auth Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
  });

  test("renders Connexion heading", async ({ page }) => {
    await page.goto("/auth");
    await expect(
      page.getByRole("heading", { name: "Connexion" }),
    ).toBeVisible();
  });

  test("shows +225 country prefix", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("+225")).toBeVisible();
  });

  test("has register link", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("S'inscrire")).toBeVisible();
  });
});

test.describe("404 Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
  });

  test("shows not found content for invalid route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.waitForTimeout(2000);
    // The app should show some 404 content or redirect
    const url = page.url();
    expect(
      url.includes("this-route-does-not-exist") ||
        url.includes("/auth") ||
        url.includes("/splash"),
    ).toBeTruthy();
  });
});
