import { create } from 'zustand';
import type { Service } from '../types';
import { getDb } from '@/lib/db';
import { logAction, buildDiff } from '@/lib/auditService';

interface ServiceState {
  services: Service[];
  isLoading: boolean;
  fetchServices: () => Promise<void>;
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  isLoading: false,

  fetchServices: async () => {
    set({ isLoading: true });
    try {
      const db = await getDb();
      const results: any[] = await db.select('SELECT * FROM services ORDER BY name ASC');
      set({ services: results, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch services:', error);
      set({ isLoading: false });
    }
  },

  addService: async (newService) => {
    try {
      const db = await getDb();
      const id = Math.random().toString(36).substring(2, 9);
      await db.execute(
        'INSERT INTO services (id, name, price, image, created_at) VALUES (?, ?, ?, ?, DATETIME("now"))',
        [id, newService.name, newService.price, newService.image]
      );
      await logAction('AJOUT_SERVICE', 'services', id, `Ajout de la prestation : ${newService.name} (${newService.price} FCFA)`);
      await get().fetchServices();
    } catch (error) {
      console.error('Failed to add service:', error);
      throw error;
    }
  },

  removeService: async (id) => {
    try {
      const db = await getDb();
      const service = get().services.find(s => s.id === id);
      await db.execute('DELETE FROM services WHERE id = ?', [id]);
      if (service) {
         await logAction('SUPPR_SERVICE', 'services', id, `Retrait de la prestation : ${service.name}`);
      }
      await get().fetchServices();
    } catch (error) {
      console.error('Failed to remove service:', error);
      throw error;
    }
  },

  updateService: async (id, updates) => {
    try {
      const db = await getDb();
      const current = get().services.find(s => s.id === id);
      if (!current) return;

      const merged = { ...current, ...updates };
      await db.execute(
        'UPDATE services SET name = ?, price = ?, image = ? WHERE id = ?',
        [merged.name, merged.price, merged.image, id]
      );
      const diff = buildDiff(current, merged, ['name', 'price']);
      await logAction('MODIF_SERVICE', 'services', id, { message: `Modification de la prestation ${merged.name}`, diff });
      await get().fetchServices();
    } catch (error) {
      console.error('Failed to update service:', error);
      throw error;
    }
  },
}));
