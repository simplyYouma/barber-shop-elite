import { useState, useEffect } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { useStaffStore } from '@/store/useStaffStore';
import { Clock, X, Scissors, CreditCard, Timer, Search, Plus, Calendar } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { useNotificationStore } from '@/store/useNotificationStore';

export const QueueModule = () => {
  const { queue, updateStatus } = useQueueStore();
  const { staff } = useStaffStore();
  const { showToast } = useNotificationStore();
  const [now, setNow] = useState(new Date());
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [barberSearch, setBarberSearch] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDynamicTime = (totalSeconds: number) => {
     if (totalSeconds < 60) return `${totalSeconds} s`;
     if (totalSeconds < 3600) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return s > 0 ? `${m}m ${s}s` : `${m} min`;
     }
     const h = Math.floor(totalSeconds / 3600);
     const m = Math.floor((totalSeconds % 3600) / 60);
     return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getTimerDisplay = (item: any) => {
     if (item.status === 'completed' || item.status === 'cancelled') return 'Clôturé';
     
     if (item.status === 'scheduled' && item.scheduled_at) {
        const schedDate = new Date(item.scheduled_at);
        if (isBefore(now, schedDate)) {
           return `Prévu : ${format(schedDate, 'HH:mm')}`;
        }
        return `Attente : ${formatDynamicTime(Math.floor((now.getTime() - schedDate.getTime()) / 1000))}`;
     }

     if (item.status === 'waiting') {
        const diff = Math.floor((now.getTime() - new Date(item.created_at).getTime()) / 1000);
        return `Attente : ${formatDynamicTime(Math.max(0, diff))}`;
     }
     if (item.status === 'in_progress' && item.started_at) {
        const diff = Math.floor((now.getTime() - new Date(item.started_at).getTime()) / 1000);
        return `Exécution : ${formatDynamicTime(Math.max(0, diff))}`;
     }
     return '-';
  };

  return (
    <div className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full pb-10">
      {/* Header — Épuré */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-steel pb-8 gap-6">
        <div className="space-y-1">
          <p className="text-[9px] text-luxury font-bold tracking-[0.2em] uppercase">CENTRE DE CONTRÔLE</p>
          <h2 className="text-3xl md:text-4xl text-editorial-title">File d'Attente</h2>
        </div>
        
        <div className="hidden lg:block text-right">
           <p className="text-[9px] text-luxury font-bold opacity-40 uppercase">Mode Automatique</p>
           <p className="text-[10px] font-bold italic">Rendez-vous & Passage Direct</p>
        </div>
      </div>

      {/* Liste des Positions */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        {queue.length === 0 ? (
           <div className="h-80 flex flex-col items-center justify-center text-center opacity-10 border border-dashed border-steel bg-white/50 animate-fade-up">
              <Clock size={64} strokeWidth={1} className="mb-6" />
              <p className="text-[12px] uppercase tracking-[0.3em] font-bold">La file est actuellement vide</p>
              <p className="text-[10px] mt-2">Validez une vente ou planifiez un rendez-vous</p>
           </div>
        ) : (
          queue.map((item, idx) => {
            const isScheduled = item.status === 'scheduled' && item.scheduled_at;
            const isFutureAppointment = isScheduled && isBefore(now, new Date(item.scheduled_at!));
            
            return (
               <div 
                 key={item.id} 
                 className={`p-6 md:p-8 border border-steel flex flex-col md:flex-row justify-between items-start md:items-center transition-all animate-fade-up relative group gap-6 
                   ${item.status === 'in_progress' ? 'bg-black text-white border-black shadow-2xl scale-[1.02] z-10' : 'bg-white'} 
                   ${isFutureAppointment ? 'opacity-30 grayscale border-dashed border-luxury/20' : ''}
                   ${item.status === 'completed' ? 'opacity-40 grayscale' : ''}
                 `}
               >
                 <div className="flex items-center gap-6 md:gap-10 w-full md:w-auto min-w-0">
                   <div className={`font-serif text-3xl italic w-10 shrink-0 ${item.status === 'in_progress' ? 'text-white' : isFutureAppointment ? 'text-luxury/20' : 'text-slate-300'}`}>
                      {String(idx + 1).padStart(2, '0')}
                   </div>
                   
                   <div className="space-y-3 min-w-0 flex-1">
                      {/* Nom du Client */}
                      <div className="flex items-center gap-3">
                         <h3 className={`text-2xl md:text-4xl text-editorial-title leading-none truncate ${item.status === 'in_progress' ? 'text-white' : ''}`}>
                           {item.client_name || 'Client Inconnu'}
                         </h3>
                         {isScheduled && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-luxury/10 border border-luxury/20">
                               <Calendar size={10} className="text-luxury" />
                               <span className="text-[8px] font-bold uppercase tracking-widest text-luxury">RdV</span>
                            </div>
                         )}
                      </div>
   
                      {/* Détails du Service & Prix */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                         <div className="flex items-center gap-2">
                            <Scissors size={12} className={item.status === 'in_progress' ? 'text-white/40' : 'text-luxury/40'} />
                            <p className={`text-[11px] font-serif italic ${item.status === 'in_progress' ? 'text-white/80' : 'text-black/60'}`}>
                              {item.service_name || 'Service Standard'}
                            </p>
                         </div>
                         {item.price > 0 && (
                            <div className="flex items-center gap-2">
                               <CreditCard size={12} className={item.status === 'in_progress' ? 'text-white/40' : 'text-luxury/40'} />
                               <p className={`text-[11px] font-bold tracking-tighter ${item.status === 'in_progress' ? 'text-white' : 'text-black'}`}>
                                 {item.price.toLocaleString()} FCFA
                               </p>
                            </div>
                         )}
                         {item.barber_name && (
                            <div className="flex items-center gap-2 border-l border-steel/30 pl-2 sm:pl-6">
                               <span className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'in_progress' ? 'text-white' : 'text-luxury'}`}>
                                  {isFutureAppointment ? 'Réservé à : ' : 'Géré par : '} {item.barber_name}
                               </span>
                            </div>
                         )}
                      </div>
   
                      {/* Status Badge */}
                      <div className="flex items-center gap-3 pt-1">
                         <span className={`w-1.5 h-1.5 rounded-full ${
                           item.status === 'waiting' || (isScheduled && !isFutureAppointment) ? 'bg-black' : 
                           item.status === 'in_progress' ? 'bg-green-500 animate-pulse' : 'bg-slate-400 opacity-30'
                         }`} />
                         <p className={`text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 ${item.status === 'in_progress' ? 'text-green-400' : isFutureAppointment ? 'text-luxury/50' : 'text-luxury'}`}>
                           <Timer size={10} /> 
                           {getTimerDisplay(item)}
                         </p>
                      </div>
                   </div>
                 </div>
   
                 {/* Actions de Gestion */}
                 <div className={`flex flex-wrap gap-3 w-full md:w-auto mt-2 md:mt-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 ${isFutureAppointment ? 'pointer-events-none grayscale opacity-10' : ''}`}>
                   {(item.status === 'waiting' || (isScheduled && !isFutureAppointment)) && (
                     <div className="relative">
                       <button 
                         onClick={() => {
                           if (item.barber_name) {
                              updateStatus(item.id, 'in_progress');
                              showToast(`Session démarrée pour ${item.client_name || 'Client'}`, 'info');
                           } else {
                              setAssigningId(item.id);
                           }
                         }}
                         className="px-8 py-4 border border-black hover:bg-black hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest bg-white text-black flex items-center gap-2"
                       >
                         {item.barber_name ? 'DÉMARRER' : 'ASSIGNER & DÉMARRER'}
                       </button>
   
                       {assigningId === item.id && (
                          <div className="absolute top-0 right-0 w-72 md:w-80 bg-white border-2 border-black shadow-[20px_20px_60px_rgba(0,0,0,0.2)] z-[100] animate-fade-up overflow-hidden text-black">
                             <div className="p-4 border-b border-steel bg-background-soft flex justify-between items-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-black">Assigner Équipe</p>
                                <button onClick={() => setAssigningId(null)} className="hover:rotate-90 transition-transform"><X size={14} /></button>
                             </div>
                             <div className="p-4 border-b border-steel bg-white">
                                <div className="relative">
                                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                                   <input 
                                      type="text"
                                      placeholder="Filtrer équipe..."
                                      className="w-full bg-white border border-black/10 focus:border-black pl-10 pr-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none"
                                      value={barberSearch}
                                      onChange={(e) => setBarberSearch(e.target.value)}
                                      autoFocus
                                   />
                                </div>
                             </div>
   
                             <div className="max-h-64 overflow-y-auto custom-scrollbar bg-white">
                                {(staff || []).length > 0 ? (
                                   [...staff]
                                      .sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1))
                                      .filter(s => s.name.toLowerCase().includes(barberSearch.toLowerCase()))
                                      .map(barber => (
                                         <button 
                                           key={barber.id}
                                           onClick={() => {
                                              updateStatus(item.id, 'in_progress', barber.name);
                                              showToast(`Session démarrée par ${barber.name}`, 'success');
                                              setAssigningId(null);
                                              setBarberSearch('');
                                           }}
                                           className="w-full text-left p-4 bg-white hover:bg-black hover:text-white group transition-all flex items-center gap-4 border-b border-black/[0.03] relative z-10"
                                         >
                                            <div className="relative">
                                               {barber.avatar ? (
                                                  <img src={barber.avatar} alt={barber.name} className="w-8 h-8 object-cover border border-black/10 group-hover:border-white/20" />
                                               ) : (
                                                  <div className="w-8 h-8 flex items-center justify-center bg-background-soft text-black group-hover:bg-white/10 group-hover:text-white text-xs font-serif italic border border-black/10">
                                                     {barber.name.charAt(0)}
                                                  </div>
                                               )}
                                               <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${barber.isAvailable ? 'bg-green-500' : 'bg-orange-500'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                               <div className="flex items-center gap-2">
                                                  <p className="text-[10px] font-bold uppercase tracking-widest truncate">{barber.name}</p>
                                               </div>
                                               <p className="text-[7px] opacity-40 uppercase font-bold">{Array.isArray(barber.skills) ? barber.skills[0] : 'Barbier'}</p>
                                            </div>
                                            <Plus size={10} className="opacity-0 group-hover:opacity-100" />
                                         </button>
                                      ))
                                ) : (
                                   <div className="py-10 text-center opacity-30">
                                      <p className="text-[10px] font-bold uppercase tracking-widest">Aucun membre disponible</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       )}
                     </div>
                   )}
                   {item.status === 'in_progress' && (
                     <button 
                       onClick={() => {
                         updateStatus(item.id, 'completed');
                         showToast(`Prestation terminée avec succès`, 'success');
                       }}
                       className="px-8 py-4 border border-white bg-white text-black hover:bg-black hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest"
                     >
                       TERMINER
                     </button>
                   )}
                   <button 
                     onClick={() => {
                       updateStatus(item.id, 'cancelled');
                       showToast('Prestation annulée', 'info');
                     }}
                     className={`p-4 border transition-all ${item.status === 'in_progress' ? 'border-white/20 text-white/40 hover:text-white hover:border-white' : 'border-steel text-slate-300 hover:text-red-600 hover:border-red-600'}`}
                     title="Annuler la prestation"
                   >
                     <X size={18} />
                   </button>
                 </div>
               </div>
            );
          })
        )}
      </div>
    </div>
  );
};
