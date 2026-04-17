import { invoke } from '@tauri-apps/api/core';

export const AppService = {
  backupDatabase: async (dbName: string = 'barber_elite.db') => {
    try {
      await invoke('backup_database', { dbName });
      console.log('✅ Sauvegarde effectuée avec succès');
    } catch (error) {
      console.error('❌ Échec de la sauvegarde:', error);
    }
  },

  generateId: async (): Promise<string> => {
    return await invoke('generate_id');
  },

  hashPassword: async (password: string): Promise<string> => {
    return await invoke('hash_password', { password });
  },

  verifyPassword: async (password: string, hash: string): Promise<boolean> => {
    return await invoke('verify_password', { password, hash });
  }
};
