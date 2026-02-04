/**
 * Types pour le signalement d'incidents - App Livreur
 */

export type IncidentCategory = 'driver' | 'customer' | 'vendor';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentType {
  id: string;
  code: string;
  label: string;
  requiresPhoto: boolean;
  requiresAmount: boolean;
  priority: IncidentPriority;
}

// Types d'incidents pour les livreurs
export const DRIVER_INCIDENT_TYPES: IncidentType[] = [
  {
    id: '1',
    code: 'customer_absent',
    label: 'Client absent / ne répond pas',
    requiresPhoto: false,
    requiresAmount: false,
    priority: 'medium',
  },
  {
    id: '2',
    code: 'address_not_found',
    label: 'Adresse introuvable',
    requiresPhoto: false,
    requiresAmount: false,
    priority: 'medium',
  },
  {
    id: '3',
    code: 'customer_refused',
    label: 'Client refuse le colis',
    requiresPhoto: false,
    requiresAmount: false,
    priority: 'medium',
  },
  {
    id: '4',
    code: 'vehicle_breakdown',
    label: 'Panne de mon véhicule',
    requiresPhoto: true,
    requiresAmount: false,
    priority: 'high',
  },
  {
    id: '5',
    code: 'package_damaged',
    label: 'Colis endommagé avant pickup',
    requiresPhoto: true,
    requiresAmount: true,
    priority: 'high',
  },
  {
    id: '6',
    code: 'security_issue',
    label: 'Problème de sécurité',
    requiresPhoto: false,
    requiresAmount: false,
    priority: 'critical',
  },
  {
    id: '7',
    code: 'other',
    label: 'Autre',
    requiresPhoto: false,
    requiresAmount: false,
    priority: 'low',
  },
];

export interface Incident {
  id: string;
  delivery_id: string;
  tracking_code?: string;
  reporter_type: IncidentCategory;
  reporter_id: string;
  incident_type: string;
  title: string;
  description: string;
  photos: string[];
  disputed_amount?: number;
  priority: IncidentPriority;
  status: IncidentStatus;
  created_at: string;
}

export interface CreateIncidentData {
  delivery_id: string;
  tracking_code?: string;
  incident_type: string;
  title: string;
  description: string;
  photos?: string[];
  disputed_amount?: number;
}
