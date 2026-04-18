import { create } from 'zustand';
import { useQueueStore } from './useQueueStore';
import { getDb } from '@/lib/db';

interface Appointment {
  id: string;
  day: string; // ISO String
  hour: number;
  clientName: string;
  serviceId?: string;
  serviceName: string;
  price?: number;
  staffId?: string;
  staffName: string;
  note?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

interface AppointmentState {
  appointments: Appointment[];
  isLoading: boolean;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'status'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  updateStatusOnly: (id: string, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentsByDay: (day: Date) => Appointment[];
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  isLoading: true,

  fetchAppointments: async () => {
    try {
      const db = await getDb();
      
      // MIGRATION DEPUIS LOCALSTORAGE (UNE SEULE FOIS)
      const migrationDone = localStorage.getItem('appointment_migration_v2');
      if (!migrationDone) {
         const oldData = localStorage.getItem('barber-appointments-storage');
         if (oldData) {
            try {
               const parsed = JSON.parse(oldData);
               const oldAppts = parsed.state?.appointments || [];
               for (const a of oldAppts) {
                  await db.execute(
                     `INSERT OR IGNORE INTO appointments (id, day, hour, client_name, service_id, service_name, price, staff_id, staff_name, note, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                     [a.id, a.day, a.hour, a.clientName, a.serviceId, a.serviceName, a.price, a.staffId, a.staffName, a.note, a.status]
                  );
               }
            } catch (e) {
               console.warn('[Agenda] Erreur migration:', e);
            }
         }
         localStorage.setItem('appointment_migration_v2', 'true');
      }

      const rows: any[] = await db.select('SELECT * FROM appointments');
      const appointments: Appointment[] = rows.map(r => ({
        id: r.id,
        day: r.day,
        hour: r.hour,
        clientName: r.client_name,
        serviceId: r.service_id,
        serviceName: r.service_name,
        price: r.price,
        staffId: r.staff_id,
        staffName: r.staff_name,
        note: r.note,
        status: r.status
      }));

      set({ appointments, isLoading: false });
    } catch (error) {
      console.error('[Agenda] Error fetching appointments:', error);
      set({ isLoading: false });
    }
  },

  addAppointment: async (appt) => {
    try {
      const db = await getDb();
      const id = Date.now().toString();
      const status = 'confirmed';
      
      await db.execute(
        `INSERT INTO appointments (id, day, hour, client_name, service_id, service_name, price, staff_id, staff_name, note, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, appt.day, appt.hour, appt.clientName, appt.serviceId, appt.serviceName, appt.price, appt.staffId, appt.staffName, appt.note, status]
      );

      const newAppt: Appointment = { ...appt, id, status };
      set((state) => ({ appointments: [...state.appointments, newAppt] }));
      
      // Audit & Sync
      import('@/lib/auditService').then(({ logAction }) => {
        logAction('RDV_CONFIRME', 'agenda', id, `Nouveau rendez-vous pour ${appt.clientName} avec ${appt.staffName} (${appt.serviceName})`);
      });
      useQueueStore.getState().syncAppointmentToQueue(newAppt);
    } catch (error) {
      console.error('[Agenda] Error adding appointment:', error);
    }
  },

  updateAppointment: async (id, updates) => {
    try {
      const db = await getDb();
      const oldAppt = get().appointments.find(a => a.id === id);
      if (!oldAppt) return;

      const updatedAppt = { ...oldAppt, ...updates };
      
      // On construit dynamiquement la requête SQL
      const fields = Object.keys(updates).map(k => {
         // Mapping des noms de champs TS vers SQL
         if (k === 'clientName') return 'client_name = ?';
         if (k === 'serviceId') return 'service_id = ?';
         if (k === 'serviceName') return 'service_name = ?';
         if (k === 'staffId') return 'staff_id = ?';
         if (k === 'staffName') return 'staff_name = ?';
         return `${k} = ?`;
      }).join(', ');
      
      const values = Object.keys(updates).map(k => (updates as any)[k]);
      values.push(id);

      await db.execute(`UPDATE appointments SET ${fields} WHERE id = ?`, values);

      set((state) => ({
        appointments: state.appointments.map((a) => a.id === id ? updatedAppt : a)
      }));

      useQueueStore.getState().syncAppointmentToQueue(updatedAppt);
      
      // Audit Log
      import('@/lib/auditService').then(({ logAction, buildDiff }) => {
        const diff = buildDiff(oldAppt, updatedAppt, Object.keys(updates));
        logAction('RDV_MODIFIE', 'agenda', id, { message: `Modification du RDV de ${updatedAppt.clientName}`, diff });
      });
    } catch (error) {
      console.error('[Agenda] Error updating appointment:', error);
    }
  },

  updateStatusOnly: async (id, status) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);

      set((state) => {
         const updated = state.appointments.map((a) => a.id === id ? { ...a, status } : a);
         const item = updated.find(a => a.id === id);
         
         if (item) {
            import('@/lib/auditService').then(({ logAction }) => {
               logAction(
                  status === 'completed' ? 'RDV_TERMINE' : 'RDV_ANNULE', 
                  'agenda', 
                  id, 
                  `${status === 'completed' ? 'Clôture' : 'Annulation'} du rendez-vous de ${item.clientName}`
               );
            });
         }
         return { appointments: updated };
      });
    } catch (error) {
      console.error('[Agenda] Error updating status:', error);
    }
  },

  deleteAppointment: async (id) => {
    try {
      const db = await getDb();
      const item = get().appointments.find(a => a.id === id);
      
      await db.execute('DELETE FROM appointments WHERE id = ?', [id]);

      set((state) => ({
        appointments: state.appointments.filter((a) => a.id !== id)
      }));
      
      if (item) {
         import('@/lib/auditService').then(({ logAction }) => {
            logAction('RDV_SUPPRIME', 'agenda', id, `Suppression de l'agenda : RDV de ${item.clientName}`);
         });
      }
      
      // Supprimer aussi de la file SQLite
      useQueueStore.getState().removeAppointmentFromQueue(id);
    } catch (error) {
      console.error('[Agenda] Error deleting appointment:', error);
    }
  },

  getAppointmentsByDay: (day) => {
    const dateStr = day.toDateString();
    return get().appointments.filter(a => {
       try {
          return new Date(a.day).toDateString() === dateStr;
       } catch (e) {
          return false;
       }
    });
  }
}));
