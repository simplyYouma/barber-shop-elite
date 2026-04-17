import { create } from 'zustand';
import { getDb } from '../lib/db';
import { logAction } from '@/lib/auditService';
import { useStaffStore } from './useStaffStore';

interface QueueItem {
  id: string;
  client_id: string;
  client_name?: string;
  service_name: string;
  price: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'scheduled';
  position: number;
  barber_name?: string;
  created_at: string;
  started_at?: string;
  appointment_id?: string;
  scheduled_at?: string;
}

interface QueueState {
  queue: QueueItem[];
  fetchQueue: () => Promise<void>;
  addToQueue: (clientId: string, serviceName: string, price: number, barberName?: string) => Promise<void>;
  updateStatus: (id: string, status: QueueItem['status'], barberName?: string) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  checkAndArchive: () => Promise<void>;
  syncAppointmentToQueue: (appt: any) => Promise<void>;
  removeAppointmentFromQueue: (apptId: string) => Promise<void>;
  syncAllAppointments: (appointments: any[]) => Promise<void>;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],

  fetchQueue: async () => {
    try {
      const db = await getDb();
      const result: any[] = await db.select('SELECT q.*, c.name as client_name FROM queue q LEFT JOIN clients c ON q.client_id = c.id ORDER BY q.position ASC');
      set({ queue: result });
      
      // AUTO-SYNC STAFF AVAILABILITY
      // Si un barbier est marqué "Occupé" mais n'a pas de session 'in_progress' dans la file, on l'aide à se libérer
      const { staff, updateStaff } = useStaffStore.getState();
      const inProgressBarbers = new Set(result.filter(i => i.status === 'in_progress').map(i => i.barber_name));
      
      for (const s of staff) {
         if (!s.isAvailable && !inProgressBarbers.has(s.name) && !s.isBlocked) {
            // Il est marqué occupé mais n'a aucune session active et n'est pas bloqué manuellement
            // On le libère pour corriger les états "fantômes"
            await updateStaff(s.id, { isAvailable: true });
         }
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  },

  addToQueue: async (clientId, serviceName, price, barberName) => {
    try {
      const db = await getDb();
      const id = Math.random().toString(36).substring(2, 9);
      const position = get().queue.length + 1;
      const now = new Date().toISOString();

      await db.execute(
        'INSERT INTO queue (id, client_id, service_name, price, status, position, barber_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, serviceName, price, 'waiting', position, barberName, now]
      );
      await logAction('ENCAISSEMENT_DEBUT', 'queue', id, `Passage en caisse : ${serviceName} pour un client. Pris en charge par ${barberName || 'la file d\'attente générale'}`);
      await get().fetchQueue();
    } catch (error) {
      console.error('Failed to add to queue:', error);
      throw error;
    }
  },

  syncAppointmentToQueue: async (appt) => {
    try {
      const db = await getDb();
      const existing: any[] = await db.select('SELECT id FROM queue WHERE appointment_id = ?', [appt.id]);
      
      const scheduled_at = new Date(appt.day);
      scheduled_at.setHours(appt.hour, 0, 0, 0);
      const scheduledStr = scheduled_at.toISOString();
      const now = new Date().toISOString();

      if (existing.length > 0) {
        // Update
        await db.execute(
          'UPDATE queue SET service_name = ?, barber_name = ?, scheduled_at = ? WHERE appointment_id = ?',
          [appt.serviceName, appt.staffName, scheduledStr, appt.id]
        );
      } else {
        // Insert
        const id = Math.random().toString(36).substring(2, 9);
        const position = get().queue.length + 1;
        
        // On cherche l'ID du client (ou passage)
        const clientResults: any[] = await db.select('SELECT id FROM clients WHERE name = ?', [appt.clientName]);
        const clientId = clientResults.length > 0 ? clientResults[0].id : 'passage';

        await db.execute(
          'INSERT OR REPLACE INTO queue (id, client_id, service_name, price, status, position, barber_name, created_at, appointment_id, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, clientId, appt.serviceName, 0, 'scheduled', position, appt.staffName, now, appt.id, scheduledStr]
        );
      }
      await get().fetchQueue();
    } catch (error) {
      console.error('Failed to sync appointment to queue:', error);
    }
  },

  removeAppointmentFromQueue: async (apptId) => {
    try {
       const db = await getDb();
       await db.execute('DELETE FROM queue WHERE appointment_id = ?', [apptId]);
       await get().fetchQueue();
    } catch (error) {
       console.error('Failed to remove appointment from queue:', error);
    }
  },

  updateStatus: async (id, status, barberName) => {
    try {
       const db = await getDb();
       const item = get().queue.find(i => i.id === id);
       if (!item) return;

       if (status === 'completed' || status === 'cancelled') {
          // Déplacer vers l'archive
          const archivedAt = new Date().toISOString();
          await db.execute(
             'INSERT INTO archive_queue (id, client_id, service_name, price, status, barber_name, created_at, started_at, appointment_id, scheduled_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
             [item.id, item.client_id, item.service_name, item.price, status, barberName || item.barber_name, item.created_at, item.started_at, item.appointment_id, item.scheduled_at, archivedAt]
          );
          
          // Supprimer de la file active
          await db.execute('DELETE FROM queue WHERE id = ?', [id]);
          await logAction(
             status === 'completed' ? 'SERVICE_FIN' : 'SERVICE_ANNULER', 
             'queue', 
             id, 
             `${status === 'completed' ? 'Clôture' : 'Annulation'} de la prestation : ${item.service_name}`
          );
       } else {
          // Mise à jour simple (ex: démarrage de la coupe)
          await db.execute(
             'UPDATE queue SET status = ?, started_at = ?, barber_name = ? WHERE id = ?',
             [status, status === 'in_progress' ? new Date().toISOString() : item.started_at, barberName || item.barber_name, id]
          );
          if (status === 'in_progress') {
             await logAction('SERVICE_DEMARRAGE', 'queue', id, `Démarrage de la prestation : ${item.service_name} par ${barberName || item.barber_name}`);
          }
       }
       await get().fetchQueue();
    } catch (error) {
       console.error('Failed to update status:', error);
       throw error;
    }
  },

  removeFromQueue: async (id) => {
    try {
      const db = await getDb();
      const item = get().queue.find(i => i.id === id);
      await db.execute('DELETE FROM queue WHERE id = ?', [id]);
      if (item) {
         await logAction('SUPPR_FILE', 'queue', id, `Retrait manuel de la file : ${item.service_name}`);
      }
      await get().fetchQueue();
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  },

  checkAndArchive: async () => {
    // Cette fonction peut être étendue pour des nettoyages automatiques
    await get().fetchQueue();
  },

  syncAllAppointments: async (appointments) => {
    if (!appointments) return;
    try {
       const db = await getDb();
       // 1. On nettoie tous les "scheduled" pour repartir sur une base propre
       // On ne touche pas aux "in_progress" (déjà démarrés)
       await db.execute("DELETE FROM queue WHERE status = 'scheduled'");
       
       // 2. On ré-insère seulement ce qui est dans l'agenda
       for (const appt of appointments) {
          await get().syncAppointmentToQueue(appt);
       }
       await get().fetchQueue();
    } catch (err) {
       console.error("Failed to re-sync appointments:", err);
    }
  }
}));
