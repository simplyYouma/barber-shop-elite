import React, { useState, useEffect, useMemo } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useStaffStore } from '@/store/useStaffStore';
import { useAppointmentStore } from '@/store/useAppointmentStore';
import { Clock, CheckCircle2, ChevronLeft, X, Users, Search, Plus, Calendar, Play, Edit2 } from 'lucide-react';
import { ShareCenterModal } from './ShareCenterModal';
import type { ArchiveItem, StaffMember } from '@/types';
import { isAfter, isSameDay } from 'date-fns';

export const LiveQueueWidget: React.FC = () => {
  const { queue, updateStatus } = useQueueStore();
  const { showToast, showAlert } = useNotificationStore();
  const { staff, toggleAvailability } = useStaffStore();
  
  const [now, setNow] = useState(new Date());
  const [isMinimized, setIsMinimized] = useState(true);
  const [selectedClientForStart, setSelectedClientForStart] = useState<string | null>(null);
  const [barberSearch, setBarberSearch] = useState('');

  const [showAutoTicket, setShowAutoTicket] = useState(false);
  const [completedItem, setCompletedItem] = useState<ArchiveItem | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const inProgressItems = queue.filter(item => item.status === 'in_progress');
  
  const waitingItems = useMemo(() => {
    return queue
      .filter(item => {
        if (item.status === 'waiting') return true;
        if (item.status === 'scheduled' && item.scheduled_at) {
           const apptDate = new Date(item.scheduled_at);
           // On n'affiche que les rendez-vous du jour même
           return isSameDay(apptDate, now);
        }
        return false;
      })
      .sort((a, b) => {
         if (a.status === 'waiting' && b.status === 'scheduled') return -1;
         if (a.status === 'scheduled' && b.status === 'waiting') return 1;
         
         const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : new Date(a.created_at).getTime();
         const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : new Date(b.created_at).getTime();
         return timeA - timeB;
      });
  }, [queue, now]);
  
  const selectedItem = useMemo(() => 
    queue.find(item => item.id === selectedClientForStart), 
    [queue, selectedClientForStart]
  );

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return (staff as StaffMember[])
      .filter(s => {
        const query = barberSearch.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesSkill = Array.isArray(s.skills) && s.skills.some(sk => sk.toLowerCase().includes(query));
        return matchesName || matchesSkill;
      })
      .sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1));
  }, [staff, barberSearch]);

  const workingStaffNames = Array.from(new Set(inProgressItems.map(i => i.barber_name).filter(Boolean)));
  const activeStaffMembers = workingStaffNames
    .map(name => staff.find(s => s.name === name))
    .filter((s): s is StaffMember => s !== undefined);

  if (inProgressItems.length === 0 && waitingItems.length === 0 && isMinimized) {
      return null;
  }

  const formatDynamicTime = (totalSeconds: number) => {
      if (totalSeconds < 60) return `${totalSeconds}s`;
      if (totalSeconds < 3600) {
          const m = Math.floor(totalSeconds / 60);
          const s = totalSeconds % 60;
          return s > 0 ? `${m}m ${s}s` : `${m}m`;
      }
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const calculateDuration = (startedAt?: string) => {
    if (!startedAt) return '0s';
    const diff = Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000);
    return formatDynamicTime(Math.max(0, diff));
  };

  const isTimeForAppointment = (scheduledAt?: string) => {
     if (!scheduledAt) return true;
     const apptDate = new Date(scheduledAt);
     return isAfter(now, apptDate);
  };

  const isLate = (scheduledAt?: string) => {
     if (!scheduledAt) return false;
     const apptDate = new Date(scheduledAt);
     // On considère comme en retard si l'heure est passée de plus de 5 minutes
     const lateTime = new Date(apptDate.getTime() + 5 * 60 * 1000);
     return isAfter(now, lateTime);
  };

  const handleComplete = async (id: string) => {
      const item = queue.find(i => i.id === id);
      if (!item) return;

      try {
         await updateStatus(id, 'completed');
         showToast('Prestation terminée', 'success');
         
         const archiveItem: ArchiveItem = {
            ...item,
            status: 'completed',
            barber_name: item.barber_name || '',
            archived_at: new Date().toISOString()
         };
         
         setCompletedItem(archiveItem);
         setShowAutoTicket(true);

         if (item && item.barber_name) {
            const staffMember = staff.find(s => s.name === item.barber_name);
            if (staffMember && !staffMember.isAvailable) toggleAvailability(staffMember.id);
         }
      } catch (error) {
         console.error('Failed to complete service:', error);
      }
  };
  
    const handleCancel = async (id: string) => {
      const item = queue.find(i => i.id === id);
      if (!item) return;

      const isAppt = !!item.appointment_id;
      
      showAlert({
         title: isAppt ? 'Supprimer le RdV ?' : 'Annuler la session ?',
         message: isAppt 
            ? "Attention : Ce rendez-vous sera également supprimé de l'agenda. Confirmer l'annulation ?"
            : "Voulez-vous vraiment annuler cette session de passage ?",
         confirmLabel: 'ANNULER TOUT',
         cancelLabel: 'GARDER',
         isConfirm: true,
         onConfirm: async () => {
            try {
               // 1. Supprimer de l'agenda si c'est un RDV (cela supprimera aussi de la file via le store)
               if (isAppt && item.appointment_id) {
                  useAppointmentStore.getState().deleteAppointment(item.appointment_id);
               } else {
                  // 2. Sinon supprimer simplement de la file
                  await updateStatus(id, 'cancelled');
               }
               
               // Gérer la remise en liberté du barbier si déjà assigné
               if (item.status === 'in_progress' && item.barber_name) {
                  const staffMember = staff.find(s => s.name === item.barber_name);
                  if (staffMember && !staffMember.isAvailable) toggleAvailability(staffMember.id);
               }
               
               showToast(`Annulé : ${item.client_name || item.client_id}`, 'error');
            } catch (err) {
               console.error("Erreur lors de l'annulation:", err);
               showToast("Erreur lors de l'annulation", "error");
            }
         }
      });
   };

  const handleStart = (clientId: string, barberName: string) => {
     updateStatus(clientId, 'in_progress', barberName);
     showToast(`${barberName} a démarré la session`, 'success');
     setSelectedClientForStart(null);
     setBarberSearch('');
     
     const staffMember = staff.find(s => s.name === barberName);
     if (staffMember && staffMember.isAvailable) toggleAvailability(staffMember.id);
  };

  const renderActionButton = (item: any, isGrayed: boolean) => {
     const assignedBarber = staff.find(s => s.name === item.barber_name);
     const isBusy = assignedBarber && !assignedBarber.isAvailable;
     
     return (
        <button 
           onClick={() => {
              if (isGrayed) {
                 showToast(`Rdv prévu à ${new Date(item.scheduled_at!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 'info');
                 return;
              }
              if (item.barber_name) {
                 if (!isBusy) {
                    handleStart(item.id, item.barber_name);
                 } else {
                    showToast(`${item.barber_name} est occupé.`, 'info');
                 }
              } else {
                 setSelectedClientForStart(item.id);
              }
           }}
           disabled={!!(item.barber_name && isBusy) || isGrayed}
           className={`p-3 transition-all ${
              (item.barber_name && isBusy) || isGrayed 
              ? 'text-black/10 cursor-not-allowed' 
              : 'text-black/20 hover:text-black hover:bg-background-soft'
           }`}
        >
           {(item.barber_name && isBusy) || isGrayed ? <Clock size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
     );
  };

  return (
    <>
      {!isMinimized && (
         <div 
           className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-sm transition-opacity"
           onClick={() => setIsMinimized(true)}
         />
      )}

      <div 
         className={`fixed top-0 bottom-0 right-0 z-[110] bg-white border-l border-black/5 overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            isMinimized 
            ? 'translate-x-[110%] shadow-none w-full md:w-[500px]' 
            : 'translate-x-0 shadow-[0_0_80px_rgba(0,0,0,0.1)] w-full md:w-[500px]'
         }`}
      >
         <div className="flex justify-between items-end p-8 border-b border-black/[0.03] bg-white/50 backdrop-blur-md">
            <div className="space-y-1">
               <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury/60">Gestion Live</p>
               <div className="flex items-center gap-6">
                  <h2 className="text-3xl text-editorial-title text-black">File d'Attente</h2>
                  
                  {activeStaffMembers.length > 0 && (
                     <div className="flex -space-x-2 ml-2">
                        {activeStaffMembers.map(member => (
                           <div key={member.id} className="relative group/stack" title={member.name}>
                              <div className="w-8 h-8 rounded-full border border-white overflow-hidden bg-background-soft flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                                 {member.avatar ? (
                                    <img src={member.avatar} className="w-full h-full object-cover" />
                                 ) : (
                                    <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-5 h-5 object-contain grayscale opacity-20" />
                                 )}
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
            <button 
               onClick={() => setIsMinimized(true)}
               className="p-3 text-black/20 hover:text-black transition-colors"
            >
               <X size={20} />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
            
            <section className="space-y-6">
               <div className="flex items-center justify-between border-b border-black/[0.03] pb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-luxury/60">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     Stations en activité ({inProgressItems.length})
                  </h3>
               </div>

               {inProgressItems.length === 0 ? (
                  <div className="py-12 text-center">
                     <p className="text-xs font-serif italic text-luxury/30">Aucun barbier en prestation actuellement</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {inProgressItems.map(item => {
                        const assignedStaff = staff.find(s => s.name === item.barber_name);
                        return (
                           <div key={item.id} className="bg-white p-6 border border-black/[0.05] shadow-sm hover:shadow-md transition-all group overflow-hidden">
                              <div className="flex justify-between items-start">
                                 <div className="flex gap-5">
                                    <div className="w-14 h-14 bg-background-soft border border-black/[0.03] overflow-hidden flex items-center justify-center shadow-inner">
                                       {assignedStaff?.avatar ? (
                                          <img src={assignedStaff.avatar} alt={assignedStaff.name} className="w-full h-full object-cover" />
                                       ) : (
                                          <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-8 h-8 object-contain grayscale opacity-20" />
                                       )}
                                    </div>
                                    <div>
                                       <p className="text-[9px] font-bold uppercase tracking-widest text-luxury/40 mb-1">
                                          {item.barber_name}
                                       </p>
                                       <p className="text-xl font-serif italic text-black truncate max-w-[180px]">
                                          {item.client_name || item.client_id}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-luxury/40 mb-1">Passage</p>
                                    <p className="text-xl font-serif text-green-600">
                                       {calculateDuration(item.started_at)}
                                    </p>
                                 </div>
                              </div>
                              
                              <div className="flex items-center justify-between border-t border-black/[0.03] mt-6 pt-4">
                                 <p className="text-[9px] font-bold uppercase tracking-widest text-black/30 truncate max-w-[200px]">
                                    {item.service_name}
                                 </p>
                                 <button 
                                    onClick={() => handleComplete(item.id)}
                                    className="flex items-center gap-2 px-6 py-2 bg-black text-white text-[9px] font-bold uppercase tracking-widest hover:bg-luxury hover:text-white transition-all shadow-lg active:scale-95"
                                 >
                                    <CheckCircle2 size={12} /> CLÔTURER
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </section>

            <section className="space-y-6">
               <div className="flex items-center justify-between border-b border-black/[0.03] pb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-luxury/60">
                     <Calendar size={12} /> Rendez-vous du jour ({waitingItems.filter(i => i.status === 'scheduled').length})
                  </h3>
               </div>

               {waitingItems.filter(i => i.status === 'scheduled').length === 0 ? (
                  <div className="py-8 text-center bg-background-soft/20 border border-dashed border-black/5">
                     <p className="text-[10px] font-serif italic text-luxury/30">Aucun rendez-vous pour le moment</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {waitingItems.filter(i => i.status === 'scheduled').map((item) => {
                        const apptTimeReady = isTimeForAppointment(item.scheduled_at);
                        const isGrayed = !apptTimeReady;
                        const late = isLate(item.scheduled_at);
                        
                        return (
                           <div key={item.id} className={`bg-white border border-black/[0.03] p-6 hover:shadow-lg transition-all group flex justify-between items-center ${isGrayed ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                              <div className="flex items-center gap-5">
                                 <Calendar size={18} className={`${isGrayed ? 'text-luxury/30' : 'text-luxury'}`} />
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <p className={`text-lg font-serif italic ${isGrayed ? 'text-black/60' : 'text-black'}`}>{item.client_name || item.client_id}</p>
                                       {late && !isGrayed && <span className="text-[7px] px-1.5 py-0.5 bg-red-500 text-white font-bold tracking-tighter animate-pulse">ALERTE RETARD</span>}
                                       {!late && <span className="text-[7px] px-1.5 py-0.5 bg-luxury text-white font-bold tracking-tighter uppercase">Rdv Confirmé</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <p className="text-[9px] font-bold uppercase tracking-widest text-black/30">
                                          {item.service_name}
                                       </p>
                                       <p className={`text-[9px] font-bold uppercase flex items-center gap-1 ${late ? 'text-red-500' : 'text-luxury/60'}`}>
                                          <Clock size={8} /> {new Date(item.scheduled_at!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                       </p>
                                       {item.barber_name && (
                                          <button 
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedClientForStart(item.id);
                                             }}
                                             className="flex items-center gap-1.5 px-2 py-0.5 border bg-luxury/5 text-luxury border-luxury/10 hover:bg-luxury hover:text-white transition-all group/edit"
                                          >
                                             <span className="text-[8px] font-bold uppercase tracking-tighter">{item.barber_name}</span>
                                             <Edit2 size={8} className="opacity-40 group-hover/edit:opacity-100" />
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 {renderActionButton(item, isGrayed)}
                                 <button onClick={() => handleCancel(item.id)} className="p-3 text-black/10 hover:text-red-500 transition-colors">
                                    <X size={16} />
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </section>

            <section className="space-y-6 pb-20">
               <div className="flex items-center justify-between border-b border-black/[0.03] pb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-luxury/60">
                     <Users size={12} /> Salle d'attente (sans rdv) ({waitingItems.filter(i => i.status === 'waiting').length})
                  </h3>
               </div>

               {waitingItems.filter(i => i.status === 'waiting').length === 0 ? (
                  <div className="py-8 text-center">
                     <p className="text-[10px] font-serif italic text-luxury/30">Aucun client de passage en attente</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {waitingItems.filter(i => i.status === 'waiting').map((item, idx) => (
                           <div key={item.id} className="bg-white border border-black/[0.03] p-6 hover:shadow-lg transition-all group flex justify-between items-center">
                              <div className="flex items-center gap-5">
                                 <span className="text-2xl font-serif italic text-black/10 w-6 group-hover:text-luxury/20 transition-colors">
                                    {idx + 1}
                                 </span>
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <p className="text-lg font-serif italic text-black">{item.client_name || item.client_id}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <p className="text-[9px] font-bold uppercase tracking-widest text-black/30">
                                          {item.service_name}
                                       </p>
                                       {item.barber_name && (
                                          <button 
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedClientForStart(item.id);
                                             }}
                                             className="flex items-center gap-1.5 px-2 py-0.5 border bg-green-500/5 text-green-600 border-green-500/10 hover:bg-green-600 hover:text-white transition-all group/edit"
                                          >
                                             <span className="text-[8px] font-bold uppercase tracking-tighter">{item.barber_name}</span>
                                             <Edit2 size={8} className="opacity-40 group-hover/edit:opacity-100" />
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 {renderActionButton(item, false)}
                                 <button onClick={() => handleCancel(item.id)} className="p-3 text-black/10 hover:text-red-500 transition-colors">
                                    <X size={16} />
                                 </button>
                              </div>
                           </div>
                        ))}
                  </div>
               )}
            </section>
         </div>

         {selectedClientForStart && selectedItem && (
            <div className="absolute inset-0 z-[120] bg-white/95 backdrop-blur-2xl flex flex-col animate-fade-up">
               <div className="p-8 border-b border-black/[0.03] flex justify-between items-center">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-black flex items-center justify-center overflow-hidden">
                        <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-7 h-7 object-contain grayscale invert opacity-40" />
                     </div>
                     <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-luxury/40">Assigner un barbier pour</p>
                        <h3 className="text-2xl text-editorial-title text-black">{selectedItem.client_name || selectedItem.client_id}</h3>
                     </div>
                  </div>
                  <button 
                     onClick={() => { setSelectedClientForStart(null); setBarberSearch(''); }}
                     className="p-3 text-black/20 hover:text-black transition-all"
                  >
                     <X size={24} />
                  </button>
               </div>

               <div className="p-8 space-y-8 flex-1 flex flex-col overflow-hidden">
                  <div className="relative">
                     <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-black/20" />
                     <input 
                        type="text"
                        placeholder="RECHERCHER PAR NOM OU COMPÉTENCE..."
                        className="w-full bg-background-soft border border-black/[0.03] p-6 pl-16 text-[11px] font-bold uppercase tracking-[0.2em] outline-none focus:bg-white focus:border-black/10 transition-all shadow-sm"
                        value={barberSearch}
                        onChange={(e) => setBarberSearch(e.target.value)}
                        autoFocus
                     />
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-3 content-start">
                     {filteredStaff.length === 0 ? (
                        <div className="py-20 text-center opacity-10">
                           <Users size={40} className="mx-auto mb-4" />
                           <p className="text-[9px] uppercase font-bold tracking-widest">Aucun barbier trouvé</p>
                        </div>
                     ) : (
                        filteredStaff.map(member => (
                           <button 
                              key={member.id}
                              onClick={() => {
                                 if (member.isAvailable) {
                                    handleStart(selectedItem.id, member.name);
                                 } else {
                                    updateStatus(selectedItem.id, 'waiting', member.name);
                                    showToast(`${member.name} mis en file pour ce client.`, 'info');
                                    setSelectedClientForStart(null);
                                    setBarberSearch('');
                                 }
                              }}
                              className="w-full flex items-center justify-between p-6 bg-white border border-black/[0.03] hover:border-black/10 hover:shadow-xl transition-all group"
                           >
                              <div className="flex items-center gap-6">
                                 <div className="relative">
                                    <div className="w-14 h-14 border border-black/[0.03] overflow-hidden bg-background-soft flex items-center justify-center">
                                       {member.avatar ? (
                                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                       ) : (
                                          <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-8 h-8 object-contain grayscale opacity-20 group-hover:opacity-40 transition-all" />
                                       )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${member.isAvailable ? 'bg-green-500' : 'bg-orange-500'}`} />
                                 </div>
                                 <div className="text-left">
                                    <div className="flex items-center gap-3">
                                       <p className="text-base font-bold uppercase tracking-widest text-black/80 group-hover:text-black transition-colors">{member.name}</p>
                                       {member.isAvailable ? (
                                          <span className="text-[7px] px-1.5 py-0.5 bg-green-500/10 text-green-600 font-bold uppercase tracking-tighter">LIBRE</span>
                                       ) : (
                                          <span className="text-[7px] px-1.5 py-0.5 bg-orange-500/10 text-orange-600 font-bold uppercase tracking-tighter">OCCUPÉ</span>
                                       )}
                                    </div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-luxury/40 mt-1">
                                       {Array.isArray(member.skills) ? member.skills.join(' • ') : 'Barbier'}
                                    </p>
                                 </div>
                              </div>
                              <Plus size={18} className="text-black/10 group-hover:text-black transition-all" />
                           </button>
                        ))
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>

      {isMinimized && (
         <div 
            className="fixed bottom-6 right-6 lg:right-12 z-[90] animate-fade-up flex items-stretch shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] cursor-pointer group"
            onClick={() => setIsMinimized(false)}
         >
            <div className="bg-black text-white flex items-center p-4 gap-4 border border-white/10 group-hover:bg-luxury transition-colors">
               {workingStaffNames.length > 0 ? (
                  <>
                     <div className="flex -space-x-1.5 mr-1">
                        {activeStaffMembers.slice(0, 3).map(member => (
                           <div key={member.id} className="w-6 h-6 rounded-full border border-black overflow-hidden bg-background-soft flex items-center justify-center">
                              {member.avatar ? (
                                 <img src={member.avatar} className="w-full h-full object-cover" />
                              ) : (
                                 <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-3 h-3 object-contain grayscale invert opacity-50" />
                              )}
                           </div>
                        ))}
                     </div>
                     <div>
                        <p className="text-[7px] font-bold uppercase tracking-widest text-white/40 mb-1">Passage</p>
                        <p className="text-lg font-serif italic leading-none text-green-400">
                           {calculateDuration(inProgressItems[0]?.started_at)}
                        </p>
                     </div>
                  </>
               ) : (
                  <>
                     <Users size={18} className="text-white/40" />
                     <div>
                        <p className="text-[7px] font-bold uppercase tracking-widest text-white/40 mb-1">File</p>
                        <p className="text-lg font-serif italic leading-none">
                           {waitingItems.length} Clients
                        </p>
                     </div>
                  </>
               )}
            </div>
            <div className="bg-white text-black border border-l-0 border-black/5 flex items-center justify-center px-4 group-hover:bg-background-soft transition-colors">
               <ChevronLeft size={16} />
            </div>
         </div>
      )}

      <ShareCenterModal 
         isOpen={showAutoTicket} 
         onClose={() => setShowAutoTicket(false)} 
         item={completedItem} 
      />
    </>
  );
};
