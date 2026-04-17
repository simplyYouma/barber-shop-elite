import React, { useState, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, Search, Scissors, Trash2, Edit3, X, Info, User, UserPlus, CheckCircle2 } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfHour } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStaffStore } from '@/store/useStaffStore';
import { useClientStore } from '@/store/useClientStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAppointmentStore } from '@/store/useAppointmentStore';
import { useQueueStore } from '@/store/useQueueStore';
import { ClientFormModal } from '../Clients/ClientFormModal';

export const AgendaModule: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<any>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const { staff } = useStaffStore();
  const { clients } = useClientStore();
  const { services } = useServiceStore();
  const { showToast, showAlert } = useNotificationStore();
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointmentStore();
  const { syncAppointmentToQueue, removeAppointmentFromQueue } = useQueueStore();
  
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  
  const [appointmentData, setAppointmentData] = useState({
    serviceId: '',
    serviceName: '',
    staffId: '',
    staffName: '',
    note: ''
  });

  const [showClientResults, setShowClientResults] = useState(false);
  const [hoveredAppt, setHoveredAppt] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const displayDays = useMemo(() => view === 'week' 
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i))
    : [currentDate], [currentDate, view]);

  const timeSlots = Array.from({ length: 24 }, (_, i) => i); 

  const nextPeriod = () => setCurrentDate(addDays(currentDate, view === 'week' ? 7 : 1));
  const prevPeriod = () => setCurrentDate(addDays(currentDate, view === 'week' ? -7 : -1));

  const handleCellClick = (day: Date, hour: number) => {
    const slotDate = new Date(day);
    slotDate.setHours(hour);
    if (isBefore(slotDate, startOfHour(new Date()))) return; 

    setEditingAppointment(null);
    setSelectedDay(day);
    setSelectedHour(hour);
    setSelectedClient(null);
    setSearchTerm('');
    setAppointmentData({ serviceId: '', serviceName: '', staffId: '', staffName: '', note: '' });
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    if (!selectedClient || !appointmentData.serviceId) return;

    const id = editingAppointment?.id || Math.random().toString(36).substr(2, 9);
    const apptPayload = {
      id,
      day: selectedDay?.toISOString() || new Date().toISOString(),
      hour: selectedHour ?? 9,
      clientName: selectedClient.name,
      serviceId: appointmentData.serviceId,
      serviceName: appointmentData.serviceName,
      staffId: appointmentData.staffId,
      staffName: appointmentData.staffName,
      note: appointmentData.note
    };

    if (editingAppointment) {
       updateAppointment(editingAppointment.id, apptPayload);
       showToast('Rendez-vous modifié', 'success');
    } else {
       addAppointment(apptPayload);
       showToast('Rendez-vous planifié', 'success');
    }
    
    // Synchro Queue
    await syncAppointmentToQueue(apptPayload);

    setShowAppointmentModal(false);
    setEditingAppointment(null);
    setSearchTerm('');
    setSelectedClient(null);
    setAppointmentData({ serviceId: '', serviceName: '', staffId: '', staffName: '', note: '' });
  };

  const handleDeleteAppointmentLocal = (id: string, e?: React.MouseEvent) => {
     e?.stopPropagation();
     showAlert({
        title: 'Supprimer le RdV ?',
        message: 'Cette action annulera définitivement ce rendez-vous.',
        confirmLabel: 'SUPPRIMER',
        cancelLabel: 'GARDER',
        isConfirm: true,
        onConfirm: async () => {
           deleteAppointment(id);
           await removeAppointmentFromQueue(id);
           setHoveredAppt(null);
           showToast('Rendez-vous supprimé', 'info');
        }
     });
  };

  const handleEditAppointmentLocal = (appt: any, e?: React.MouseEvent) => {
     e?.stopPropagation();
     setEditingAppointment(appt);
     setSelectedDay(new Date(appt.day));
     setSelectedHour(appt.hour);
     setSelectedClient({ name: appt.clientName });
     setAppointmentData({
        serviceId: appt.serviceId || '',
        serviceName: appt.serviceName,
        staffId: appt.staffId || '',
        staffName: appt.staffName || '',
        note: appt.note || ''
     });
     setShowAppointmentModal(true);
     setHoveredAppt(null);
  };

  const handleApptMouseEnter = (appt: any, e: React.MouseEvent) => {
     if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
     if (!containerRef.current) return;
     const containerRect = containerRef.current.getBoundingClientRect();
     const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
     
     setTooltipPos({ 
        x: (rect.left - containerRect.left) + rect.width / 2, 
        y: (rect.top - containerRect.top) 
     });
     setHoveredAppt(appt);
  };

  const handleApptMouseLeave = () => {
     hideTimeoutRef.current = setTimeout(() => {
        setHoveredAppt(null);
     }, 150); 
  };

  const handleTooltipMouseEnter = () => {
     if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const currentViewAppointments = useMemo(() => appointments.filter(appt => 
    displayDays.some(day => isSameDay(new Date(appt.day), day))
  ), [appointments, displayDays]);

  const totalPossibleSlots = displayDays.length * timeSlots.length;
  const occupationRate = totalPossibleSlots > 0 
    ? Math.round((currentViewAppointments.length / totalPossibleSlots) * 100) 
    : 0;

  // Filtrage des clients avec "Client de Passage" en TOP FIXE
  const filteredClients = useMemo(() => {
     const walkInClient = clients.find(c => c.name.toLowerCase().includes('passage')) || { 
        id: 'walk-in', 
        name: 'Client de Passage', 
        phone: '', 
        email: '', 
        address: '' 
     };
     const otherClients = clients.filter(c => !c.name.toLowerCase().includes('passage'));
     
     let results = [];
     if (!searchTerm) {
        results = [walkInClient, ...otherClients];
     } else {
        const filtered = otherClients.filter(c => 
           c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (c.phone && c.phone.includes(searchTerm))
        );
        if (walkInClient.name.toLowerCase().includes(searchTerm.toLowerCase())) {
           results = [walkInClient, ...filtered];
        } else {
           results = filtered;
        }
     }
     return results;
  }, [clients, searchTerm]);

  // Trouver les infos complètes du barbier pour le tooltip
  const hoveredStaff = useMemo(() => {
     if (!hoveredAppt || !hoveredAppt.staffId) return null;
     return staff.find(s => s.id === hoveredAppt.staffId);
  }, [hoveredAppt, staff]);

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-white animate-fade-up relative overflow-hidden">
      {/* Header Agenda */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 lg:p-8 border-b border-steel gap-6 bg-white sticky top-0 z-[30]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <CalendarIcon size={14} className="text-luxury" />
             <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-luxury">Planification & RdV</p>
          </div>
          <h2 className="text-3xl lg:text-4xl text-editorial-title text-black">
             {format(currentDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex border border-black bg-background-soft">
             <button 
                onClick={() => setView('day')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'day' ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
             >
                Jour
             </button>
             <button 
                onClick={() => setView('week')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'week' ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
             >
                Semaine
             </button>
          </div>

          <div className="flex items-center gap-2 border border-black/10 p-1">
             <button onClick={prevPeriod} className="p-2 hover:bg-background-soft text-black transition-all">
                <ChevronLeft size={18} />
             </button>
             <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-[8px] font-bold uppercase tracking-widest hover:underline text-black">
                Aujourd'hui
             </button>
             <button onClick={nextPeriod} className="p-2 hover:bg-background-soft text-black transition-all">
                <ChevronRight size={18} />
             </button>
          </div>

          <button 
            onClick={() => handleCellClick(currentDate, 9)}
            className="btn-premium px-6 py-3 flex items-center gap-2"
          >
            <Plus size={16} /> <span>NOUVEAU RDV</span>
          </button>
        </div>
      </header>

      {/* Main Agenda Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6 lg:p-8 bg-background-soft/30">
        <div className="bg-white border border-black shadow-2xl relative">
           
           <div className={`grid border-b border-steel bg-background-soft sticky top-0 z-20`} style={{ gridTemplateColumns: `100px repeat(${displayDays.length}, 1fr)` }}>
              <div className="p-4 flex flex-col items-center justify-center border-r border-steel text-black/20">
                 <Clock size={16} />
              </div>
              {displayDays.map((day, i) => (
                 <div 
                   key={i} 
                   className={`p-4 text-center border-r border-steel last:border-0 ${isSameDay(day, new Date()) ? 'bg-black text-white' : 'text-black'}`}
                 >
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">{format(day, 'EEE', { locale: fr })}</p>
                    <p className="text-xl font-serif italic">{format(day, 'dd')}</p>
                 </div>
              ))}
           </div>

           <div className="relative">
              {timeSlots.map((hour) => (
                 <div key={hour} className={`grid border-b border-steel/40 group min-h-[120px]`} style={{ gridTemplateColumns: `100px repeat(${displayDays.length}, 1fr)` }}>
                    <div className="p-4 text-right border-r border-steel bg-background-soft/50">
                       <span className="text-[10px] font-bold text-black/40">{String(hour).padStart(2, '0')}:00</span>
                    </div>
                    {displayDays.map((day, dIdx) => {
                       const cellAppts = appointments.filter(a => isSameDay(new Date(a.day), day) && a.hour === hour);
                       
                       const slotDate = new Date(day);
                       slotDate.setHours(hour);
                       const isPast = isBefore(slotDate, startOfHour(new Date()));

                       return (
                       <div 
                          key={dIdx} 
                          className={`relative border-r border-steel/40 last:border-0 transition-all group/cell ${isPast ? 'bg-background-soft/10 cursor-not-allowed' : 'hover:bg-luxury/[0.02] cursor-crosshair'}`}
                          onClick={() => !isPast && handleCellClick(day, hour)}
                       >
                          {isSameDay(day, new Date()) && hour === new Date().getHours() && (
                             <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 z-10 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                          )}
                          
                          <div className="absolute inset-0.5 flex gap-0.5 p-0.5">
                             {cellAppts.map((appt) => {
                                const isCompleted = appt.status === 'completed';
                                const isOverdue = !isCompleted && isPast;
                                
                                return (
                                <div 
                                  key={appt.id} 
                                  onMouseEnter={(e) => handleApptMouseEnter(appt, e)}
                                  onMouseLeave={handleApptMouseLeave}
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     handleCellClick(day, hour);
                                  }}
                                  className={`relative flex-1 p-2 flex flex-col justify-between border-l-2 shadow-md animate-fade-up z-10 overflow-hidden cursor-pointer group/appt hover:scale-[1.02] hover:z-20 transition-all ${
                                    isCompleted 
                                      ? 'bg-green-50 text-green-800 border-green-400' 
                                      : isOverdue 
                                        ? 'bg-red-50 text-red-800 border-red-400'
                                        : 'bg-black text-white border-luxury'
                                  }`}
                                >
                                   <div className="space-y-0.5">
                                      <div className="flex justify-between items-start gap-1">
                                        <p className={`text-[6px] font-bold uppercase tracking-widest ${isCompleted || isOverdue ? 'opacity-60' : 'opacity-40'}`}>{appt.hour}:00</p>
                                        {isOverdue && <Clock size={8} className="text-red-500 animate-pulse shrink-0" />}
                                        {isCompleted && <CheckCircle2 size={8} className="text-green-500 shrink-0" />}
                                      </div>
                                      <p className="text-[9px] font-serif italic truncate leading-tight">{appt.clientName}</p>
                                      {cellAppts.length === 1 && (
                                         <p className="text-[7px] font-bold uppercase opacity-80 truncate">{appt.serviceName}</p>
                                      )}
                                   </div>
                                </div>
                             )})}
                          </div>

                          {!isPast && (
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-xl scale-75 group-hover/cell:scale-100 transition-transform">
                                   <Plus size={16} />
                                </div>
                             </div>
                          )}
                       </div>
                    )})}
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* STICKY TOOLTIP with Barber Photo */}
      {hoveredAppt && (
         <div 
            className="absolute z-[100] bg-white border border-black p-5 shadow-[20px_20px_60px_rgba(0,0,0,0.3)] w-64 animate-scale-in flex flex-col"
            style={{ 
               left: `${Math.min(Math.max(tooltipPos.x, 140), (containerRef.current?.offsetWidth || 0) - 140)}px`, 
               top: `${tooltipPos.y}px`,
               transform: 'translate(-50%, -102%)' 
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleApptMouseLeave}
         >
            <div className="space-y-4 text-black">
               <div className="flex justify-between items-start border-b border-steel pb-2">
                  <div className="space-y-0.5 min-w-0">
                     <p className="text-[7px] font-bold uppercase tracking-widest text-luxury">Fiche Rendez-vous</p>
                     <h4 className="text-sm font-serif italic truncate">{hoveredAppt.clientName}</h4>
                  </div>
                  <div className="w-8 h-8 bg-background-soft flex items-center justify-center shrink-0">
                     <Info size={14} className="opacity-20" />
                  </div>
               </div>
               <div className="space-y-3">
                  <div className="flex items-center gap-3">
                     <Clock size={12} className="text-luxury" />
                     <p className="text-[10px] font-bold uppercase tracking-widest">{hoveredAppt.hour}:00 — {hoveredAppt.hour + 1}:00</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <Scissors size={12} className="text-luxury" />
                     <p className="text-[10px] font-bold uppercase truncate">{hoveredAppt.serviceName}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-background-soft/50 p-2 border border-black/[0.03]">
                     <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white border border-black/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                        {hoveredStaff?.avatar ? (
                           <img src={hoveredStaff.avatar} className="w-full h-full object-cover" alt="Barbier" />
                        ) : (
                           <div className="w-full h-full bg-black text-white flex items-center justify-center text-[10px] font-serif italic">
                              {hoveredAppt.staffName ? hoveredAppt.staffName.charAt(0) : <User size={14} />}
                           </div>
                        )}
                        <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></div>
                     </div>
                     <p className="text-[9px] font-bold uppercase tracking-tighter truncate leading-tight">
                        Barbier : <br/>
                        <span className={hoveredAppt.staffId ? 'text-black text-[11px] font-serif italic' : 'text-slate-400 italic'}>
                           {hoveredAppt.staffName || 'Libre'}
                        </span>
                     </p>
                  </div>
                  {hoveredAppt.note && (
                     <p className="text-[9px] italic opacity-60 leading-tight pt-1">"{hoveredAppt.note}"</p>
                  )}
                  <div className="flex flex-col gap-2 pt-4 border-t border-steel mt-auto">
                     <div className="flex gap-2">
                        <button 
                           onClick={(e) => handleEditAppointmentLocal(hoveredAppt, e)}
                           className="flex-1 bg-black text-white py-3 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest hover:bg-luxury transition-all"
                        >
                           <Edit3 size={12} /> MODIFIER
                        </button>
                        <button 
                           onClick={(e) => handleDeleteAppointmentLocal(hoveredAppt.id, e)}
                           className="bg-red-500 text-white p-3 hover:bg-black transition-all"
                        >
                           <Trash2 size={14} />
                        </button>
                  </div>
               </div>
            </div>
         </div>
         
         <div 
            className="absolute -bottom-2 w-4 h-4 bg-white border-r border-b border-black rotate-45" 
               style={{ 
                  left: `calc(50% + ${Math.min(Math.max(tooltipPos.x, 140), (containerRef.current?.offsetWidth || 0) - 140) - tooltipPos.x}px)`,
                  transform: 'translateX(-50%) rotate(45deg)'
               }}
            />
         </div>
      )}

      {/* Stats Bar */}
      <footer className="p-6 bg-white border-t border-steel flex flex-col sm:flex-row justify-between items-center gap-4 z-[30]">
         <div className="flex gap-8">
            <div className="flex items-center gap-3">
               <div className="w-3 h-3 bg-black" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Occupation : <span className="text-black">{occupationRate}%</span></p>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-3 h-3 bg-luxury" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Rendez-vous : <span className="text-black">{currentViewAppointments.length}</span></p>
            </div>
         </div>
         <div className="text-[10px] font-serif italic text-black/60">
            * Les données sont sauvegardées automatiquement sur cet appareil.
         </div>
      </footer>

      {/* MODALE DE RENDEZ-VOUS */}
      {showAppointmentModal && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-white border-2 border-black w-full max-w-md shadow-2xl animate-scale-in my-auto">
               <div className="p-6 lg:p-8 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[8px] text-luxury font-bold tracking-[0.3em] uppercase">{editingAppointment ? 'EDITION ELITE' : 'NOUVELLE PLANIFICATION'}</p>
                        <h3 className="text-3xl font-editorial-title leading-tight">{editingAppointment ? 'Modifier' : 'Réserver'}</h3>
                     </div>
                     <button onClick={() => { setShowAppointmentModal(false); setEditingAppointment(null); setSearchTerm(''); setSelectedClient(null); }} className="p-2 hover:rotate-90 transition-transform"><X size={24} /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-8 border-y border-steel/20 py-4">
                     <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase tracking-widest text-black/30">DATE SÉLECTIONNÉE</label>
                        <input 
                           type="date" 
                           className="w-full bg-transparent text-sm font-serif italic text-black border-none outline-none cursor-pointer" 
                           value={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : ''} 
                           onChange={(e) => setSelectedDay(new Date(e.target.value))}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase tracking-widest text-black/30">HEURE PRÉCISE</label>
                        <select 
                           className="w-full bg-transparent text-sm font-serif italic text-black border-none outline-none cursor-pointer"
                           value={selectedHour ?? 9}
                           onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                        >
                           {timeSlots.map(h => (
                              <option key={h} value={h}>{h}:00</option>
                           ))}
                        </select>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2 relative">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-black/30">CLIENT(E)</label>
                        <div className="relative flex items-center border-b border-black/10 focus-within:border-black transition-all">
                           <Search size={14} className="text-luxury mr-3" />
                           <input 
                              type="text" 
                              placeholder="Rechercher un client..." 
                              className="flex-1 bg-transparent py-4 text-lg font-serif italic outline-none" 
                              value={selectedClient ? selectedClient.name : searchTerm} 
                              onChange={(e) => { 
                                 setSearchTerm(e.target.value); 
                                 setSelectedClient(null); 
                                 setShowClientResults(true); 
                              }} 
                              onFocus={() => setShowClientResults(true)} 
                           />
                           {selectedClient ? (
                              <button type="button" onClick={() => { setSelectedClient(null); setSearchTerm(''); }} className="text-[10px] font-bold uppercase text-red-500 hover:underline">Libérer</button>
                           ) : (
                              <button 
                                 type="button" 
                                 onClick={() => setShowQuickAddModal(true)} 
                                 className="p-2 hover:bg-background-soft text-luxury transition-all"
                                 title="Ajouter un nouveau client"
                              >
                                 <UserPlus size={20} />
                              </button>
                           )}
                        </div>

                        {showClientResults && !selectedClient && (
                           <div className="absolute top-full left-0 w-full bg-white border-2 border-black shadow-2xl z-[1100] max-h-64 overflow-y-auto custom-scrollbar">
                              {filteredClients.map((client, index) => {
                                 const isWalkIn = client.name.toLowerCase().includes('passage');
                                 return (
                                    <button 
                                       key={client.id || index} 
                                       onClick={() => { setSelectedClient(client); setShowClientResults(false); }} 
                                       className={`w-full p-4 text-left border-b border-steel/30 flex justify-between items-center group transition-all ${isWalkIn ? 'bg-black text-white sticky top-0 z-10' : 'hover:bg-background-soft'}`}
                                    >
                                       <div className="min-w-0">
                                          <p className={`font-serif italic text-base truncate ${isWalkIn ? 'text-luxury uppercase tracking-widest' : 'text-black'}`}>{client.name}</p>
                                          {client.phone && <p className={`text-[8px] font-bold uppercase ${isWalkIn ? 'text-white/30' : 'text-black/30'}`}>{client.phone}</p>}
                                       </div>
                                       <Plus size={14} className={`group-hover:opacity-100 transition-all ${isWalkIn ? 'text-luxury opacity-100' : 'opacity-0 text-luxury'}`} />
                                    </button>
                                 );
                              })}
                              {filteredClients.length === 0 && (
                                 <div className="p-6 text-center space-y-4">
                                    <p className="text-[10px] font-serif italic opacity-40">Aucun client trouvé pour "{searchTerm}"</p>
                                    <button 
                                       onClick={() => setShowQuickAddModal(true)} 
                                       className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-6 py-3 hover:bg-luxury transition-all"
                                    >
                                       CRÉER CETTE FICHE
                                    </button>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[8px] font-bold uppercase tracking-widest text-black/30">SERVICE</label>
                           <select className="w-full bg-transparent border-b border-black/10 py-3 text-sm font-serif italic outline-none cursor-pointer" value={appointmentData.serviceId} onChange={(e) => { const s = services.find(serv => serv.id === e.target.value); setAppointmentData({...appointmentData, serviceId: e.target.value, serviceName: s?.name || ''}); }}>
                              <option value="">Sélectionner...</option>
                              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-bold uppercase tracking-widest text-black/30">EMPLOYÉ(E)</label>
                           <select className="w-full bg-transparent border-b border-black/10 py-3 text-sm font-serif italic outline-none cursor-pointer" value={appointmentData.staffId} onChange={(e) => { const m = staff.find(s => s.id === e.target.value); setAppointmentData({...appointmentData, staffId: e.target.value, staffName: m?.name || ''}); }}>
                              <option value="">Libre</option>
                              {staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-black/30">NOTES</label>
                        <input type="text" placeholder="Détails..." className="w-full bg-transparent border-b border-black/10 py-3 text-xs font-serif italic outline-none" value={appointmentData.note} onChange={(e) => setAppointmentData({...appointmentData, note: e.target.value})} />
                     </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                     <button onClick={() => { setShowAppointmentModal(false); setEditingAppointment(null); setSearchTerm(''); setSelectedClient(null); }} className="flex-1 py-4 border border-black/10 text-[9px] font-bold uppercase tracking-widest hover:bg-background-soft transition-all">ANNULER</button>
                     <button onClick={handleSaveAppointment} disabled={!selectedClient || !appointmentData.serviceId} className="flex-1 py-4 bg-black text-white text-[9px] font-bold uppercase tracking-widest hover:bg-luxury disabled:opacity-20 transition-all shadow-xl shadow-black/10">{editingAppointment ? 'METTRE À JOUR' : 'CONFIRMER'}</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* QUICK ADD MODAL with higher Z-index */}
      <div className="relative z-[2000]">
         <ClientFormModal 
            isOpen={showQuickAddModal} 
            onClose={() => setShowQuickAddModal(false)} 
            initialName={searchTerm} 
            onSuccess={(client) => { 
                setSelectedClient(client); 
                setShowQuickAddModal(false);
                setShowClientResults(false);
            }} 
         />
      </div>
    </div>
  );
};
