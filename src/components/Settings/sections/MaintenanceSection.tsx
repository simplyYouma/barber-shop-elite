import React from 'react';
import { RefreshCcw, ShieldOff, ShieldCheck } from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export const MaintenanceSection: React.FC = () => {
  const { showToast, showAlert } = useNotificationStore();
  const { maintenance_mode, updateSettings } = useSettingsStore();

  const toggleMaintenance = () => {
     const nextState = !maintenance_mode;
     showAlert({
        title: nextState ? 'Activer la Maintenance ?' : 'Désactiver la Maintenance ?',
        message: nextState 
           ? 'En mode maintenance, seul les administrateurs pourront accéder à l\'application. Les sessions des employés seront verrouillées.'
           : 'Le système sera de nouveau accessible pour l\'ensemble du personnel.',
        confirmLabel: nextState ? 'ACTIVER LE MODE' : 'DÉSACTIVER LE MODE',
        cancelLabel: 'ANNULER',
        isConfirm: true,
        onConfirm: () => {
           updateSettings({ maintenance_mode: nextState });
           showToast(nextState ? 'Système en maintenance' : 'Système réactivé', nextState ? 'warning' : 'success');
        }
     });
  };

  return (
    <div className="space-y-10 lg:space-y-12 animate-fade-up">
      <div className="border-b border-steel pb-6 text-black flex justify-between items-end">
        <div className="space-y-1">
           <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">Opérations Système</p>
           <h3 className="text-3xl lg:text-4xl text-editorial-title">Maintenance</h3>
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 border ${maintenance_mode ? 'bg-orange-500 text-white border-orange-500' : 'bg-green-500 text-white border-green-500'} animate-pulse`}>
           {maintenance_mode ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
           <span className="text-[9px] font-bold uppercase tracking-widest">{maintenance_mode ? 'MAINTENANCE ACTIVE' : 'SYSTEME EN LIGNE'}</span>
        </div>
      </div>

      {/* Maintenance Toggle Card */}
      <div className={`p-8 lg:p-12 border ${maintenance_mode ? 'bg-black text-white border-black shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]' : 'bg-white text-black border-black'} transition-all duration-700`}>
         <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="space-y-4 text-center md:text-left">
               <div className="flex items-center gap-4 justify-center md:justify-start">
                  <RefreshCcw size={32} strokeWidth={1} className={maintenance_mode ? 'animate-spin' : ''} />
                  <h4 className="text-3xl font-serif italic">Mode Maintenance</h4>
               </div>
               <p className={`text-sm font-serif leading-relaxed max-w-lg italic ${maintenance_mode ? 'text-white/60' : 'text-black/40'}`}>
                  L'activation de ce mode restreint l'accès total au logiciel uniquement aux comptes Administrateurs. 
                  Idéal lors de mises à jour, inventaires ou configurations critiques.
               </p>
            </div>
            <button 
               onClick={toggleMaintenance}
               className={`px-12 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all shrink-0 ${
                  maintenance_mode 
                     ? 'bg-white text-black hover:bg-luxury' 
                     : 'bg-black text-white hover:bg-luxury'
               }`}
            >
               {maintenance_mode ? 'INTERROMPRE LA MAINTENANCE' : 'ACTIVER LA MAINTENANCE'}
            </button>
         </div>
      </div>

      <div className="p-10 border border-dashed border-black/10 flex items-center justify-center">
         <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-20 italic">Accès restreint au niveau Administrateur</p>
      </div>
    </div>
  );
};
