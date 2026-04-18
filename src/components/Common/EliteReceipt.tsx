import React from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { ArchiveItem } from '@/types';

interface EliteReceiptProps {
  item: ArchiveItem;
  id?: string;
}

export const EliteReceipt: React.FC<EliteReceiptProps> = ({ item, id = "receipt-capture" }) => {
  const settings = useSettingsStore();

  return (
    <div 
      id={id}
      className="w-[350px] bg-white p-10 font-sans text-black flex flex-col items-center border border-black/5 shadow-2xl relative"
      style={{ minHeight: '520px' }}
    >
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className={`w-16 h-16 mb-4 flex items-center justify-center border border-black rounded-sm overflow-hidden ${settings.salon_logo_theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
          <img 
            src={settings.salon_logo || (settings.salon_logo_theme === 'dark' ? "/Coupes_BarberShop_PNG/coupe_1_WhiteTrait.png" : "/Coupes_BarberShop_PNG/coupe_1.png")} 
            className="w-10 h-10 object-contain" 
            alt="Logo" 
          />
        </div>
        <h1 className="text-2xl font-editorial-title uppercase tracking-[0.2em] mb-1 text-center line-clamp-2">{settings.salon_name}</h1>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40 italic text-center">{settings.salon_slogan}</p>
      </div>

      {/* Détails Section */}
      <div className="w-full space-y-4 mb-10 border-y border-black/10 py-8">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Client</span>
          <span className="text-sm font-serif italic text-right">{item.client_name || 'Client de Passage'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Barbier</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">{item.barber_name || `Équipe ${settings.salon_name}`}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Date</span>
          <span className="text-[10px] font-bold uppercase tracking-widest tabular-nums font-mono text-right">
            {format(parseISO(item.archived_at!), 'dd.MM.yyyy • HH:mm', { locale: fr })}
          </span>
        </div>
      </div>

      {/* Services Section */}
      <div className="w-full mb-12">
        <div className="flex justify-between mb-4 border-b border-black/5 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-luxury">Prestation</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-luxury">Montant</span>
        </div>
        <div className="flex justify-between items-baseline group gap-6">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
             <span className="text-lg font-serif italic leading-tight break-words">{item.service_name}</span>
             <span className="text-[8px] font-bold uppercase tracking-tighter opacity-20">Réf. {item.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <span className="text-base font-bold tabular-nums shrink-0 whitespace-nowrap">{(item.price || 0).toLocaleString()} <span className="text-[10px] uppercase font-bold text-luxury">{settings.currency}</span></span>
        </div>
      </div>

      {/* Total Section - Updated Layout: Net en haut, Prix en bas */}
      <div className="w-full mt-auto mb-12 relative">
        <div className="absolute -top-4 left-0 w-full h-[1px] bg-black/10 border-t border-dashed border-black/20" />
        <div className="pt-8 flex flex-col items-center gap-3">
          <span className="text-[13px] font-editorial-title uppercase tracking-[0.5em] text-black/40">Net à Payer</span>
          <div className="flex flex-col items-center">
             <span className="text-5xl font-bold tabular-nums tracking-tighter">{(item.price || 0).toLocaleString()}</span>
             <span className="text-[10px] uppercase font-bold text-luxury tracking-[0.3em] mt-1">{settings.currency}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-4 mt-6">
        <div className="text-center space-y-2">
           <p className="text-[9px] font-bold uppercase tracking-[0.4em]">Merci de votre confiance</p>
           {settings.website && <p className="text-[10px] font-serif italic opacity-30 font-bold">{settings.website}</p>}
           <p className="text-[8px] opacity-20 uppercase font-bold tracking-widest">{settings.phone} • {settings.address}</p>
        </div>
      </div>
      
      {/* Décoration Ticket */}
      <div className="absolute bottom-0 left-0 w-full h-2 bg-[radial-gradient(circle_at_center,_#000_1px,_transparent_0)_0_0/5px_5px] pointer-events-none opacity-[0.03]" />
    </div>
  );
};
