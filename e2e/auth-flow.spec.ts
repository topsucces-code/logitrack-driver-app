import { test, expect } from "@playwright/test";
import { mockSupabaseAPI } from "./helpers/mock-supabase";

test.describe("Phone Auth Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.goto("/auth");
  });

  test("phone input accepts and formats digits", async ({ page }) => {
    const input = page.locator('input[type="tel"]');
    await input.fill("0701020304");
    await expect(input).toHaveValue("07 01 02 03 04");
  });

  test("send button is disabled when phone is too short", async ({ page }) => {
    const input = page.locator('input[type="tel"]');
    await input.fill("070102");
    const sendButton = page.getByRole("button", { name: /recevoir le code/i });
    await expect(sendButton).toBeDisabled();
  });

  test("send button is enabled with valid phone number", async ({ page }) => {
    const input = page.locator('input[type="tel"]');
    await input.fill("0701020304");
    const sendButton = page.getByRole("button", { name: /recevoir le code/i });
    await expect(sendButton).toBeEnabled();
  });

  test("transitions to OTP step after sending code", async ({ page }) => {
    const input = page.locator('input[type="tel"]');
    await input.fill("0701020304");
    const sendButton = page.getByRole("button", { name: /recevoir le code/i });
    await sendButton.click();

    // Should show "Vérification" heading
    await expect(
      page.getByRole("heading", { name: "Vérification" }),
    ).toBeVisible();
    // Should show 6 OTP inputs
    const otpInputs = page.locator(".otp-input");
    await expect(otpInputs).toHaveCount(6);
  });

  test("OTP inputs auto-focus to next on digit entry", async ({ page }) => {
    // Go to OTP step first
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill("0701020304");
    await page.getByRole("button", { name: /recevoir le code/i }).click();
    await expect(
      page.getByRole("heading", { name: "Vérification" }),
    ).toBeVisible();

    // Type a digit in first OTP input
    const otpInputs = page.locator(".otp-input");
    await otpInputs.nth(0).fill("1");
    // Second input should now be focused
    await expect(otpInputs.nth(1)).toBeFocused();
  });

  test("shows resend countdown after sending OTP", async ({ page }) => {
    const input = page.locator('input[type="tel"]');
    await input.fill("0701020304");
    await page.getByRole("button", { name: /recevoir le code/i }).click();
    await expect(
      page.getByRole("heading", { name: "Vérification" }),
    ).toBeVisible();

    // Should show countdown text
    await expect(page.getByText(/renvoyer dans/i)).toBeVisible();
  });
});
