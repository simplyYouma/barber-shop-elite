import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { QueueItem, ArchiveItem } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ExportableItem = QueueItem | ArchiveItem;

// Formateur de nombre sécurisé pour PDF (évite les espaces insécables UTF-8 qui cassent jsPDF)
const formatPrice = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const PERIOD_LABELS: Record<string, string> = {
  'today': 'AUJOURD\'HUI',
  'month': 'CE MOIS',
  'semester': 'CE SEMESTRE',
  'year': 'CETTE ANNÉE',
  'custom': 'PÉRIODE PERSONNALISÉE'
};

export const ExportService = {
  /**
   * Exportation vers Excel (XLSX) avec Calculs Analytiques
   */
  exportToExcel: (data: ExportableItem[], filename: string) => {
    const rawData = data.map(item => ({
      'Date': item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy HH:mm') : '-',
      'Client': item.client_name || 'Client de Passage',
      'Prestations': item.service_name || 'Service Standard',
      'Prix (FCFA)': item.price || 0,
      'Statut': item.status === 'completed' ? 'Terminé' : item.status === 'cancelled' ? 'Annulé' : 'Autre',
    }));

    const totalRevenue = data.reduce((acc, curr) => acc + (curr.status === 'completed' ? (curr.price || 0) : 0), 0);
    const completedCount = data.filter(i => i.status === 'completed').length;
    const cancelledCount = data.filter(i => i.status === 'cancelled').length;
    const avgBasket = completedCount > 0 ? totalRevenue / completedCount : 0;

    const summaryData = [
      {}, 
      { 'Date': '--- SYNTHÈSE ANALYTIQUE ---' },
      { 'Date': 'Date du Rapport', 'Client': format(new Date(), 'dd/MM/yyyy') },
      { 'Date': 'RECETTE TOTALE (FCFA)', 'Client': totalRevenue },
      { 'Date': 'NOMBRE DE CLIENTS', 'Client': completedCount },
      { 'Date': 'NOMBRE D\'ANNULATIONS', 'Client': cancelledCount },
      { 'Date': 'PANIER MOYEN (FCFA)', 'Client': Math.round(avgBasket) },
    ];

    const finalData = [...rawData, ...summaryData];
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique_Analytique');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  },

  /**
   * Exportation vers PDF - Correction d'encodage et Traduction
   */
  exportToPDF: (data: ExportableItem[], periodId: string, filename: string) => {
    const doc = new jsPDF();
    const translatedPeriod = PERIOD_LABELS[periodId] || periodId.toUpperCase();
    
    // Header Editorial Premium
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BARBER SHOP - RAPPORT D\'ACTIVITÉ', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}`, 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PÉRIODE : ${translatedPeriod}`, 14, 45);

    // Tableau des données - Lisibilité accrue
    const tableBody = data.map(item => [
      item.created_at ? format(new Date(item.created_at), 'dd/MM/yy HH:mm') : '-',
      item.client_name || 'Client de Passage',
      item.service_name || '-',
      `${formatPrice(item.price || 0)} FCFA`,
      item.status === 'completed' ? 'TRAITÉ' : 'ANNULÉ'
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['DATE', 'CLIENT', 'SERVICES', 'MONTANT', 'STATUT']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      columnStyles: {
        0: { cellWidth: 30 },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' }
      }
    });

    // Totaux Analytiques en bas de page
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const totalRevenue = data.reduce((acc, curr) => acc + (curr.status === 'completed' ? (curr.price || 0) : 0), 0);
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.line(14, finalY - 5, 196, finalY - 5);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECETTE TOTALE : ${formatPrice(totalRevenue)} FCFA`, 14, finalY);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const statsPadding = 8;
    doc.text(`Total prestations : ${data.filter(i => i.status === 'completed').length}`, 14, finalY + statsPadding);
    doc.text(`Total annulations : ${data.filter(i => i.status === 'cancelled').length}`, 14, finalY + statsPadding + 6);

    // Sauvegarde
    doc.save(`${filename}.pdf`);
  }
};
