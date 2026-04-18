import React, { useState } from 'react';
import { X, Download, MessageSquare, Printer, Share2, ChevronRight, FileCode } from 'lucide-react';
import { EliteReceipt } from './EliteReceipt';
import { TicketService } from '@/lib/TicketService';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { ArchiveItem } from '@/types';

interface ShareCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ArchiveItem | null;
}

export const ShareCenterModal: React.FC<ShareCenterModalProps> = ({ 
  isOpen, 
  onClose, 
  item 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useNotificationStore();

  if (!isOpen || !item) return null;

  const handleDownloadPNG = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const fileName = `ticket-${(item.client_name || 'client').replace(/\s+/g, '_')}.png`;
      const success = await TicketService.downloadAsPNG('receipt-capture', fileName);
      if (success) {
        showToast('Capture PNG téléchargée', 'success');
      } else {
        showToast('Erreur lors de la capture', 'error');
      }
    } catch (error) {
       showToast('Erreur technique PNG', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      showToast('Génération du PDF...', 'info');
      const success = await TicketService.downloadPDF(item);
      if (success) {
        showToast('PDF téléchargé avec succès', 'success');
      }
    } catch (error) {
      showToast('Erreur technique PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShareImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      showToast('Préparation du partage WhatsApp...', 'info');
      const result = await TicketService.shareTicketImage('receipt-capture', item);
      if (result && result.success) {
        if (result && 'method' in result && result.method === 'native') {
           showToast('Partage natif ouvert', 'success');
        } else {
           showToast('Ouverture WhatsApp Web (Image téléchargée)', 'info');
           // Si le partage de fichier n'est pas supporté par l'OS
           // on suggère d'utiliser le fichier téléchargé
        }
      } else {
         showToast('Erreur lors du partage', 'error');
      }
    } catch (error) {
       showToast('Erreur technique de partage', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePDFPrint = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      showToast('Préparation de l\'impression...', 'info');
      const success = await TicketService.printElement('receipt-capture');
      if (!success) {
         showToast('Impossible de lancer l\'impression', 'error');
      }
    } catch (error) {
      showToast('Erreur technique d\'impression', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-10">
      <div 
        className="absolute inset-0 bg-white/60 backdrop-blur-xl pointer-events-auto"
        onClick={onClose}
      />
      
      <div className="relative bg-white border border-black shadow-[0_0_100px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh] max-w-[1100px] w-full animate-scale-in z-[1101]">
         
         {/* Zone d'aperçu du ticket */}
         <div className="bg-background-soft/30 border-r border-steel flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 md:p-16 flex items-start justify-center min-h-full">
               <div className="shadow-2xl hover:scale-[1.01] transition-transform duration-700 bg-white origin-top mt-4 mb-20">
                  <EliteReceipt item={item} id="receipt-capture" />
               </div>
            </div>
         </div>

         {/* Zone d'actions */}
         <div className="flex flex-col p-8 md:p-14 w-full md:w-[450px] bg-white overflow-y-auto border-l border-steel z-[1102]">
            <div className="flex justify-between items-start mb-12">
               <div className="space-y-1">
                  <p className="text-luxury text-[10px] font-bold uppercase tracking-widest italic">Share Center</p>
                  <h3 className="text-4xl text-editorial-title">Gestion Reçu</h3>
               </div>
               <button onClick={onClose} className="p-3 bg-black text-white hover:bg-luxury transition-all">
                  <X size={20} />
               </button>
            </div>

            <div className="space-y-4">
               {/* PNG DOWNLOAD */}
               <button 
                  onClick={handleDownloadPNG}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-between p-5 border border-black hover:bg-black hover:text-white transition-all group disabled:opacity-50 cursor-pointer"
               >
                  <div className="flex items-center gap-5">
                     <Download size={20} className="group-hover:animate-bounce" />
                     <div className="text-left">
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-none mb-1">Télécharger PNG</p>
                        <p className="text-[9px] opacity-40 uppercase font-bold tracking-tighter">Capture haute définition</p>
                     </div>
                  </div>
                  <ChevronRight size={14} />
               </button>

               {/* PDF DOWNLOAD */}
               <button 
                  onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-between p-5 border border-black hover:bg-black hover:text-white transition-all group disabled:opacity-50 cursor-pointer"
               >
                  <div className="flex items-center gap-5">
                     <FileCode size={20} />
                     <div className="text-left">
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-none mb-1">Télécharger PDF</p>
                        <p className="text-[9px] opacity-40 uppercase font-bold tracking-tighter">Format document classique</p>
                     </div>
                  </div>
                  <ChevronRight size={14} />
               </button>

               {/* WHATSAPP IMAGE SHARE - Using The Tailor's pattern */}
               <button 
                  onClick={handleWhatsAppShareImage}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-between p-5 border border-green-600 bg-green-50/50 text-green-700 hover:bg-green-600 hover:text-white transition-all group cursor-pointer"
               >
                  <div className="flex items-center gap-5">
                     <MessageSquare size={20} />
                     <div className="text-left">
                        <p className="text-[11px] font-bold uppercase tracking-widest leading-none mb-1">Envoyer l'Image (WhatsApp)</p>
                        <p className="text-[9px] opacity-60 uppercase font-bold tracking-tighter">Partager le ticket PNG natif</p>
                     </div>
                  </div>
                  <Share2 size={14} />
               </button>

               {/* PRINT BUTTON */}
               <button 
                  onClick={handlePDFPrint}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-between p-7 bg-black text-white hover:bg-white hover:text-black hover:border-black transition-all group cursor-pointer shadow-xl scale-[1.02]"
               >
                  <div className="flex items-center gap-5">
                     <Printer size={24} />
                     <div className="text-left">
                        <p className="text-[13px] font-bold uppercase tracking-widest leading-none mb-1">Imprimer Ticket</p>
                        <p className="text-[9px] opacity-60 uppercase font-bold tracking-tighter">Impression sans recharge</p>
                     </div>
                  </div>
                  <ChevronRight size={14} />
               </button>
            </div>

            <div className="mt-auto pt-16 text-center border-t border-black/5 opacity-50">
               <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Barber Shop management</p>
            </div>
         </div>
      </div>
    </div>
  );
};
