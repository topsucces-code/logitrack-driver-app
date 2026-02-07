import { z } from 'zod';

// Phone number validation (Côte d'Ivoire format)
const phoneRegex = /^(\+225)?[0-9]{10}$/;

export const phoneSchema = z
  .string()
  .min(10, 'Numéro de téléphone invalide')
  .max(14, 'Numéro de téléphone invalide')
  .regex(phoneRegex, 'Format: 0701020304 ou +2250701020304');

// OTP validation
export const otpSchema = z
  .string()
  .length(6, 'Le code doit contenir 6 chiffres')
  .regex(/^[0-9]+$/, 'Le code ne doit contenir que des chiffres');

// Email validation
export const emailSchema = z
  .string()
  .min(1, 'Email requis')
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Adresse email invalide');

// Password validation
export const passwordSchema = z
  .string()
  .min(6, 'Le mot de passe doit contenir au moins 6 caractères');

// Login form
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Phone auth form
export const phoneAuthFormSchema = z.object({
  phone: phoneSchema,
});

// OTP verification form
export const otpVerificationFormSchema = z.object({
  otp: otpSchema,
});

// Registration form
export const registrationFormSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom est trop long'),
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// Onboarding Step 1: Personal info
export const onboardingPersonalInfoSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom est trop long'),
  profilePhoto: z.string().min(1, 'Photo de profil requise').nullable().refine((val) => val !== null, {
    message: 'Photo de profil requise',
  }),
});

// Onboarding Step 2: CNI/ID Documents
export const onboardingCniSchema = z.object({
  cniNumber: z
    .string()
    .min(8, 'Numéro CNI invalide (minimum 8 caractères)')
    .max(20, 'Numéro CNI trop long'),
  cniFront: z.string().min(1, 'Photo recto CNI requise').nullable().refine((val) => val !== null, {
    message: 'Photo recto CNI requise',
  }),
  cniBack: z.string().min(1, 'Photo verso CNI requise').nullable().refine((val) => val !== null, {
    message: 'Photo verso CNI requise',
  }),
});

// Onboarding Step 4: Zones
export const onboardingZonesSchema = z.object({
  zones: z.array(z.string()).min(1, 'Sélectionnez au moins 1 zone de livraison'),
});

// Vehicle types
const vehicleTypes = ['moto', 'tricycle', 'voiture', 'velo'] as const;

// Onboarding Step 3: Vehicle info
export const onboardingVehicleSchema = z.object({
  vehicleType: z.enum(vehicleTypes),
  vehiclePhoto: z.string().min(1, 'Photo du véhicule requise').nullable().refine((val) => val !== null, {
    message: 'Photo du véhicule requise',
  }),
  vehiclePlate: z
    .string()
    .max(20, 'Plaque d\'immatriculation trop longue')
    .optional(),
});

// Mobile Money providers (aligned with PostgreSQL momo_provider enum)
const momoProviders = ['orange', 'mtn', 'moov', 'wave'] as const;

// Alias for backward compatibility
const momoProviderIds = momoProviders;

// Onboarding Step 5: Mobile Money
export const onboardingMomoSchema = z.object({
  mobileMoneyProvider: z.enum(momoProviderIds),
  mobileMoneyNumber: z
    .string()
    .min(8, 'Numéro Mobile Money invalide')
    .max(10, 'Numéro Mobile Money invalide')
    .regex(/^[0-9]+$/, 'Le numéro ne doit contenir que des chiffres'),
});

// Incident types
const incidentTypes = [
  'customer_absent',
  'wrong_address',
  'damaged_package',
  'refused_delivery',
  'vehicle_breakdown',
  'accident',
  'security_issue',
  'other',
] as const;

// Incident report form
export const incidentReportSchema = z.object({
  type: z.enum(incidentTypes),
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(1000, 'La description est trop longue'),
  amount: z
    .number()
    .positive('Le montant doit être positif')
    .optional(),
});

// Withdrawal request form
export const withdrawalFormSchema = z.object({
  amount: z
    .number()
    .min(2000, 'Le montant minimum est de 2000 FCFA')
    .max(1000000, 'Le montant maximum est de 1,000,000 FCFA'),
  momoProvider: z.enum(momoProviders),
  momoNumber: phoneSchema,
});

// Settings form
export const settingsFormSchema = z.object({
  autoAccept: z.boolean(),
  maxDistanceKm: z.number().min(3).max(30),
  notificationsEnabled: z.boolean(),
  soundEnabled: z.boolean(),
});

// Type exports for use in components
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type PhoneAuthFormData = z.infer<typeof phoneAuthFormSchema>;
export type OtpVerificationFormData = z.infer<typeof otpVerificationFormSchema>;
export type RegistrationFormData = z.infer<typeof registrationFormSchema>;
export type OnboardingPersonalInfoData = z.infer<typeof onboardingPersonalInfoSchema>;
export type OnboardingCniData = z.infer<typeof onboardingCniSchema>;
export type OnboardingVehicleData = z.infer<typeof onboardingVehicleSchema>;
export type OnboardingZonesData = z.infer<typeof onboardingZonesSchema>;
export type OnboardingMomoData = z.infer<typeof onboardingMomoSchema>;
export type IncidentReportData = z.infer<typeof incidentReportSchema>;
export type WithdrawalFormData = z.infer<typeof withdrawalFormSchema>;
export type SettingsFormData = z.infer<typeof settingsFormSchema>;

// Validation helper
export function validateForm<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return { success: false, errors };
}
