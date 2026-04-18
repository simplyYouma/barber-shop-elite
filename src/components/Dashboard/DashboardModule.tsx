import { useState, useMemo } from 'react';
import { 
  Users, DollarSign, Scissors, Target, Award, Filter, 
  ChevronRight, FileText, FileSpreadsheet, Clock, Search, Star, X
} from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { PrestationsChart } from './PrestationsChart';
import { ShareCenterModal } from '@/components/Common/ShareCenterModal';
import { ExportService } from '@/lib/ExportService';
import { 
  format, isWithinInterval, startOfDay, endOfDay, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  subMonths, parseISO, differenceInSeconds
} from 'date-fns';
import type { ArchiveItem } from '@/types';

type FilterPeriod = 'today' | 'month' | 'semester' | 'year' | 'custom';

export const DashboardModule = () => {
  const { archives } = useArchiveStore();
  const [activeTab, setActiveTab] = useState<'analytics' | 'history'>('analytics');
  
  // États pour le ticket (Utilise maintenant le composant partagé)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedItemForTicket, setSelectedItemForTicket] = useState<ArchiveItem | null>(null);

  // États pour le filtrage
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useNotificationStore();

  // Calcul du temps écoulé
  const getDurationSeconds = (start: string, end?: string) => {
    if (!start) return 0;
    const start_date = parseISO(start);
    const end_date = end ? parseISO(end) : new Date();
    return Math.max(0, differenceInSeconds(end_date, start_date));
  };

  // Logique de filtrage des données
  const filteredData = useMemo(() => {
    const now = new Date();
    let interval: { start: Date; end: Date };

    switch (period) {
      case 'today':
        interval = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case 'month':
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case 'semester':
        interval = { start: subMonths(now, 6), end: now };
        break;
      case 'year':
        interval = { start: startOfYear(now), end: endOfYear(now) };
        break;
      case 'custom':
        interval = { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) };
        break;
      default:
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
    }

    return archives.filter(item => {
      const date = parseISO(item.created_at);
      const matchesDate = isWithinInterval(date, interval);
      
      const searchStr = `${item.client_name || ''} ${item.service_name || ''} ${item.barber_name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      return matchesDate && matchesSearch;
    });
  }, [archives, period, startDate, endDate, searchTerm]);

  // Statistiques calculées
  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((acc, curr) => acc + (curr.status === 'completed' ? (curr.price || 0) : 0), 0);
    const completedItems = filteredData.filter(i => i.status === 'completed');
    const completedCount = completedItems.length;
    const cancelledCount = filteredData.filter(i => i.status === 'cancelled').length;
    const avgBasket = completedCount > 0 ? totalRevenue / completedCount : 0;

    const totalWaitTime = completedItems.reduce((acc, curr) => {
       if (!curr.created_at || !curr.started_at) return acc;
       return acc + Math.max(0, differenceInSeconds(parseISO(curr.started_at), parseISO(curr.created_at)));
    }, 0);
    
    const totalExecTime = completedItems.reduce((acc, curr) => {
       if (!curr.started_at || !curr.archived_at) return acc;
       return acc + Math.max(0, differenceInSeconds(parseISO(curr.archived_at), parseISO(curr.started_at)));
    }, 0);

    const avgWaitSeconds = completedCount > 0 ? Math.round(totalWaitTime / completedCount) : 0;
    const avgExecSeconds = completedCount > 0 ? Math.round(totalExecTime / completedCount) : 0;

    const formatSeconds = (totalSeconds: number) => {
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

    const employeeMap = completedItems.reduce((acc, curr) => {
      const name = curr.barber_name || 'Non assigné';
      if (!acc[name]) acc[name] = { name, revenue: 0, count: 0, execTimeSeconds: 0 };
      acc[name].revenue += (curr.price || 0);
      acc[name].count += 1;
      
      if (curr.started_at && curr.archived_at) {
         acc[name].execTimeSeconds += Math.max(0, differenceInSeconds(parseISO(curr.archived_at), parseISO(curr.started_at)));
      }
      return acc;
    }, {} as Record<string, {name: string, revenue: number, count: number, execTimeSeconds: number}>);

    const employeePerformance = Object.values(employeeMap).map(e => ({
      ...e,
      avgExecSeconds: e.count > 0 ? Math.round(e.execTimeSeconds / e.count) : 0,
      avgTime: formatSeconds(e.count > 0 ? Math.round(e.execTimeSeconds / e.count) : 0)
    }));

    const serviceMap = completedItems.reduce((acc, curr) => {
       const name = curr.service_name || 'Inconnu';
       if (!acc[name]) acc[name] = { name, count: 0, revenue: 0 };
       acc[name].count += 1;
       acc[name].revenue += (curr.price || 0);
       return acc;
    }, {} as Record<string, {name: string, count: number, revenue: number}>);
 
    const serviceStats = Object.values(serviceMap).sort((a, b) => b.count - a.count);

    const topRevenueEmployee = [...employeePerformance].filter(e => e.name !== 'Non assigné').sort((a,b) => b.revenue - a.revenue)[0];
    const topService = [...serviceStats].sort((a,b) => b.count - a.count)[0];

    return {
      revenue: totalRevenue.toLocaleString(),
      clients: completedCount,
      cancelled: cancelledCount,
      avgBasket: Math.round(avgBasket).toLocaleString(),
      avgWait: formatSeconds(avgWaitSeconds),
      avgExec: formatSeconds(avgExecSeconds),
      topRevenueEmployee,
      topService,
      employeePerformance,
      serviceStats,
      formatSeconds
    };
  }, [filteredData]);

   const handleExportExcel = () => {
     try {
       const title = `Archives_${period}_${format(new Date(), 'dd-MM-yyyy')}`;
       ExportService.exportToExcel(filteredData, title);
       showToast(`Export Excel réussi (${filteredData.length} records)`, 'success');
     } catch (e) {
       showToast('Erreur lors de l\'export Excel', 'error');
     }
   };

   const handleExportPDF = () => {
     try {
       const title = `Rapport d'Activité - ${period.toUpperCase()}`;
       const filename = `Rapport_${period}_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
       ExportService.exportToPDF(filteredData, title, filename);
       showToast('Rapport PDF généré avec succès', 'success');
     } catch (e) {
       showToast('Erreur lors de la génération du PDF', 'error');
     }
   };

  const recentActivity = filteredData
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(item => ({
       ...item,
       duration: stats.formatSeconds(getDurationSeconds(item.started_at || item.created_at, item.archived_at))
    }));

  // Actions Ticket (Simplifiées)
  const openTicketManager = (item: ArchiveItem) => {
    setSelectedItemForTicket(item);
    setShowReceiptModal(true);
  };

  return (
    <>
      <div className="flex flex-col gap-8 animate-fade-up">
        {/* Navigation Interne */}
        <div className="flex justify-between items-end border-b border-steel pb-0">
          <div className="flex gap-10">
            <button 
                onClick={() => setActiveTab('analytics')}
                className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'analytics' ? 'text-black' : 'text-luxury hover:text-black opacity-40'}`}
            >
                Analyses & KPIs
                {activeTab === 'analytics' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black animate-slide-right" />}
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'history' ? 'text-black' : 'text-luxury hover:text-black opacity-40'}`}
            >
                Historique & Archives
                {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black animate-slide-right" />}
            </button>
          </div>
          
          {activeTab === 'history' && (
            <div className="flex gap-2 pb-2 animate-fade-in">
                <button 
                  onClick={handleExportExcel} 
                  title="Exporter vers Excel"
                  className="flex items-center gap-2 px-6 py-2 bg-[#217346] text-white border border-[#217346] hover:bg-white hover:text-[#217346] transition-all text-[9px] font-bold uppercase tracking-widest shadow-sm"
                >
                  <FileSpreadsheet size={14} /> EXCEL
                </button>
                <button 
                  onClick={handleExportPDF} 
                  title="Générer un rapport PDF"
                  className="flex items-center gap-2 px-6 py-2 bg-[#e67e22] text-white border border-[#e67e22] hover:bg-white hover:text-[#e67e22] transition-all text-[9px] font-bold uppercase tracking-widest shadow-sm"
                >
                  <FileText size={14} /> PDF
                </button>
            </div>
          )}
        </div>

        {/* Filtres Globaux */}
        <div className="flex flex-wrap items-center justify-between gap-6 bg-white border border-black p-6 shadow-sm">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-background-soft border border-black/10">
                <Filter size={16} />
              </div>
              <div className="flex gap-0 border border-black overflow-hidden rounded-sm">
                {[
                    { id: 'today', label: 'AUJOURD\'HUI' },
                    { id: 'month', label: 'CE MOIS' },
                    { id: 'semester', label: '6 MOIS' },
                    { id: 'year', label: 'CETTE ANNÉE' },
                    { id: 'custom', label: 'CALENDRIER' },
                ].map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => setPeriod(p.id as FilterPeriod)}
                      className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all ${period === p.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-background-soft border-l border-black first:border-l-0'}`}
                    >
                      {p.label}
                    </button>
                ))}
              </div>
          </div>

          {period === 'custom' && (
              <div className="flex items-center gap-3 animate-fade-up">
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold text-luxury uppercase mb-1">Début</span>
                  <input 
                      type="date" 
                      lang="fr-FR"
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background-soft border border-black p-2 text-[10px] font-bold outline-none" 
                  />
                </div>
                <ChevronRight size={14} className="opacity-20 mt-4" />
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold text-luxury uppercase mb-1">Fin</span>
                  <input 
                      type="date"
                      lang="fr-FR"
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-background-soft border border-black p-2 text-[10px] font-bold outline-none" 
                  />
                </div>
              </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 lg:max-w-xs relative hidden sm:block animate-fade-in">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background-soft border border-black/10 text-[10px] font-bold uppercase outline-none focus:border-black transition-all" 
                  placeholder="Rechercher (Client, Prestation, Barbier)..." 
                />
            </div>
          )}
        </div>

        {activeTab === 'analytics' && (
          <div className="space-y-12">

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="p-8 bg-white border border-black flex flex-col justify-between group shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-2 bg-black text-white"><DollarSign size={20} /></div>
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 uppercase">Recette</span>
                    </div>
                    <div>
                      <p className="text-luxury text-[9px] mb-1">RÉSULTAT PÉRIODE</p>
                      <h3 className="text-2xl text-editorial-title whitespace-nowrap">{stats.revenue} <span className="text-[10px] uppercase">fcfa</span></h3>
                    </div>
                </div>

                <div className="p-8 bg-white border border-black flex flex-col justify-between group shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-2 bg-black text-white"><Users size={20} /></div>
                      <span className="text-[9px] font-bold text-luxury bg-background-soft px-2 py-0.5 uppercase">Flux</span>
                    </div>
                    <div>
                      <p className="text-luxury text-[9px] mb-1">CLIENTS HONORÉS</p>
                      <h3 className="text-3xl text-editorial-title">{stats.clients}</h3>
                    </div>
                </div>

                <div className="p-8 bg-white border border-black flex flex-col justify-between group shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-2 bg-red-600 text-white"><X size={20} /></div>
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 uppercase">Perte</span>
                    </div>
                    <div>
                      <p className="text-luxury text-[9px] mb-1">ANNULATIONS</p>
                      <h3 className="text-3xl text-editorial-title">{stats.cancelled}</h3>
                    </div>
                </div>

                <div className="p-8 bg-white border border-black flex flex-col justify-between group shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-2 bg-black text-white"><Target size={20} /></div>
                      <span className="text-[9px] font-bold text-luxury bg-background-soft px-2 py-0.5 uppercase">Efficience</span>
                    </div>
                    <div>
                      <p className="text-luxury text-[9px] mb-1">PANIER MOYEN</p>
                      <h3 className="text-2xl text-editorial-title">{stats.avgBasket} <span className="text-[10px] uppercase">fcfa</span></h3>
                    </div>
                </div>

                <div className="p-8 bg-white border border-black flex flex-col justify-between group shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-black text-white"><Clock size={20} /></div>
                      <span className="text-[9px] font-bold text-luxury bg-background-soft px-2 py-0.5 uppercase">Chrono</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-black/10 pt-4 mt-auto">
                      <div>
                          <p className="text-luxury text-[9px] mb-1 uppercase">Attente</p>
                          <h3 className="text-xl text-editorial-title">{stats.avgWait}</h3>
                      </div>
                      <div>
                          <p className="text-luxury text-[9px] mb-1 uppercase">Travail</p>
                          <h3 className="text-xl text-editorial-title">{stats.avgExec}</h3>
                      </div>
                    </div>
                </div>
              </div>

              {/* Palmarès Équipe & Prestations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stats.topRevenueEmployee && (
                    <div className="bg-black text-white border border-black p-8 relative overflow-hidden group shadow-xl">
                      <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
                          <Award size={100} strokeWidth={1} />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-luxury mb-6">🏆 MEILLEUR REVENU</p>
                      <h3 className="text-4xl text-editorial-title mb-2">{stats.topRevenueEmployee.name}</h3>
                      <p className="text-sm font-serif italic text-white/50 mb-8">{stats.topRevenueEmployee.count} clients traités</p>
                      
                      <div className="flex justify-between items-end border-t border-white/20 pt-6">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1">Chiffre Généré</p>
                            <p className="text-3xl font-bold">{stats.topRevenueEmployee.revenue.toLocaleString()} <span className="text-[10px] uppercase font-bold text-luxury">CFA</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1">Rythme Moyen</p>
                            <p className="text-lg italic font-serif text-luxury">{stats.topRevenueEmployee.avgTime}</p>
                          </div>
                      </div>
                    </div>
                )}

                {stats.topService && (
                    <div className="bg-white text-black border border-black p-8 relative overflow-hidden group shadow-xl">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                          <Star size={100} strokeWidth={1} className="text-luxury" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-luxury mb-6">✨ PRESTATION FAVORITE</p>
                      <h3 className="text-4xl text-editorial-title mb-2">{stats.topService.name}</h3>
                      <p className="text-sm font-serif italic text-black/50 mb-8">Le choix privilégié de votre clientèle</p>
                      
                      <div className="flex justify-between items-end border-t border-black/10 pt-6">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest opacity-40 mb-1">Volume de ventes</p>
                            <p className="text-3xl font-bold text-luxury">{stats.topService.count} <span className="text-[10px] uppercase font-bold text-black/40">fois</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest opacity-40 mb-1">Revenu généré</p>
                            <p className="text-lg italic font-serif text-black">{stats.topService.revenue.toLocaleString()} FCFA</p>
                          </div>
                      </div>
                    </div>
                )}
              </div>

              {/* PERFORMANCE DES PRESTATIONS */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-black pb-4">
                    <div className="p-2 bg-black text-white"><Scissors size={14} /></div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-black">Analyse Évolutive des Prestations</h3>
                </div>
                
                <PrestationsChart 
                    data={filteredData.filter(i => i.status === 'completed')} 
                    period={period}
                    startDate={startDate}
                    endDate={endDate}
                />
              </div>

              {/* Activité Récente */}
              <div className="bg-white border border-black overflow-hidden shadow-sm">
                <div className="p-8 border-b border-black flex justify-between items-center bg-background-soft">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-black">Activité Récente</h3>
                </div>
                <div className="divide-y divide-steel">
                    {recentActivity.map((activity, idx) => (
                      <div key={idx} className="p-6 md:p-8 hover:bg-background-soft transition-all flex items-center justify-between gap-4 group">
                          <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-editorial-title text-base">{activity.client_name || 'Client de Passage'}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">{activity.service_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[9px] uppercase tracking-widest opacity-40">Montant</p>
                                <p className="text-sm font-bold">{(activity.price || 0).toLocaleString()} F</p>
                            </div>
                            <button onClick={() => openTicketManager(activity)} className="p-2 border border-steel group-hover:border-black transition-all">
                                <FileText size={14} className="group-hover:text-luxury" />
                            </button>
                          </div>
                      </div>
                    ))}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white border border-black flex flex-col shadow-sm">
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-black text-white z-20">
                      <tr>
                          <th className="px-8 py-5 text-[9px] font-bold uppercase tracking-widest italic">Date & Heures</th>
                          <th className="px-8 py-5 text-[9px] font-bold uppercase tracking-widest italic">Client</th>
                          <th className="px-8 py-5 text-[9px] font-bold uppercase tracking-widest italic text-center">Ticket</th>
                          <th className="px-8 py-5 text-[9px] font-bold uppercase tracking-widest italic">Barbier</th>
                          <th className="px-8 py-5 text-[9px] font-bold uppercase tracking-widest italic text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel">
                      {filteredData.length > 0 ? filteredData.map((item) => (
                          <tr key={item.id} className="hover:bg-background-soft transition-all group">
                            <td className="px-8 py-4 text-[10px] font-bold italic opacity-40 tabular-nums">
                                {format(parseISO(item.created_at), 'dd/MM/yyyy')}
                                <span className="block text-[8px] mt-1 not-italic uppercase tracking-tighter whitespace-nowrap">
                                   <span className="text-black font-black">{item.started_at ? format(parseISO(item.started_at), 'HH:mm') : '--:--'}</span>
                                   <span className="mx-2 opacity-30">→</span>
                                   <span className="text-luxury font-black">{item.archived_at ? format(parseISO(item.archived_at), 'HH:mm') : '--:--'}</span>
                                </span>
                            </td>
                            <td className="px-8 py-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest">{item.client_name || 'PASSAGE'}</p>
                                <p className="text-[10px] font-serif italic text-luxury">{item.service_name}</p>
                            </td>
                            <td className="px-8 py-4">
                                <div className="flex justify-center">
                                  <button 
                                      onClick={() => openTicketManager(item)} 
                                      className="p-3 border border-steel hover:bg-black hover:text-white transition-all group/btn shadow-sm"
                                  >
                                      <FileText size={16} />
                                  </button>
                                </div>
                            </td>
                            <td className="px-8 py-4 text-[10px] font-bold uppercase opacity-60 italic">{item.barber_name || 'L\'Équipe'}</td>
                            <td className="px-8 py-4 text-[12px] font-bold text-right tabular-nums">{item.price?.toLocaleString()} F</td>
                          </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-20 italic">Aucune donnée archivée sur cette période</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                </table>
              </div>
          </div>
        )}
      </div>

      {/* MODAL GESTIONNAIRE DE TICKET PARTAGÉ */}
      <ShareCenterModal 
         isOpen={showReceiptModal} 
         onClose={() => setShowReceiptModal(false)} 
         item={selectedItemForTicket} 
      />
    </>
  );
};
