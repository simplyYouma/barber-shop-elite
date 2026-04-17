import { create } from 'zustand';
import type { Client } from '../types';
import { getDb } from '@/lib/db';
import { logAction, buildDiff } from '@/lib/auditService';

interface ClientState {
  clients: Client[];
  isLoading: boolean;
  selectedClientForPOS: Client | null;
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'created_at'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  searchClients: (query: string) => Client[];
  setSelectedClientForPOS: (client: Client | null) => void;
  isQuickAddMode: boolean;
  setIsQuickAddMode: (status: boolean) => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  isLoading: false,
  selectedClientForPOS: null,
  isQuickAddMode: false,

  setIsQuickAddMode: (status) => {
    set({ isQuickAddMode: status });
  },

  setSelectedClientForPOS: (client) => {
     set({ selectedClientForPOS: client });
  },

  fetchClients: async () => {
    set({ isLoading: true });
    try {
      const db = await getDb();
      const results: any[] = await db.select('SELECT * FROM clients WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY name ASC');
      // On s'assure que row.is_deleted est bien un boolean pour TypeScript
      const clients: Client[] = results.map(row => ({
        ...row,
        is_deleted: row.is_deleted === 1
      }));
      set({ clients, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      set({ isLoading: false });
    }
  },

  addClient: async (client) => {
    try {
      const db = await getDb();
      const id = Math.random().toString(36).substr(2, 9);
      const now = new Date().toISOString();
      
      const newClient: Client = {
         id,
         name: client.name,
         phone: client.phone,
         avatar: client.avatar,
         is_deleted: false,
         created_at: now
      };

      // Mise à jour optimiste locale
      set(state => ({ clients: [newClient, ...state.clients].sort((a, b) => a.name.localeCompare(b.name)) }));

      await db.execute(
        'INSERT INTO clients (id, name, phone, avatar, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, client.name, client.phone, client.avatar, 0, now]
      );
      
      await logAction('AJOUT_CLIENT', 'clients', id, `Ajout du client : ${client.name} (${client.phone || 'Sans numéro'})`);
      await get().fetchClients();
      return newClient;
    } catch (error) {
      console.error('Failed to add client:', error);
      await get().fetchClients();
      throw error;
    }
  },

  updateClient: async (id, updates) => {
    try {
      const db = await getDb();
      const current = get().clients.find(c => c.id === id);
      if (!current) return;

      const merged = { ...current, ...updates };
      
      await db.execute(
        'UPDATE clients SET name = ?, phone = ?, avatar = ?, is_deleted = ? WHERE id = ?',
        [merged.name, merged.phone, merged.avatar, merged.is_deleted ? 1 : 0, id]
      );
      
      const diff = buildDiff(current, merged, ['name', 'phone', 'is_deleted']);
      await logAction('MODIF_CLIENT', 'clients', id, { message: `Mise à jour de la fiche client de ${merged.name}`, diff });
      
      await get().fetchClients();
    } catch (error) {
      console.error('Failed to update client:', error);
      throw error;
    }
  },

  removeClient: async (id) => {
    await get().updateClient(id, { is_deleted: true });
  },

  searchClients: (query) => {
    if (!query) return get().clients;
    return get().clients.filter(client => 
      client.name.toLowerCase().includes(query.toLowerCase()) || 
      client.phone?.includes(query)
    );
  }
}));
