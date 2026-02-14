import { test as base, expect } from "@playwright/test";
import { mockSupabaseAPI } from "../helpers/mock-supabase";
import {
  createMockSession,
  MOCK_USER,
  SUPABASE_STORAGE_KEY,
} from "../helpers/test-data";

/**
 * Custom test fixture that injects a fake authenticated session.
 *
 * Key steps:
 * 1. Disables navigator.locks to avoid Supabase JS deadlock
 *    (onAuthStateChange callback calls fetchDriver which needs getSession lock)
 * 2. Seeds the Supabase localStorage key so AuthContext finds a valid session
 * 3. Mocks all Supabase API calls (auth, REST, realtime)
 * 4. Stubs Google Maps to prevent API key errors
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock all backend APIs before any navigation
    await mockSupabaseAPI(page);

    const session = createMockSession();

    // Disable navigator.locks and seed auth session BEFORE any modules load
    await page.addInitScript(
      (args) => {
        // Disable navigator.locks to prevent Supabase JS auth deadlock.
        // Without this, onAuthStateChange → fetchDriver → getSession creates
        // a deadlock because _initialize() holds the lock.
        Object.defineProperty(navigator, "locks", {
          value: undefined,
          configurable: true,
        });

        // Seed Supabase session in localStorage
        localStorage.setItem(args.key, JSON.stringify(args.session));
        localStorage.setItem(
          args.key + "-user",
          JSON.stringify({ user: args.user }),
        );
      },
      { key: SUPABASE_STORAGE_KEY, session, user: MOCK_USER },
    );

    await use(page);
  },
});

export { expect };
