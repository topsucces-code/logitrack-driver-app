import { Page } from "@playwright/test";
import {
  MOCK_DRIVER,
  MOCK_USER,
  SUPABASE_DOMAIN,
  createMockSession,
} from "./test-data";

/**
 * Intercept all Supabase API calls and return mock data.
 * Uses domain-specific route patterns to match the real Supabase URL.
 * Call this before navigating to any page.
 */
export async function mockSupabaseAPI(page: Page) {
  const session = createMockSession();

  // REST API: drivers, deliveries, RPC, notifications
  await page.route(`https://${SUPABASE_DOMAIN}/rest/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("logitrack_drivers")) {
      if (method === "GET" || method === "HEAD") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_DRIVER]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_DRIVER]),
        });
      }
    } else if (url.includes("logitrack_deliveries")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else if (url.includes("/rpc/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      // Default: empty array for any other table (notifications, etc.)
      if (method === "HEAD") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "content-range": "0/0" },
          body: "",
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    }
  });

  // Auth API: token refresh, user info, OTP, signup
  await page.route(`https://${SUPABASE_DOMAIN}/auth/**`, async (route) => {
    const url = route.request().url();

    if (url.includes("/auth/v1/user")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER),
      });
    } else if (
      url.includes("/auth/v1/otp") ||
      url.includes("/auth/v1/magiclink")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    } else if (url.includes("/auth/v1/signup")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: MOCK_USER, session }),
      });
    } else {
      // token refresh and other auth endpoints
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session),
      });
    }
  });

  // Realtime: abort WebSocket connections to prevent hanging
  await page.route(`https://${SUPABASE_DOMAIN}/realtime/**`, async (route) => {
    await route.abort();
  });

  // Google Maps: serve minimal stub
  await page.route("https://maps.googleapis.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("maps/api/js")) {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          window.google = window.google || {};
          window.google.maps = window.google.maps || {
            Map: function() { return { setCenter: function(){}, setZoom: function(){}, addListener: function(){} }; },
            Marker: function() { return { setMap: function(){}, setPosition: function(){}, addListener: function(){} }; },
            LatLng: function(lat, lng) { return { lat: function(){ return lat; }, lng: function(){ return lng; } }; },
            LatLngBounds: function() { return { extend: function(){}, getCenter: function(){ return { lat: function(){ return 0; }, lng: function(){ return 0; } }; } }; },
            DirectionsService: function() { return { route: function(req, cb) { cb(null, 'OK'); } }; },
            DirectionsRenderer: function() { return { setMap: function(){}, setDirections: function(){} }; },
            Geocoder: function() { return { geocode: function(req, cb) { cb([], 'OK'); } }; },
            event: { addListener: function(){}, removeListener: function(){}, clearListeners: function(){} },
            places: { AutocompleteService: function(){}, PlacesService: function(){} },
            TravelMode: { DRIVING: 'DRIVING' },
            UnitSystem: { METRIC: 0 },
          };
        `,
      });
    } else {
      await route.fulfill({ status: 200, body: "" });
    }
  });
}
