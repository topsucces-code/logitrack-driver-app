/**
 * Configuration centralisée de l'application LogiTrack Driver
 * Toutes les valeurs configurables sont regroupées ici
 */

// Configuration du protocole client absent
export const PROTOCOL_CONFIG = {
  maxCalls: 3,
  waitTimeSeconds: 15 * 60, // 15 minutes
  partialPaymentPercent: 50,
  minWaitAfterAllCalls: 300, // 5 minutes minimum après tous les appels
};

// Configuration des paiements
export const PAYMENT_CONFIG = {
  minWithdrawalAmount: 2000, // FCFA
  currency: "FCFA",
  currencySymbol: "F",
};

// Configuration des livraisons
export const DELIVERY_CONFIG = {
  defaultListLimit: 20,
  historyListLimit: 30,
  historyPageSize: 20,
  expiryMinutes: 5,
};

// Configuration du livreur
export const DRIVER_CONFIG = {
  defaultMaxDistanceKm: 15,
  minMaxDistanceKm: 3,
  maxMaxDistanceKm: 30,
};

// Configuration de la carte
export const MAP_CONFIG = {
  defaultCenter: {
    lat: 5.36,
    lng: -4.0083,
  },
  defaultZoom: 13,
};

// Fournisseurs Mobile Money
export const MOBILE_MONEY_PROVIDERS = [
  { id: "orange", name: "Orange Money", color: "bg-orange-500" },
  { id: "mtn", name: "MTN MoMo", color: "bg-yellow-500" },
  { id: "moov", name: "Moov Money", color: "bg-blue-500" },
  { id: "wave", name: "Wave", color: "bg-cyan-500" },
] as const;

// Zones de secours (utilisées si la base de données est indisponible)
export const FALLBACK_ZONES = [
  "Cocody",
  "Plateau",
  "Yopougon",
  "Adjamé",
  "Abobo",
  "Treichville",
  "Marcory",
  "Koumassi",
  "Port-Bouët",
  "Bingerville",
  "Anyama",
  "Songon",
  "Attécoubé",
  "Riviera",
  "Angré",
  "2 Plateaux",
  "Palmeraie",
  "Zone 4",
  "Banco",
  "Williamsville",
] as const;

// Configuration des numéros d'urgence (Côte d'Ivoire)
export const EMERGENCY_CONFIG = {
  police: "110",
  pompiers: "180",
  samu: "185",
};

// Configuration du support
export const SUPPORT_CONFIG = {
  whatsappNumber: "22507000000",
  whatsappUrl: "https://wa.me/22507000000",
  supportEmail: "support@logitrack.africa",
};

// Configuration de l'application
export const APP_CONFIG = {
  name: "LogiTrack Livreur",
  version: "1.0.0",
  company: "LogiTrack Africa",
  year: new Date().getFullYear(),
};

// Types exportés
export type MobileMoneyProvider = (typeof MOBILE_MONEY_PROVIDERS)[number];
export type FallbackZone = (typeof FALLBACK_ZONES)[number];
