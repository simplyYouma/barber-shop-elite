import React from 'react';
import { Settings, ShieldAlert, LogOut, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const MaintenancePage: React.FC = () => {
  const { logout, user } = useAuthStore();

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-black/5 rounded-full animate-pulse-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-black/[0.02] rounded-full animate-reverse-spin" />

      <div className="relative z-10 max-w-xl space-y-10 animate-fade-up">
         <div className="flex flex-col items-center gap-6">
            <div className="relative">
               <div className="w-24 h-24 bg-black text-white flex items-center justify-center rounded-full shadow-2xl">
                  <Settings size={40} className="animate-spin-slow" />
               </div>
               <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-luxury text-white flex items-center justify-center border-4 border-white">
                  <ShieldAlert size={18} />
               </div>
            </div>
            
            <div className="space-y-2">
               <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-luxury">Système Elite • Tactique</p>
               <h1 className="text-5xl lg:text-7xl font-editorial-title text-black leading-tight">Maintenance</h1>
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-lg lg:text-xl font-serif italic text-black leading-relaxed">
               L'accès est temporairement restreint pour votre profil <span className="font-bold uppercase tracking-widest text-sm text-luxury">({user?.role})</span>.
            </p>
            <p className="text-sm text-black/40 font-serif max-w-md mx-auto leading-relaxed">
               Une mise à jour ou une opération de maintenance critique est en cours. Seuls les Administrateurs 
               disposent d'un accès au terminal pour le moment.
            </p>
         </div>

         <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-black/20 italic">
               <Clock size={16} /> Retour à la normale prochainement
            </div>

            <button 
               onClick={logout}
               className="btn-premium px-12 py-5 flex items-center gap-4 group"
            >
               <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
               <span>QUITTER LA SESSION</span>
            </button>
         </div>
      </div>

      <footer className="absolute bottom-10 left-10 right-10 flex flex-col sm:flex-row justify-between items-center gap-4 opacity-20 text-[9px] font-bold uppercase tracking-widest">
         <p>© BARBER SHOP ELITE • PROPRIÉTÉ DE YOUBA SOKONA</p>
         <p>STATUT : ACCÈS RÉSERVÉ ADMIN</p>
      </footer>
    </div>
  );
};
