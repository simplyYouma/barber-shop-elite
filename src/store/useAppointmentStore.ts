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
  staffId?: string;
  staffName: string;
  note?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

interface AppointmentState {
  appointments: Appointment[];
  addAppointment: (appt: Omit<Appointment, 'id' | 'status'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
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
        // Synchroniser avec la file d'attente SQLite
        useQueueStore.getState().syncAppointmentToQueue(newAppt);
      },

      updateAppointment: (id, updates) => {
        set((state) => {
          const updatedAppointments = state.appointments.map((a) => 
            a.id === id ? { ...a, ...updates } : a
          );
          const updatedAppt = updatedAppointments.find(a => a.id === id);
          if (updatedAppt) {
            useQueueStore.getState().syncAppointmentToQueue(updatedAppt);
          }
          return { appointments: updatedAppointments };
        });
      },

      deleteAppointment: (id) => {
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id)
        }));
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
