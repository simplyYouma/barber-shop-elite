import React from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Clock, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

export const SessionSection: React.FC = () => {
  const { session_timeout, updateSettings } = useSettingsStore();
  const { showToast } = useNotificationStore();

  const handleTimeoutChange = (minutes: number) => {
    updateSettings({ session_timeout: minutes });
    showToast(`Délai de session mis à jour : ${minutes} min`, 'success');
  };

  const options = [
     { val: 5, label: '5 Minutes', desc: 'Sécurité maximale' },
     { val: 15, label: '15 Minutes', desc: 'Standard recommandé' },
     { val: 30, label: '30 Minutes', desc: 'Utilisation modérée' },
     { val: 60, label: '1 Heure', desc: 'Confort prolongé' },
     { val: 120, label: '2 Heures', desc: 'Usage intense' },
  ];

  return (
    <div className="space-y-10 lg:space-y-12 animate-fade-up">
      <div className="border-b border-steel pb-6 text-black">
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">Sécurité des Accès</p>
        <h3 className="text-3xl lg:text-4xl text-editorial-title">Gestion de Session</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-7 space-y-10">
           <div className="space-y-4">
              <h4 className="text-xl font-serif italic text-black">Déconnexion Automatique</h4>
              <p className="text-sm text-black/40 font-serif leading-relaxed italic">
                 Définissez la durée d'inactivité après laquelle le système fermera automatiquement la session en cours. 
                 Ceci protège vos données en cas d'oubli de déconnexion manuelle.
              </p>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {options.map((opt) => (
                 <button
                    key={opt.val}
                    onClick={() => handleTimeoutChange(opt.val)}
                    className={`p-6 border text-left transition-all group flex flex-col gap-2 ${
                       session_timeout === opt.val 
                       ? 'bg-black border-black text-white' 
                       : 'bg-white border-black/5 hover:border-black text-black'
                    }`}
                 >
                    <div className="flex justify-between items-center w-full">
                       <Clock size={16} className={session_timeout === opt.val ? 'text-luxury' : 'opacity-20'} />
                       {session_timeout === opt.val && <CheckCircle2 size={12} className="text-luxury" />}
                    </div>
                    <div>
                       <p className="text-sm font-bold uppercase tracking-widest">{opt.label}</p>
                       <p className={`text-[9px] font-serif italic ${session_timeout === opt.val ? 'text-white/40' : 'text-black/20'}`}>
                          {opt.desc}
                       </p>
                    </div>
                 </button>
              ))}
           </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
           <div className="p-8 bg-background-soft border border-black/5 space-y-6">
              <div className="flex items-center gap-4 text-black">
                 <ShieldAlert size={28} strokeWidth={1.5} className="text-luxury" />
                 <h5 className="text-xs font-bold uppercase tracking-widest">Conseil Elite</h5>
              </div>
              <p className="text-[11px] font-serif italic text-black/60 leading-relaxed">
                 Pour les appareils partagés sur le comptoir, un délai de <strong>15 minutes</strong> est idéal pour garantir la confidentialité 
                 des encaissements tout en conservant une fluidité de travail.
              </p>
           </div>

           <div className="p-8 border border-black/10 space-y-4">
              <div className="flex items-center gap-3 opacity-20">
                 <History size={16} />
                 <span className="text-[9px] font-bold uppercase tracking-widest">État du Système</span>
              </div>
              <div className="space-y-1">
                 <p className="text-2xl font-serif italic text-black">{session_timeout} min</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-black/40">Délai actuel configuré</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
