/**
 * Service de gestion des incidents - App Livreur
 */

import { supabase } from '../lib/supabase';
import type { CreateIncidentData, Incident, IncidentPriority } from '../types/incidents';
import { DRIVER_INCIDENT_TYPES } from '../types/incidents';

class IncidentService {
  /**
   * Créer un incident
   */
  async createIncident(
    data: CreateIncidentData,
    driverId: string,
    driverName?: string,
    driverPhone?: string
  ): Promise<{ success: boolean; incident?: Incident; error?: string }> {
    try {
      // Trouver le type d'incident pour obtenir la priorité
      const incidentType = DRIVER_INCIDENT_TYPES.find(t => t.code === data.incident_type);
      const priority: IncidentPriority = incidentType?.priority || 'medium';

      const incidentData = {
        delivery_id: data.delivery_id,
        tracking_code: data.tracking_code || null,
        reporter_type: 'driver',
        reporter_id: driverId,
        reporter_name: driverName,
        reporter_phone: driverPhone,
        category: 'driver',
        incident_type: data.incident_type,
        title: data.title,
        description: data.description,
        photos: data.photos || [],
        disputed_amount: data.disputed_amount || 0,
        priority,
        status: 'open',
      };

      const { data: incident, error } = await supabase
        .from('logitrack_incidents')
        .insert(incidentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating incident:', error);
        return { success: false, error: error.message };
      }

      // Ajouter à l'historique
      await supabase.from('logitrack_incident_history').insert({
        incident_id: incident.id,
        action: 'created',
        action_by: driverId,
        action_by_name: driverName,
        new_status: 'open',
        notes: 'Incident créé par le livreur',
      });

      return { success: true, incident };
    } catch (err: any) {
      console.error('Error in createIncident:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Upload une photo pour un incident
   */
  async uploadPhoto(file: File, incidentId?: string): Promise<string | null> {
    try {
      const fileName = `incidents/${incidentId || 'temp'}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('logitrack')
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('logitrack')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error in uploadPhoto:', err);
      return null;
    }
  }

  /**
   * Récupérer les incidents d'un livreur
   */
  async getDriverIncidents(driverId: string): Promise<Incident[]> {
    const { data, error } = await supabase
      .from('logitrack_incidents')
      .select('*')
      .eq('reporter_id', driverId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Récupérer un incident par ID
   */
  async getIncident(incidentId: string): Promise<Incident | null> {
    const { data, error } = await supabase
      .from('logitrack_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (error) {
      console.error('Error fetching incident:', error);
      return null;
    }

    return data;
  }
}

export const incidentService = new IncidentService();
export default incidentService;
