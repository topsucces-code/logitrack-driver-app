// Mock data for E2E tests

export const MOCK_USER_ID = "test-user-id-001";
export const MOCK_DRIVER_ID = "test-driver-id-001";
export const MOCK_PHONE = "0701020304";
export const MOCK_EMAIL = `driver_${MOCK_PHONE}@logitrack.app`;
export const MOCK_TRACKING_CODE = "LT-ABC123";

/**
 * Supabase localStorage key for session storage.
 * Format: sb-{project-ref}-auth-token
 */
export const SUPABASE_STORAGE_KEY = "sb-nyxqnkldtdzgvudleshn-auth-token";

/** The real Supabase project domain (from .env VITE_SUPABASE_URL) */
export const SUPABASE_DOMAIN = "nyxqnkldtdzgvudleshn.supabase.co";

/** Create a properly-structured fake JWT that Supabase JS can parse */
export function createFakeJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${body}.${sig}`;
}

export const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: MOCK_EMAIL,
  email_confirmed_at: "2025-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2025-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  user_metadata: {
    full_name: "Koné Amadou",
    phone: MOCK_PHONE,
  },
  app_metadata: {
    provider: "email",
  },
};

/** Build a mock Supabase session with a valid-format JWT */
export function createMockSession() {
  const fakeAccessToken = createFakeJWT({
    sub: MOCK_USER_ID,
    email: MOCK_EMAIL,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });

  return {
    access_token: fakeAccessToken,
    refresh_token: "mock-refresh-token",
    token_type: "bearer" as const,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: MOCK_USER,
  };
}

export const MOCK_DRIVER = {
  id: MOCK_DRIVER_ID,
  user_id: MOCK_USER_ID,
  full_name: "Koné Amadou",
  phone: MOCK_PHONE,
  email: MOCK_EMAIL,
  photo_url: null,
  vehicle_type: "moto",
  vehicle_brand: "Honda",
  vehicle_model: "CG 125",
  vehicle_year: 2022,
  vehicle_color: "Rouge",
  license_plate: "AB-1234-CI",
  license_number: "CI-2024-001",
  cni_number: "CI001234567",
  cni_front_url: "https://example.com/cni-front.jpg",
  cni_back_url: "https://example.com/cni-back.jpg",
  license_front_url: "https://example.com/license-front.jpg",
  license_back_url: "https://example.com/license-back.jpg",
  status: "active",
  verification_status: "verified",
  is_online: false,
  is_available: true,
  auto_accept: false,
  max_distance_km: 15,
  primary_zone_id: null,
  secondary_zones: [],
  company_id: null,
  rating_sum: 45,
  rating_count: 10,
  total_deliveries: 42,
  total_earnings: 125000,
  wallet_balance: 15000,
  momo_provider: "orange",
  momo_number: MOCK_PHONE,
  notification_sound: true,
  last_active_at: new Date().toISOString(),
  current_lat: 5.36,
  current_lng: -4.0083,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: new Date().toISOString(),
};

export const MOCK_DELIVERY = {
  id: "test-delivery-id-001",
  tracking_code: MOCK_TRACKING_CODE,
  status: "pending",
  pickup_address: "Cocody, Riviera 2",
  pickup_lat: 5.3547,
  pickup_lng: -3.9818,
  pickup_contact_name: "Boutique Awa",
  pickup_contact_phone: "0501020304",
  delivery_address: "Plateau, Avenue Botreau-Roussel",
  delivery_lat: 5.3189,
  delivery_lng: -4.0165,
  delivery_contact_name: "Kouamé Jean",
  delivery_contact_phone: "0708090102",
  package_size: "medium",
  package_description: "Colis électronique",
  total_price: 3500,
  driver_earnings: 2800,
  distance_km: 8.2,
  is_express: false,
  payment_method: "momo",
  payment_status: "pending",
  driver_id: null,
  vendor_name: "Boutique Awa",
  company_id: null,
  pickup_zone_id: null,
  delivery_zone_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  delivered_at: null,
};
