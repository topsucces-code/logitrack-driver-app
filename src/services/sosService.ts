import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { hapticHeavy } from "../hooks/useHapticFeedback";
import { createRateLimiter } from "../utils/rateLimit";
import { EMERGENCY_CONFIG, SUPPORT_CONFIG } from "../config/app.config";

// Rate limiter: 30 secondes entre deux alertes SOS
const sosRateLimiter = createRateLimiter(30_000);

export interface SOSAlert {
  id: string;
  driver_id: string;
  delivery_id?: string;
  latitude: number;
  longitude: number;
  alert_type:
    | "emergency"
    | "accident"
    | "security"
    | "medical"
    | "vehicle_issue";
  status: "active" | "responding" | "resolved" | "cancelled";
  description?: string;
  created_at: string;
  resolved_at?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

// Get current location
async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } else {
      // Web fallback
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });
    }
  } catch {
    return null;
  }
}

// Send SOS alert
export async function sendSOSAlert(
  driverId: string,
  alertType: SOSAlert["alert_type"],
  deliveryId?: string,
  description?: string,
): Promise<{ success: boolean; alertId?: string; error?: string }> {
  try {
    // Rate limiting: empêcher les alertes SOS en rafale
    if (!sosRateLimiter.canProceed()) {
      const remaining = Math.ceil(sosRateLimiter.getRemainingMs() / 1000);
      return {
        success: false,
        error: `Veuillez patienter ${remaining}s avant d'envoyer une nouvelle alerte`,
      };
    }

    // Trigger heavy haptic for confirmation
    hapticHeavy();

    // Get current location
    const location = await getCurrentLocation();

    if (!location) {
      return { success: false, error: "Impossible d'obtenir votre position" };
    }

    // Create SOS alert in database
    const { data, error } = await supabase
      .from("logitrack_sos_alerts")
      .insert({
        driver_id: driverId,
        delivery_id: deliveryId,
        latitude: location.latitude,
        longitude: location.longitude,
        alert_type: alertType,
        status: "active",
        description,
      })
      .select("id")
      .single();

    if (error) {
      // If table doesn't exist, log to incidents instead
      logger.error("SOS table error", { error });

      // Fallback: Create an incident
      const { error: incidentError } = await supabase
        .from("logitrack_incidents")
        .insert({
          delivery_id: deliveryId,
          reporter_type: "driver",
          reporter_id: driverId,
          incident_type: "security_issue",
          title: `ALERTE SOS - ${alertType.toUpperCase()}`,
          description: `URGENCE: ${description || "Alerte SOS déclenchée"}\nPosition: ${location.latitude}, ${location.longitude}`,
          priority: "critical",
          status: "open",
        });

      if (incidentError) {
        return { success: false, error: "Erreur lors de l'envoi de l'alerte" };
      }
    }

    // Update driver status to indicate emergency
    await supabase
      .from("logitrack_drivers")
      .update({
        is_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", driverId);

    return { success: true, alertId: data?.id };
  } catch (err) {
    logger.error("SOS error", { error: err });
    return { success: false, error: "Erreur lors de l'envoi de l'alerte" };
  }
}

// Cancel SOS alert
export async function cancelSOSAlert(
  alertId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("logitrack_sos_alerts")
      .update({
        status: "cancelled",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      return { success: false, error: "Erreur lors de l'annulation" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'annulation" };
  }
}

// Get emergency contacts for driver
export async function getEmergencyContacts(
  driverId: string,
): Promise<EmergencyContact[]> {
  try {
    const { data } = await supabase
      .from("logitrack_emergency_contacts")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: true });

    return data || [];
  } catch {
    return [];
  }
}

// Add emergency contact
export async function addEmergencyContact(
  driverId: string,
  contact: Omit<EmergencyContact, "id">,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("logitrack_emergency_contacts")
      .insert({
        driver_id: driverId,
        ...contact,
      });

    if (error) {
      return { success: false, error: "Erreur lors de l'ajout du contact" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'ajout du contact" };
  }
}

// Call emergency number (Côte d'Ivoire)
export function callEmergencyServices(
  service: keyof typeof EMERGENCY_CONFIG = "police",
) {
  window.location.href = `tel:${EMERGENCY_CONFIG[service]}`;
}

// Call support
export function callSupport() {
  window.location.href = `tel:+${SUPPORT_CONFIG.whatsappNumber}`;
}

// Open WhatsApp support
export function openWhatsAppSupport(message?: string) {
  const text = encodeURIComponent(message || "URGENCE - J'ai besoin d'aide");
  window.open(`${SUPPORT_CONFIG.whatsappUrl}?text=${text}`, "_blank");
}

// Share location via SMS/WhatsApp
export async function shareLocation(phone: string): Promise<void> {
  const location = await getCurrentLocation();

  if (location) {
    const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = encodeURIComponent(
      `URGENCE - Ma position actuelle: ${mapsUrl}`,
    );
    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`,
      "_blank",
    );
  }
}
