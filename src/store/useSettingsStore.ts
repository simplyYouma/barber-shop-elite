import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SalonSettings {
  salon_name: string;
  salon_slogan: string;
  salon_logo: string | null;
  salon_logo_theme: 'dark' | 'light';
  currency: string;
  phone: string;
  address: string;
  website: string;
  session_timeout: number; // in minutes
  maintenance_mode: boolean;
}

interface SettingsState extends SalonSettings {
  updateSettings: (settings: Partial<SalonSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: SalonSettings = {
  salon_name: 'Barber Shop',
  salon_slogan: 'L’Excellence au Naturel',
  salon_logo: null,
  salon_logo_theme: 'light',
  currency: 'FCFA',
  phone: '+223 00 00 00 00',
  address: 'Bamako, Mali',
  website: '',
  session_timeout: 30, // 30 minutes par défaut
  maintenance_mode: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (newSettings) => {
        const oldSettings = get();
        set((state) => ({ ...state, ...newSettings }));
        
        // Audit log async import to avoid circular dependency
        import('@/lib/auditService').then(({ logAction, buildDiff }) => {
          const diff = buildDiff(oldSettings, newSettings, Object.keys(newSettings));
          logAction('MODIF_IDENTITE_SALON', 'settings', 'global', { message: 'Mise à jour de l\'identité du salon', diff });
        });
      },

      resetSettings: () => {
        set(DEFAULT_SETTINGS);
        import('@/lib/auditService').then(({ logAction }) => {
          logAction('RESET_IDENTITE_SALON', 'settings', 'global', 'Restauration des paramètres d\'usine');
        });
      },
    }),
    {
      name: 'barber-shop-settings',
    }
  )
);
