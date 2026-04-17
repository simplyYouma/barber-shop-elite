import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ArchiveItem } from '../types';

export const TicketService = {
  // Générer le texte pour WhatsApp
  getWhatsAppLink: (item: ArchiveItem) => {
    const dateStr = item.archived_at ? format(parseISO(item.archived_at), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'Aujourd\'hui';
    return `🧵 *BARBER SHOP - Votre Reçu*\n` +
      `---------------------------\n` +
      `💈 *Service* : ${item.service_name}\n` +
      `👤 *Barbier* : ${item.barber_name || 'L\'Équipe Barber'}\n` +
      `📅 *Date* : ${dateStr}\n` +
      `💰 *Montant* : ${item.price?.toLocaleString()} FCFA\n\n` +
      `L'excellence au naturel. ✂️`;
  },

  // Partage natif de l'image (Méthode The Tailor)
  shareTicketImage: async (elementId: string, item: ArchiveItem) => {
    const element = document.getElementById(elementId);
    if (!element) return false;

    try {
      // 1. Capture PNG
      const dataUrl = await toPng(element, { 
        quality: 1.0, 
        pixelRatio: 2,
        backgroundColor: '#FFFFFF'
      });

      // 2. Texte de partage
      const shareText = TicketService.getWhatsAppLink(item);

      // 3. Conversion en Fichier
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `Recu_BarberShop_${(item.client_name || 'client').replace(/\s+/g, '_')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 4. Partage via Navigator API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Reçu Barber Shop',
          text: shareText
        });
        return { success: true, method: 'native' };
      } else {
        // Fallback WhatsApp Web Link
        const encodedText = encodeURIComponent(shareText);
        const phone = item.phone?.trim()?.replace(/\+/g, '').replace(/\s/g, '');
        const whatsappUrl = phone 
          ? `https://wa.me/${phone}?text=${encodedText}` 
          : `https://wa.me/?text=${encodedText}`;
        
        window.open(whatsappUrl, '_blank');
        return { success: true, method: 'link' };
      }
    } catch (error) {
      console.error('Erreur partage natif:', error);
      return { success: false };
    }
  },

  // Impression via Iframe (Méthode The Tailor - Plus de recharge)
  printElement: async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return false;

    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#FFFFFF'
      });

      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (doc) {
        doc.write(`
          <html>
            <head>
              <title>Impression Ticket - Barber Shop</title>
              <style>
                @page { margin: 0; }
                body { margin: 0; display: flex; justify-content: center; align-items: flex-start; }
                img { width: 100%; max-width: 80mm; height: auto; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = () => {
                  window.print();
                  setTimeout(() => {
                    window.frameElement.remove();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur Impression:', err);
      return false;
    }
  },

  // Capturer un élément HTML en PNG et le télécharger (Déjà fonctionnel)
  downloadAsPNG: async (elementId: string, filename: string = 'ticket-barber.png') => {
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element non trouvé');

      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF'
      });
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (error) {
      console.error('Erreur lors de la génération PNG:', error);
      return false;
    }
  },

  // Téléchargement PDF
  downloadPDF: async (item: ArchiveItem) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    const element = document.getElementById('receipt-capture');
    if (!element) return false;
    
    const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2, backgroundColor: '#FFFFFF' });
    doc.addImage(dataUrl, 'PNG', 0, 0, 80, 150);
    
    const dateFile = item.archived_at ? format(parseISO(item.archived_at), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy');
    const fileName = `ticket-${(item.client_name || 'client').replace(/\s+/g, '_')}-${dateFile}.pdf`;
    doc.save(fileName);
    return true;
  }
};
