import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface JobSkillDefinition {
  id: string;
  label: string;
}

export interface PresetImage {
  id: string;
  url: string;
}

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
  job_skills: JobSkillDefinition[];
  service_presets: PresetImage[];
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
  job_skills: [
    { id: 'barbier', label: 'Maître Barbier' },
    { id: 'coiffeur', label: 'Coiffeur-Visagiste' },
    { id: 'masseur', label: 'Praticien Bien-être' },
    { id: 'facialiste', label: 'Soins Esthétiques' },
    { id: 'onglerie', label: 'Expert Onglerie' },
  ],
  service_presets: [
    { id: 'h1', url: '/assets/services/haircut.png' },
    { id: 'b1', url: '/assets/services/beard.png' },
    { id: 'f1', url: '/assets/services/facial.png' },
    { id: 's1', url: '/assets/services/shampoo.png' },
    { id: 'p1', url: '/assets/services/prestation1.png' },
    { id: 'p2', url: '/assets/services/prestation2.png' },
    { id: 'p3', url: '/assets/services/prestation3.png' },
    { id: 'p4', url: '/assets/services/prestation4.png' },
    { id: 'p5', url: '/assets/services/prestation5.png' },
    { id: 'p6', url: '/assets/services/prestation6.png' },
    { id: 'p7', url: '/assets/services/prestation7.png' },
    { id: 'p8', url: '/assets/services/prestation8.png' },
    { id: 'p9', url: '/assets/services/prestation9.png' },
    { id: 'p10', url: '/assets/services/prestation10.png' },
  ]
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
          const keys = Object.keys(newSettings);
          const diff = buildDiff(oldSettings, newSettings, keys);
          
          let actionLabel = 'MODIF_PARAMETRES';
          let message = 'Mise à jour des paramètres système';

          if (keys.includes('job_skills')) {
            const oldSkills = oldSettings.job_skills || [];
            const newSkills = newSettings.job_skills || [];
            
            if (newSkills.length > oldSkills.length) {
              const added = newSkills.find(ns => !oldSkills.some(os => os.id === ns.id));
              actionLabel = 'AJOUT_COMPETENCE';
              message = `Nouvelle compétence ajoutée au référentiel : ${added?.label || 'Inconnu'}`;
            } else if (newSkills.length < oldSkills.length) {
              const removed = oldSkills.find(os => !newSkills.some(ns => ns.id === os.id));
              actionLabel = 'SUPPR_COMPETENCE';
              message = `Compétence retirée du référentiel : ${removed?.label || 'Inconnu'}`;
            } else {
              actionLabel = 'REF_COMPETENCES';
              message = 'Réorganisation du référentiel des compétences';
            }
          } else if (keys.includes('maintenance_mode')) {
            actionLabel = 'MAINTENANCE_SYSTEME';
            message = newSettings.maintenance_mode ? 'Activation du mode maintenance' : 'Désactivation du mode maintenance';
          } else if (keys.includes('session_timeout')) {
            actionLabel = 'SECURITE_SESSION';
            message = `Modification du délai de déconnexion automatique (${newSettings.session_timeout} min)`;
          } else if (keys.some(k => ['salon_name', 'salon_logo', 'salon_slogan'].includes(k))) {
            actionLabel = 'MODIF_IDENTITE_SALON';
            message = 'Mise à jour de l\'identité visuelle du salon';
          }

          logAction(actionLabel, 'settings', 'global', { message, diff });
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
