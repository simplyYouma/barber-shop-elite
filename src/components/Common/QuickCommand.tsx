import React, { useState, useRef, useEffect } from 'react';
import { useClientStore } from '@/store/useClientStore';
import { Search, UserPlus, X, ChevronRight, Plus } from 'lucide-react';

interface QuickCommandProps {
  onSelectClient: (client: { id: string, name: string } | null) => void;
  onOpenNewClient: () => void;
}

export const QuickCommand: React.FC<QuickCommandProps> = ({ onSelectClient, onOpenNewClient }) => {
   const [isOpen, setIsOpen] = useState(false);
   const [search, setSearch] = useState('');
   const { searchClients } = useClientStore();
   const inputRef = useRef<HTMLInputElement>(null);
   const containerRef = useRef<HTMLDivElement>(null);

   const filteredClients = searchClients(search).slice(0, 5);

   useEffect(() => {
      if (isOpen && inputRef.current) {
         inputRef.current.focus();
      }
   }, [isOpen]);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const handleSelect = (client: any) => {
      onSelectClient(client);
      setIsOpen(false);
      setSearch('');
   };

   const handlePassage = () => {
      onSelectClient({ id: 'passage', name: 'Client de Passage' });
      setIsOpen(false);
      setSearch('');
   };

   return (
      <div className="relative" ref={containerRef}>
         <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-3 px-6 py-3 transition-all duration-300 ${isOpen ? 'bg-black text-white' : 'bg-background-soft border border-black/5 hover:border-black text-black'}`}
         >
            <Plus size={14} className={isOpen ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Enregistrer</span>
         </button>

         {isOpen && (
            <div className="absolute top-full right-0 mt-4 w-80 bg-white border border-black shadow-2xl z-50 animate-fade-up overflow-hidden">
               <div className="p-6 border-b border-steel">
                  <div className="relative">
                     <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-black/40" />
                     <input 
                        ref={inputRef}
                        type="text"
                        placeholder="RECHERCHER UN CLIENT..."
                        className="w-full bg-transparent pl-6 py-2 text-[10px] font-bold uppercase tracking-widest outline-none border-b border-black/10 focus:border-black transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     />
                  </div>
               </div>

               <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {search.length > 0 ? (
                     <div className="p-2">
                        {filteredClients.map(client => (
                           <button 
                              key={client.id}
                              onClick={() => handleSelect(client)}
                              className="w-full flex items-center justify-between p-4 hover:bg-black group transition-all border-b border-black/5 last:border-0"
                           >
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 flex items-center justify-center bg-background-soft border border-black/5 overflow-hidden group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                                    {client.avatar ? (
                                       <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" />
                                    ) : (
                                       <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-5 h-5 object-contain grayscale opacity-20 group-hover:opacity-100 group-hover:invert transition-all" />
                                    )}
                                 </div>
                                 <div className="text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest group-hover:text-white transition-colors">{client.name}</p>
                                    <p className="text-[8px] opacity-40 italic group-hover:text-white/60 transition-colors">{client.phone || 'Sans numéro'}</p>
                                 </div>
                              </div>
                              <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:text-white transition-all translate-x-[-10px] group-hover:translate-x-0" />
                           </button>
                        ))}
                        {filteredClients.length === 0 && (
                           <p className="p-4 text-[9px] text-center italic opacity-40">Aucun résultat trouvé</p>
                        )}
                     </div>
                  ) : (
                     <div className="p-2 space-y-1">
                        <button 
                           onClick={handlePassage}
                           className="w-full flex items-center gap-4 p-4 hover:bg-black transition-all group border-b border-black/[0.03]"
                        >
                           <div className="w-8 h-8 flex items-center justify-center bg-background-soft border border-black/5 overflow-hidden group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                              <img src="/Coupes_BarberShop_PNG/coupe_1.png" className="w-5 h-5 object-contain grayscale opacity-20 group-hover:opacity-100 group-hover:invert transition-all" />
                           </div>
                           <div className="text-left">
                              <p className="text-[10px] font-bold uppercase tracking-widest group-hover:text-white">Client de Passage</p>
                              <p className="text-[8px] opacity-40 group-hover:opacity-60 italic group-hover:text-white/60">Encaissement immédiat</p>
                           </div>
                        </button>
                        
                        <button 
                           onClick={() => { onOpenNewClient(); setIsOpen(false); }}
                           className="w-full flex items-center gap-4 p-4 hover:bg-luxury hover:text-white transition-all group"
                        >
                           <div className="w-8 h-8 flex items-center justify-center bg-black/5 group-hover:bg-white/10 overflow-hidden border border-black/5">
                              <UserPlus size={14} className="opacity-40 group-hover:opacity-100" />
                           </div>
                           <div className="text-left">
                              <p className="text-[10px] font-bold uppercase tracking-widest">Nouveau Client</p>
                              <p className="text-[8px] opacity-40 group-hover:opacity-60 italic">Créer une fiche</p>
                           </div>
                        </button>
                     </div>
                  )}
               </div>

               <div className="bg-background-soft p-3 flex justify-end items-center text-[8px] font-bold uppercase tracking-widest text-black/40">
                  <X size={10} className="cursor-pointer hover:text-black" onClick={() => setIsOpen(false)} />
               </div>
            </div>
         )}
      </div>
   );
};
