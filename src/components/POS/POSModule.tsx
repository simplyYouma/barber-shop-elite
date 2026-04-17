import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useClientStore } from '@/store/useClientStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useStaffStore } from '@/store/useStaffStore';
import type { Service, StaffMember, JobSkill } from '@/types';
import { ShoppingCart, Scissors, Plus, Search, User, X, Briefcase } from 'lucide-react';


export const POSModule = () => {
  const { addItem, items, total, removeItem, clearCart } = useCartStore();
  const { clients, addClient, selectedClientForPOS, setSelectedClientForPOS, isQuickAddMode, setIsQuickAddMode } = useClientStore();
  const { addToQueue } = useQueueStore();
  const { services } = useServiceStore();
  const { showToast } = useNotificationStore();
  const { staff } = useStaffStore();

  const [selectedBarber, setSelectedBarber] = useState<StaffMember | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  
  const [showAdd, setShowAdd] = useState(false);
  const [barberSearch, setBarberSearch] = useState('');
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // DECLENCHEMENT RAPIDE DEPUIS LE HEADER
  useEffect(() => {
     if (isQuickAddMode) {
        setShowAdd(true);
        setIsQuickAddMode(false);
     }
  }, [isQuickAddMode, setIsQuickAddMode]);


  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      try {
         const createdClient = await addClient({ name: newName, phone: newPhone });
         setSelectedClientForPOS(createdClient);
         showToast(`Client ${newName} créé et sélectionné`, 'success');
         setNewName('');
         setNewPhone('');
         setShowAdd(false);
      } catch (err) {
         showToast('Erreur lors de la création du client', 'error');
      }
    }
  };

  const [selectedSkill, setSelectedSkill] = useState<JobSkill | null>(null);
  const allSkills = Array.from(new Set(staff.flatMap(s => s.skills || [])));

  const [showBarberSelect, setShowBarberSelect] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    try {
      const clientId = selectedClientForPOS ? selectedClientForPOS.id : 'passage';
      const clientName = selectedClientForPOS ? selectedClientForPOS.name : 'Client de Passage';
      const servicesString = items.map(i => i.name).join(', ');
      
      await addToQueue(clientId, servicesString, total, selectedBarber?.name || '');
      
      if (selectedBarber) {
         showToast(`Vente validée pour ${clientName} (par ${selectedBarber.name})`, 'success');
      } else {
         showToast(`Vente validée pour ${clientName} (File d'attente générale)`, 'success');
      }
      
      clearCart();
      setSelectedClientForPOS(null);
      setSelectedBarber(null);
    } catch (error) {
       console.error('Erreur lors de la validation du ticket:', error);
       showToast('Erreur lors de la validation du ticket', 'error');
    }
  };

  return (
    <>
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-10 h-full pb-4">
        <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-steel pb-6 gap-4">
            <div className="space-y-1 flex-1">
              <p className="text-[9px] text-luxury font-bold tracking-[0.2em] uppercase">LISTE DES PRESTATIONS</p>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <h2 className="text-2xl md:text-3xl text-editorial-title whitespace-nowrap">Nos Services</h2>
                <div className="relative flex-1 max-w-md group animate-fade-right">
                   <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-black transition-colors" />
                   <input 
                      type="text"
                      placeholder="Chercher une prestation..."
                      className="w-full bg-transparent border-b border-black/10 focus:border-black pl-8 pr-3 py-2 text-sm font-serif italic outline-none transition-all placeholder:text-black/20"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                   />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
               {/* BOUTON CLIENT */}
               <div className="relative flex-1 sm:flex-none">
                  {selectedClientForPOS ? (
                     <div className="flex items-center justify-between sm:justify-start gap-4 px-4 md:px-6 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest animate-fade-up border border-black hover:bg-white hover:text-black transition-all cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
                             {selectedClientForPOS.avatar ? (
                                <img src={selectedClientForPOS.avatar} className="w-full h-full object-cover" />
                             ) : (
                                <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-4 h-4 object-contain grayscale invert opacity-50 group-hover:invert-0 group-hover:opacity-100 transition-all" />
                             )}
                          </div>
                          <span className="truncate max-w-[120px]">{selectedClientForPOS.name}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedClientForPOS(null); }} className="ml-2 opacity-50 hover:opacity-100 p-1">
                           <X size={12} />
                        </button>
                     </div>
                  ) : (
                     <button 
                       onClick={() => { setShowClientSelect(!showClientSelect); setShowBarberSelect(false); }}
                       className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2 border border-black text-black bg-white hover:bg-black hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-sm hover:shadow-lg"
                     >
                       <User size={14} className={showClientSelect ? 'scale-110' : ''} /> 
                       <span>Client</span>
                     </button>
                  )}

                  {showClientSelect && (
                     <div className="absolute top-full left-0 mt-4 w-72 md:w-80 bg-white border-2 border-black shadow-[20px_20px_60px_rgba(0,0,0,0.15)] z-[100] animate-fade-up overflow-hidden">
                        <div className="p-4 border-b border-steel bg-background-soft space-y-3">
                           <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                              <input 
                                 type="text"
                                 placeholder="Chercher un client..."
                                 className="w-full bg-white border border-black/10 focus:border-black pl-10 pr-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none transition-all"
                                 value={clientSearch}
                                 onChange={(e) => setClientSearch(e.target.value)}
                                 autoFocus
                              />
                           </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-px custom-scrollbar">
                            {/* Option Client de Passage Toujours Dispo */}
                            <button 
                              onClick={() => { setSelectedClientForPOS(null); setShowClientSelect(false); setClientSearch(''); }}
                              className="w-full text-left p-4 bg-background-soft hover:bg-black group transition-all flex items-center gap-4 border-b border-black/[0.03]"
                            >
                               <div className="w-10 h-10 flex items-center justify-center bg-black/5 group-hover:bg-white/10 overflow-hidden border border-black/5">
                                  <img 
                                    src="/Coupes_BarberShop_PNG/coupe_1.png" 
                                    className="w-6 h-6 object-contain grayscale opacity-20 group-hover:opacity-100 group-hover:invert transition-all" 
                                    alt="Default"
                                  />
                               </div>
                               <div className="flex-1">
                                  <p className="text-[11px] font-bold uppercase tracking-widest group-hover:text-white">Client de Passage</p>
                                  <p className="text-[8px] opacity-40 uppercase font-bold group-hover:text-white/60">Sélection Rapide</p>
                               </div>
                            </button>

                            {clients
                              .filter(c => c.id !== 'passage' && c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                              .slice(0, 50)
                              .map(client => (
                                <button 
                                  key={client.id}
                                  onClick={() => { setSelectedClientForPOS(client); setShowClientSelect(false); setClientSearch(''); }}
                                  className="w-full text-left p-4 bg-white hover:bg-black group transition-all flex items-center gap-4 border-b border-black/[0.03]"
                                >
                                   <div className="w-10 h-10 flex items-center justify-center border border-black/10 group-hover:border-white/20 bg-background-soft overflow-hidden">
                                      {client.avatar ? (
                                         <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" />
                                      ) : (
                                         <img 
                                           src="/Coupes_BarberShop_PNG/coupe_1.png" 
                                           className="w-6 h-6 object-contain grayscale opacity-20 group-hover:opacity-100 group-hover:invert transition-all" 
                                           alt="Default"
                                         />
                                      )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold uppercase tracking-widest group-hover:text-white truncate">{client.name}</p>
                                      <p className="text-[8px] opacity-40 uppercase font-bold group-hover:text-white/60">{client.phone || 'Sans contact'}</p>
                                   </div>
                                   <Plus size={12} className="opacity-0 group-hover:opacity-100 group-hover:text-white transition-all" />
                                </button>
                              ))
                            }
                         </div>
                     </div>
                  )}
               </div>

               {/* BOUTON TEAM */}
               <div className="relative flex-1 sm:flex-none">
                  {selectedBarber ? (
                     <div className="flex items-center justify-between sm:justify-start gap-4 px-4 md:px-6 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest animate-fade-up border border-black hover:bg-white hover:text-black transition-all cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
                             {selectedBarber.avatar ? (
                                <img src={selectedBarber.avatar} className="w-full h-full object-cover" />
                             ) : (
                                <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-4 h-4 object-contain grayscale invert opacity-50 group-hover:invert-0 group-hover:opacity-100 transition-all" />
                             )}
                          </div>
                          <span className="truncate max-w-[120px]">{selectedBarber.name}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedBarber(null); }} className="ml-2 opacity-50 hover:opacity-100 p-1">
                           <X size={12} />
                        </button>
                     </div>
                  ) : (
                     <button 
                       onClick={() => { setShowBarberSelect(!showBarberSelect); setShowClientSelect(false); }}
                       className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2 border border-luxury text-luxury bg-white hover:bg-black hover:text-white hover:border-black transition-all text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-sm hover:shadow-lg"
                     >
                       <Briefcase size={14} className={showBarberSelect ? 'rotate-12' : ''} /> 
                       <span>Team</span>
                     </button>
                  )}

                  {showBarberSelect && (
                     <div className="absolute top-full left-0 mt-4 w-72 md:w-80 bg-white border-2 border-black shadow-[20px_20px_60px_rgba(0,0,0,0.15)] z-[100] animate-fade-up overflow-hidden">
                        <div className="p-4 border-b border-steel bg-background-soft space-y-4">
                           <div className="flex flex-wrap gap-1.5">
                              <button 
                                onClick={() => setSelectedSkill(null)}
                                className={`px-2 py-1 text-[7px] font-bold uppercase border transition-all ${!selectedSkill ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black'}`}
                              >
                                Tous
                              </button>
                              {allSkills.slice(0, 5).map(skill => (
                                 <button 
                                    key={skill}
                                    onClick={() => setSelectedSkill(skill === selectedSkill ? null : skill)}
                                    className={`px-2 py-1 text-[7px] font-bold uppercase border transition-all ${selectedSkill === skill ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black'}`}
                                 >
                                    {skill}
                                 </button>
                              ))}
                           </div>
                           <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                              <input 
                                 type="text"
                                 placeholder="Filtrer équipe ou skill..."
                                 className="w-full bg-white border border-black/10 focus:border-black pl-10 pr-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none transition-all"
                                 value={barberSearch}
                                 onChange={(e) => setBarberSearch(e.target.value)}
                              />
                           </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-px custom-scrollbar">
                            {[...staff].sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1))
                               .filter(s => {
                                  const matchesSearch = s.name.toLowerCase().includes(barberSearch.toLowerCase()) || 
                                                       (s.skills || []).some(skill => skill.toLowerCase().includes(barberSearch.toLowerCase()));
                                  const matchesSkill = !selectedSkill || (s.skills || []).includes(selectedSkill);
                                  return matchesSearch && matchesSkill;
                                }).map(barber => (
                                <button 
                                  key={barber.id}
                                  onClick={() => { setSelectedBarber(barber); setShowBarberSelect(false); setBarberSearch(''); setSelectedSkill(null); }}
                                  className="w-full text-left p-4 bg-white hover:bg-black group transition-all flex items-center gap-4 border-b border-black/[0.03] relative z-10"
                                >
                                   <div className="relative overflow-hidden w-10 h-10 border border-black/10 group-hover:border-white/20 flex items-center justify-center bg-background-soft">
                                      {barber.avatar ? (
                                         <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                                      ) : (
                                         <img 
                                           src="/Coupes_BarberShop_PNG/coupe_1.png" 
                                           className="w-6 h-6 object-contain grayscale opacity-20 group-hover:opacity-100 group-hover:invert transition-all" 
                                           alt="Default"
                                         />
                                      )}
                                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${barber.isAvailable ? 'bg-green-500' : 'bg-orange-500'}`} />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                         <p className="text-[11px] font-bold uppercase tracking-widest group-hover:text-white truncate">{barber.name}</p>
                                         {!barber.isAvailable && (
                                            <span className="text-[6px] px-1 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold uppercase tracking-tighter">Occupé</span>
                                         )}
                                         {barber.isAvailable && (
                                            <span className="text-[6px] px-1 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 font-bold uppercase tracking-tighter">Libre</span>
                                         )}
                                      </div>
                                      <p className="text-[8px] opacity-40 uppercase font-bold group-hover:text-white/60">{(barber.skills || []).join(', ')}</p>
                                   </div>
                                   <Plus size={12} className="opacity-0 group-hover:opacity-100 group-hover:text-white transition-all -translate-x-2 group-hover:translate-x-0" />
                                </button>
                             ))}
                          </div>
                     </div>
                  )}
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {services.filter((s: Service) => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map((service: Service) => (
              <button
                key={service.id}
                onClick={() => addItem(service)}
                className="group relative overflow-hidden card-editorial h-[220px] md:h-[260px] transition-all duration-500 border border-steel hover:border-black flex flex-col justify-end p-0"
              >
                {service.image ? (
                   <div className="absolute inset-0">
                      <img 
                        src={service.image} 
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                   </div>
                ) : (
                   <div className="absolute inset-0 bg-background-soft flex items-center justify-center">
                      <Scissors size={48} className="text-luxury/20" />
                   </div>
                )}
                
                <div className="relative p-6 md:p-8 space-y-2 text-left w-full group-hover:pb-10 transition-all duration-300">
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className={`font-serif italic text-xl md:text-2xl leading-tight ${service.image ? 'text-white' : 'text-black'}`}>
                            {service.name}
                         </p>
                         <p className={`font-bold text-sm tracking-tighter ${service.image ? 'text-white/70' : 'text-black/60'}`}>
                            {service.price.toLocaleString()} FCFA
                         </p>
                      </div>
                      <div className={`p-3 transition-all duration-300 ${service.image ? 'bg-white text-black' : 'bg-black text-white'} opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0`}>
                         <Plus size={20} />
                      </div>
                   </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col mt-8 lg:mt-0">
          <div className="flex-1 bg-white border border-black flex flex-col overflow-hidden shadow-sm">
             <div className="p-8 border-b border-steel flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-black text-white">
                      <ShoppingCart size={18} />
                   </div>
                   <h2 className="text-editorial-title text-xl">Récapitulatif</h2>
                </div>
                <button 
                  onClick={clearCart}
                  className="text-[9px] font-bold uppercase tracking-widest text-red-600 hover:underline"
                >
                  Vider
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {items.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                      <ShoppingCart size={48} strokeWidth={1} className="mb-4" />
                      <p className="text-[10px] uppercase tracking-widest font-bold">Sélectionnez un service</p>
                   </div>
                ) : (
                   items.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="flex justify-between items-center group animate-fade-up">
                         <div className="space-y-1">
                            <p className="text-sm font-serif italic">{item.name}</p>
                            <p className="text-[11px] font-bold tracking-tighter opacity-60">{item.price.toLocaleString()} FCFA</p>
                         </div>
                         <button 
                           onClick={() => removeItem(item.id)}
                           className="p-2 hover:bg-black hover:text-white transition-all"
                         >
                           <Plus size={14} className="rotate-45" />
                         </button>
                      </div>
                   ))
                )}
             </div>

             <div className="p-6 md:p-8 bg-background-soft border-t border-black space-y-6">
                <div className="flex justify-between items-end">
                   <p className="text-luxury">MONTANT TOTAL</p>
                   <p className="text-4xl text-editorial-title">{total.toLocaleString()} <span className="text-xs uppercase">fcfa</span></p>
                </div>

                <button 
                  disabled={items.length === 0}
                  onClick={handleCheckout}
                  className="btn-premium w-full py-6 disabled:opacity-30 disabled:pointer-events-none transition-all group"
                >
                   <span className="flex items-center gap-3 uppercase">
                     Valider l'encaissement {selectedClientForPOS && `pour ${selectedClientForPOS.name.split(' ')[0]}`}
                   </span>
                </button>
             </div>
          </div>
        </div>
      </div>
  
      {showAdd && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm p-6 animate-fade-up">
            <div className="w-full max-w-xl bg-white border border-black p-12 shadow-2xl relative">
               <button 
                 onClick={() => setShowAdd(false)}
                 className="absolute top-8 right-8 p-2 hover:rotate-90 transition-transform"
               >
                 <Plus size={24} className="rotate-45" />
               </button>
               <p className="text-luxury mb-2">CRÉATION RAPIDE</p>
               <h2 className="text-4xl text-editorial-title mb-10">Nouveau Client</h2>
               <form onSubmit={handleCreateClient} className="space-y-8">
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Nom de l'Adhérent</label>
                        <input 
                           autoFocus
                           className="w-full bg-background-soft border-b border-black/20 focus:border-black px-0 py-4 text-xl font-serif italic outline-none transition-all placeholder:opacity-20"
                           placeholder="Entrez le nom complet..."
                           value={newName}
                           onChange={(e) => setNewName(e.target.value)}
                           required
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Coordonnées Téléphoniques</label>
                        <input 
                           className="w-full bg-background-soft border-b border-black/20 focus:border-black px-0 py-4 text-xl font-serif italic outline-none transition-all placeholder:opacity-20"
                           placeholder="+221 ..."
                           value={newPhone}
                           onChange={(e) => setNewPhone(e.target.value)}
                        />
                     </div>
                  </div>
                  <div className="flex gap-0 pt-6">
                     <button type="submit" className="flex-1 btn-premium py-6">
                        CRÉER ET SÉLECTIONNER
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </>
  );
};
