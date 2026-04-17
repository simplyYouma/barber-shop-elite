import { create } from 'zustand';
import type { StaffMember, SystemRole } from '../types';
import { getDb } from '@/lib/db';
import { logAction, buildDiff } from '@/lib/auditService';
import { useAuthStore } from './useAuthStore';

interface StaffState {
  staff: StaffMember[];
  isLoading: boolean;
  fetchStaff: () => Promise<void>;
  addStaff: (member: Omit<StaffMember, 'id' | 'created_at'>) => Promise<void>;
  updateStaff: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  toggleAvailability: (id: string) => Promise<void>;
  toggleBlock: (id: string, reason?: string) => Promise<void>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: [],
  isLoading: false,

  fetchStaff: async () => {
    set({ isLoading: true });
    try {
      const db = await getDb();
      const results: any[] = await db.select('SELECT * FROM staff ORDER BY created_at DESC');
      const staff: StaffMember[] = results.map(row => ({
        ...row,
        skills: JSON.parse(row.skills || '[]'),
        isAvailable: row.is_available === 1,
        isBlocked: row.is_blocked === 1,
        systemRole: row.system_role as SystemRole,
        blockingReason: row.blocking_reason
      }));
      set({ staff, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      set({ isLoading: false });
    }
  },

  addStaff: async (member) => {
    try {
      const db = await getDb();
      const id = Math.random().toString(36).substr(2, 9);
      const now = new Date().toISOString();
      
      const newMember: StaffMember = {
         id,
         ...member,
         isAvailable: true,
         isBlocked: false,
         created_at: now
      };

      // Mise à jour optimiste
      set(state => ({ staff: [newMember, ...state.staff] }));

      await db.execute(
        'INSERT INTO staff (id, name, phone, email, password, skills, system_role, gender, avatar, is_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, member.name, member.phone, member.email, member.password || member.name.toLowerCase(), JSON.stringify(member.skills), member.systemRole, member.gender, member.avatar, 1, now]
      );
      
      await logAction('AJOUT_STAFF', 'staff', id, `Ajout du collaborateur : ${member.name} (${member.systemRole})`);
      await get().fetchStaff();
    } catch (error) {
      console.error('Failed to add staff:', error);
      await get().fetchStaff(); 
      throw error;
    }
  },

  updateStaff: async (id, updates) => {
    try {
      const db = await getDb();
      const current = get().staff.find(s => s.id === id);
      if (!current) return;

      const merged = { ...current, ...updates };
      
      // Mise à jour optimiste
      set(state => ({
         staff: state.staff.map(s => s.id === id ? merged : s)
      }));

      // SYNC AUTH : Si c'est l'utilisateur actuel, on met à jour sa session
      const authUser = useAuthStore.getState().user;
      if (authUser && (authUser.id === id || (authUser as any).staffId === id)) {
         useAuthStore.getState().updateUser({
            name: merged.name,
            role: merged.systemRole,
            avatar: merged.avatar
         });
      }

      // SYNC QUEUE : Si le nom a changé, on met à jour la file d'attente pour ne pas perdre le lien visuel
      if (current.name !== merged.name) {
         await db.execute(
            'UPDATE queue SET barber_name = ? WHERE barber_name = ?',
            [merged.name, current.name]
         );
      }

      await db.execute(
        'UPDATE staff SET name = ?, phone = ?, email = ?, password = ?, skills = ?, system_role = ?, gender = ?, avatar = ?, is_available = ?, is_blocked = ?, blocking_reason = ? WHERE id = ?',
        [
          merged.name, 
          merged.phone, 
          merged.email, 
          merged.password,
          JSON.stringify(merged.skills), 
          merged.systemRole, 
          merged.gender, 
          merged.avatar, 
          merged.isAvailable ? 1 : 0,
          merged.isBlocked ? 1 : 0,
          merged.blockingReason,
          id
        ]
      );
      
      const diff = buildDiff(current, merged, ['name', 'phone', 'email', 'systemRole', 'gender', 'isAvailable', 'isBlocked']);
      await logAction('MODIF_STAFF', 'staff', id, { message: `Modification du profil de ${merged.name}`, diff });
      
      await get().fetchStaff();
    } catch (error) {
      console.error('Failed to update staff:', error);
      await get().fetchStaff();
      throw error;
    }
  },

  removeStaff: async (id) => {
    try {
      const db = await getDb();
      const member = get().staff.find(s => s.id === id);
      await db.execute('DELETE FROM staff WHERE id = ?', [id]);
      if (member) {
         await logAction('SUPPR_STAFF', 'staff', id, `Suppression définitive de : ${member.name}`);
      }
      await get().fetchStaff();
    } catch (error) {
      console.error('Failed to remove staff:', error);
    }
  },

  toggleAvailability: async (id) => {
    const member = get().staff.find(s => s.id === id);
    if (member) {
      await get().updateStaff(id, { isAvailable: !member.isAvailable });
    }
  },

  toggleBlock: async (id, reason) => {
    const member = get().staff.find(s => s.id === id);
    if (member) {
      const isBlocking = !member.isBlocked;
      await get().updateStaff(id, { 
        isBlocked: isBlocking,
        blockingReason: isBlocking ? reason : undefined
      });
      await logAction(
         isBlocking ? 'BLOCAGE_STAFF' : 'DEBLOCAGE_STAFF', 
         'staff', 
         id, 
         isBlocking ? `Suspension de ${member.name}. Raison: ${reason || 'Non spécifiée'}` : `Rétablissement de l'accès pour ${member.name}`
      );
    }
  }
}));
