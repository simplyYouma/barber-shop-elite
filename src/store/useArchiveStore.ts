import { create } from 'zustand';
import type { ArchiveItem } from '../types';
import { getDb } from '@/lib/db';

interface ArchiveState {
  archives: ArchiveItem[];
  isLoading: boolean;
  fetchArchives: () => Promise<void>;
  clearArchives: () => Promise<void>;
}

export const useArchiveStore = create<ArchiveState>((set) => ({
  archives: [],
  isLoading: false,

  fetchArchives: async () => {
    set({ isLoading: true });
    try {
      const db = await getDb();
      // On fait une jointure pour récupérer le nom du client si disponible
      const results = await db.select<ArchiveItem[]>(`
        SELECT 
          aq.*, 
          COALESCE(c.name, 'Client de Passage') as client_name,
          c.phone
        FROM archive_queue aq
        LEFT JOIN clients c ON aq.client_id = c.id
        ORDER BY aq.archived_at DESC
      `);
      set({ archives: results, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch archives:', error);
      set({ isLoading: false });
    }
  },

  clearArchives: async () => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM archive_queue');
      set({ archives: [] });
    } catch (error) {
      console.error('Failed to clear archives:', error);
    }
  },
}));
