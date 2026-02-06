/**
 * QR Scanner Service
 * Uses html5-qrcode for camera-based scanning (web + Capacitor WebView)
 */

export interface ScanResult {
  success: boolean;
  data?: string;
  format?: string;
  error?: string;
}

/**
 * Check if barcode scanning is supported
 * html5-qrcode uses getUserMedia which works in modern browsers and Capacitor WebView
 */
export async function isScanningSupported(): Promise<boolean> {
  try {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  } catch {
    return false;
  }
}

/**
 * Request camera permission for scanning
 */
export async function requestScanPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    // Stop the stream immediately — we just needed to request permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Check camera permission status
 */
export async function checkScanPermission(): Promise<boolean> {
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Parse delivery tracking code from scanned data
 */
export function parseTrackingCode(scannedData: string): {
  trackingCode: string;
  deliveryId?: string;
  type: 'tracking' | 'delivery_id' | 'unknown';
} {
  // Try to parse as JSON (structured QR code)
  try {
    const parsed = JSON.parse(scannedData);
    if (parsed.trackingCode) {
      return {
        trackingCode: parsed.trackingCode,
        deliveryId: parsed.deliveryId,
        type: 'delivery_id',
      };
    }
  } catch {
    // Not JSON, continue
  }

  // Check if it's a UUID (delivery ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(scannedData)) {
    return {
      trackingCode: scannedData.slice(0, 8).toUpperCase(),
      deliveryId: scannedData,
      type: 'delivery_id',
    };
  }

  // Check if it's a tracking code format (alphanumeric, 6-12 chars)
  const trackingRegex = /^[A-Z0-9]{6,12}$/i;
  if (trackingRegex.test(scannedData)) {
    return {
      trackingCode: scannedData.toUpperCase(),
      type: 'tracking',
    };
  }

  // Unknown format, use as-is
  return {
    trackingCode: scannedData,
    type: 'unknown',
  };
}

/**
 * Validate if scanned code matches a delivery
 */
export function validateDeliveryCode(
  scannedCode: string,
  deliveryId: string,
  trackingCode?: string
): { isValid: boolean; matchType: 'id' | 'tracking' | 'partial' | 'none' } {
  const parsed = parseTrackingCode(scannedCode);

  // Check exact delivery ID match
  if (parsed.deliveryId === deliveryId) {
    return { isValid: true, matchType: 'id' };
  }

  // Check tracking code match
  if (trackingCode && parsed.trackingCode === trackingCode.toUpperCase()) {
    return { isValid: true, matchType: 'tracking' };
  }

  // Check partial match (first 8 chars of delivery ID)
  if (parsed.trackingCode === deliveryId.slice(0, 8).toUpperCase()) {
    return { isValid: true, matchType: 'partial' };
  }

  return { isValid: false, matchType: 'none' };
}
