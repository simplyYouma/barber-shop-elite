import { useState } from 'react';
import { useClientStore } from '@/store/useClientStore';
import { useArchiveStore } from '@/store/useArchiveStore';
import { useServiceStore } from '@/store/useServiceStore';
import { Search, UserPlus, Phone, History, Plus, Edit, Trash2, Scissors, User as UserIcon, FileText } from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { ShareCenterModal } from '@/components/Common/ShareCenterModal';
import { ClientFormModal } from './ClientFormModal';
import type { ArchiveItem, Client } from '@/types';

export const ClientsModule = () => {
    const { searchClients, removeClient } = useClientStore();
    const { archives } = useArchiveStore();
    const { services } = useServiceStore();
    const { showToast, showAlert } = useNotificationStore();
    
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    
    // États pour l'historique
    const [showHistory, setShowHistory] = useState(false);
    const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

    // États pour le ticket sélectionné depuis l'historique
    const [showTicket, setShowTicket] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<ArchiveItem | null>(null);

    const filteredClients = searchClients(search).sort((a, b) => {
       if (a.name.toLowerCase().includes('passage')) return -1;
       if (b.name.toLowerCase().includes('passage')) return 1;
       return 0;
    });

    const handleEdit = (client: Client) => {
       setEditingClient(client);
    };

   const confirmDelete = (client: Client) => {
      showAlert({
         title: 'Suppression Client',
         message: `Voulez-vous retirer ${client.name} de l'annuaire ? (L'historique des passages sera conservé)`,
         confirmLabel: 'SUPPRIMER LA FICHE',
         cancelLabel: 'ANNULER',
         isConfirm: true,
         onConfirm: () => {
            removeClient(client.id);
            showToast('Fiche client retirée', 'info');
         }
      });
   };

   const openHistory = (client: Client) => {
      setSelectedClientForHistory(client);
      setShowHistory(true);
   };

   const openTicket = (item: ArchiveItem) => {
      setSelectedTicket(item);
      setShowTicket(true);
   };

   return (
     <>
        <div className="flex flex-col h-full gap-10">
        <div className="flex justify-between items-end border-b border-black pb-8">
          <div className="space-y-1">
            <p className="text-luxury">ANNUAIRE CLIENTÈLE</p>
            <h2 className="text-4xl text-editorial-title">Base Clients</h2>
          </div>
          
          <div className="flex gap-6 items-center">
            <div className="relative group">
               <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-black" />
               <input 
                type="text" 
                placeholder="RECHERCHER..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-b border-black/20 focus:border-black pl-8 pr-4 py-3 text-[11px] font-bold uppercase tracking-widest outline-none transition-all w-64 placeholder:text-luxury/50"
               />
            </div>
            
            <button 
              onClick={() => setShowAdd(true)}
              className="btn-premium py-3 px-8"
            >
              <UserPlus size={16} /> NOUVEAU CLIENT
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto pr-4 custom-scrollbar content-start pb-20">
           {filteredClients.length === 0 ? (
              <div className="col-span-full h-80 flex flex-col items-center justify-center text-center opacity-10 border border-dashed border-black">
                 <UserPlus size={64} strokeWidth={1} className="mb-6" />
                 <p className="text-[12px] uppercase tracking-[0.3em] font-bold">Aucun client ne correspond à votre recherche</p>
              </div>
           ) : (
              filteredClients.map((client) => {
                 const clientHistory = archives.filter(a => 
                    a.client_id === client.id || 
                    a.client_id === client.name
                 );
                 
                 const totalPassages = clientHistory.length;
                 const totalValue = clientHistory.reduce((sum, item) => sum + (item.price || 0), 0);
                 const formattedValue = totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toLocaleString();

                 const isPassage = client.name.toLowerCase().includes('passage');

                 return (
                    <div key={client.id} className={`p-10 flex flex-col relative group transition-all duration-500 shadow-2xl ${isPassage ? 'bg-black text-white scale-[1.02] z-10 border-black' : 'card-editorial hover:-translate-y-1 hover:border-black transition-all'}`}>
                        {!isPassage && (
                          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                             <button onClick={() => handleEdit(client)} className="p-2 border border-black/10 hover:border-black transition-all bg-white text-black" title="Modifier le profil"><Edit size={14} /></button>
                             <button onClick={() => confirmDelete(client)} className="p-2 border border-black/10 hover:border-red-500 hover:text-red-500 transition-all bg-white text-black" title="Supprimer"><Trash2 size={14} /></button>
                          </div>
                        )}

                        <div className="flex items-center gap-6 mb-8">
                          <div className={`w-16 h-16 flex items-center justify-center overflow-hidden shrink-0 ${isPassage ? '' : 'bg-background-soft border border-black/10 group-hover:border-black/30 transition-all shadow-inner'}`}>
                             {isPassage ? (
                                <img src="/Coupes_BarberShop_PNG/coupe_1_WhiteTrait.png" className="w-full h-full object-contain" />
                             ) : client.avatar ? (
                                <img src={client.avatar} className="w-full h-full object-cover" />
                             ) : (
                                <img 
                                  src="/Coupes_BarberShop_PNG/coupe_1.png" 
                                  className="w-10 h-10 object-contain grayscale opacity-20 group-hover:opacity-100 transition-all" 
                                  alt="Default"
                                />
                             )}
                          </div>
                          <div className="space-y-1">
                             <h3 className={`text-2xl ${isPassage ? 'text-white font-serif italic' : 'text-editorial-title'}`}>{client.name}</h3>
                             <p className={`text-[10px] font-bold italic ${isPassage ? 'text-white/40 uppercase tracking-[0.2em]' : 'text-luxury opacity-60'}`}>
                                {isPassage ? 'Accès Prioritaire' : `Membre depuis ${new Date(client.created_at).getFullYear()}`}
                             </p>
                          </div>
                        </div>
                       
                        {!isPassage && (
                           <div className="space-y-4 mb-8">
                              <div className="flex items-center gap-4 text-black/60">
                                 <Phone size={14} className="text-black" />
                                 <p className="text-[11px] font-bold tracking-widest">{client.phone || '-- -- -- --'}</p>
                              </div>
                           </div>
                        )}
                        {isPassage && (
                           <div className="space-y-4 mb-8 h-8">
                           </div>
                        )}

                        <div className={`mt-auto pt-8 border-t flex justify-between items-end ${isPassage ? 'border-white/10' : 'border-steel'}`}>
                           <div className="flex gap-8">
                             <div className="space-y-1">
                                <p className="text-[18px] font-serif italic leading-none">{totalPassages}</p>
                                <p className="text-[9px] text-luxury leading-none">PASSAGES</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[18px] font-serif italic leading-none">{formattedValue}</p>
                                <p className="text-[9px] text-luxury leading-none">VALEUR</p>
                             </div>
                           </div>
                           <button 
                              onClick={() => openHistory(client)}
                              className={`p-3 transition-all ${isPassage ? 'bg-white/5 hover:bg-white hover:text-black text-white' : 'bg-background-soft hover:bg-black hover:text-white'}`}
                              title="Historique des passages"
                           >
                              <History size={16} />
                           </button>
                        </div>
                    </div>
                 );
              })
           )}
        </div>

        </div>
    
        <ClientFormModal 
          isOpen={showAdd} 
          onClose={() => setShowAdd(false)} 
        />

        <ClientFormModal 
          isOpen={!!editingClient} 
          onClose={() => setEditingClient(null)} 
          editingClient={editingClient}
        />

        {showHistory && selectedClientForHistory && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm p-4 sm:p-6 animate-fade-up">
              <div className="w-full max-w-4xl bg-white border border-black shadow-2xl relative max-h-[90vh] flex flex-col scale-in">
                 <button 
                    onClick={() => { setShowHistory(false); setSelectedClientForHistory(null); }}
                    className="absolute top-8 right-8 p-2 hover:rotate-90 transition-transform text-black z-20"
                  >
                    <Plus size={24} className="rotate-45" />
                 </button>

                 <div className="p-8 sm:p-12 border-b border-steel/10">
                    <p className="text-luxury mb-2 uppercase tracking-[0.2em] text-[10px]">Parcours Client</p>
                    <h2 className="text-4xl text-editorial-title text-black">{selectedClientForHistory.name}</h2>
                    <p className="text-[10px] font-bold italic text-black/40 mt-1">Historique des prestations Elite</p>
                 </div>

                 <div className="flex-1 overflow-y-auto p-8 sm:p-12 custom-scrollbar">
                    {archives.filter(a => 
                       a.client_id === selectedClientForHistory.id || 
                       a.client_id === selectedClientForHistory.name
                    ).length === 0 ? (
                       <div className="h-64 flex flex-col items-center justify-center text-center opacity-20">
                          <History size={48} strokeWidth={1} className="mb-4" />
                          <p className="text-[10px] uppercase font-bold tracking-widest">Aucun passage enregistré</p>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          {archives
                             .filter(a => 
                                a.client_id === selectedClientForHistory.id || 
                                a.client_id === selectedClientForHistory.name
                             )
                             .sort((a, b) => new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime())
                             .map((item) => {
                                const serviceInfo = services.find(s => s.name === item.service_name);
                                const serviceImage = serviceInfo?.image;

                                return (
                                   <div key={item.id} className="flex flex-col sm:flex-row justify-between items-center p-6 bg-background-soft/30 border border-steel/10 hover:border-black/20 transition-all group gap-6">
                                      <div className="flex items-center gap-6 w-full">
                                         <div className="w-14 h-14 bg-white border border-steel/20 overflow-hidden shrink-0 relative">
                                            {serviceImage ? (
                                               <img src={serviceImage} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                               <div className="w-full h-full flex items-center justify-center opacity-20"><Scissors size={20} /></div>
                                            )}
                                         </div>
                                         <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold text-luxury uppercase tracking-widest">
                                               {new Date(item.archived_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-lg font-serif italic text-black">{item.service_name}</p>
                                            <p className="text-[10px] text-black/40 font-bold uppercase tracking-tight flex items-center gap-2">
                                               <UserIcon size={10} className="text-luxury" /> Réalisé par : {item.barber_name}
                                            </p>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
                                         <div className="text-right mr-4">
                                            <p className="text-xl font-bold text-black">{(item.price || 0).toLocaleString()} F</p>
                                            <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest text-right">Payé</p>
                                         </div>
                                         <button 
                                           onClick={() => openTicket(item)}
                                           className="p-3 border border-steel hover:bg-black hover:text-white transition-all shadow-sm"
                                           title="Voir le ticket"
                                         >
                                           <FileText size={16} />
                                         </button>
                                      </div>
                                   </div>
                                );
                             })}
                       </div>
                    )}
                 </div>

                 <div className="p-8 bg-black text-white flex justify-between items-center">
                    <div className="flex gap-10">
                       <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Total Passages</p>
                          <p className="text-2xl font-serif italic">{
                             archives.filter(a => a.client_id === selectedClientForHistory.id || a.client_id === selectedClientForHistory.name).length
                          }</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Valeur Cumulée</p>
                          <p className="text-2xl font-serif italic">{
                             archives
                                .filter(a => a.client_id === selectedClientForHistory.id || a.client_id === selectedClientForHistory.name)
                                .reduce((sum, item) => sum + (item.price || 0), 0)
                                .toLocaleString()
                          } F</p>
                       </div>
                    </div>
                    <button 
                       onClick={() => { setShowHistory(false); setSelectedClientForHistory(null); }}
                       className="px-8 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-luxury transition-all"
                    >
                       FERMER
                    </button>
                 </div>
              </div>
           </div>
        )}

        <ShareCenterModal 
           isOpen={showTicket}
           onClose={() => setShowTicket(false)}
           item={selectedTicket}
        />
     </>
    );
 };
