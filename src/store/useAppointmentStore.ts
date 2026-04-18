import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQueueStore } from './useQueueStore';

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
  addAppointment: (appt: Omit<Appointment, 'id' | 'status'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  updateStatusOnly: (id: string, status: Appointment['status']) => void;
  deleteAppointment: (id: string) => void;
  getAppointmentsByDay: (day: Date) => Appointment[];
}

export const useAppointmentStore = create<AppointmentState>()(
  persist(
    (set, get) => ({
      appointments: [],

      addAppointment: (appt) => {
        const id = Date.now().toString();
        const newAppt: Appointment = { ...appt, id, status: 'confirmed' };
        set((state) => ({
          appointments: [...state.appointments, newAppt]
        }));
        
        // Audit & Sync
        import('@/lib/auditService').then(({ logAction }) => {
          logAction('RDV_CONFIRME', 'agenda', id, `Nouveau rendez-vous pour ${appt.clientName} avec ${appt.staffName} (${appt.serviceName})`);
        });
        useQueueStore.getState().syncAppointmentToQueue(newAppt);
      },
 
      updateAppointment: (id, updates) => {
        const oldAppt = get().appointments.find(a => a.id === id);
        set((state) => {
          const updatedAppointments = state.appointments.map((a) => 
            a.id === id ? { ...a, ...updates } : a
          );
          const updatedAppt = updatedAppointments.find(a => a.id === id);
          if (updatedAppt) {
            useQueueStore.getState().syncAppointmentToQueue(updatedAppt);
            
            // Audit Log
            import('@/lib/auditService').then(({ logAction, buildDiff }) => {
              const diff = buildDiff(oldAppt, updatedAppt, Object.keys(updates));
              logAction('RDV_MODIFIE', 'agenda', id, { message: `Modification du RDV de ${updatedAppt.clientName}`, diff });
            });
          }
          return { appointments: updatedAppointments };
        });
      },
 
      updateStatusOnly: (id, status) => {
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
      },
 
      deleteAppointment: (id) => {
        const item = get().appointments.find(a => a.id === id);
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
    }),
    {
      name: 'barber-appointments-storage',
    }
  )
);
