import React, { useState } from 'react';
import { Trash2, History, ScrollText, User, Clock, ChevronDown, ChevronUp, Shield, Database, Activity, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AuditLog } from '@/lib/auditService';

interface AuditSectionProps {
  logs: AuditLog[];
  isLoading: boolean;
  onClear: () => void;
}

export const AuditSection: React.FC<AuditSectionProps> = ({ logs, isLoading, onClear }) => {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const getActionTheme = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('SUPPR') || act.includes('DELETE') || act.includes('PURGE')) 
      return { label: 'Danger', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', iconColor: 'bg-red-500' };
    if (act.includes('AJOUT') || act.includes('CREAT')) 
      return { label: 'Succès', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'bg-emerald-500' };
    if (act.includes('MODIF') || act.includes('EDIT') || act.includes('UPDATE')) 
      return { label: 'Modif', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'bg-blue-500' };
    if (act.includes('VENTE') || act.includes('PAY') || act.includes('CAISSE')) 
      return { label: 'Finance', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'bg-amber-500' };
    return { label: 'Info', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', iconColor: 'bg-slate-500' };
  };

  const parseLogDetails = (details: string | null) => {
    if (!details) return { message: 'Action enregistrée', diff: null, raw: null };
    try {
      const trimmed = details.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        // Handle case-insensitive keys (MESSAGE vs message)
        const message = parsed.message || parsed.MESSAGE || 'Action détaillée';
        const diff = parsed.diff || parsed.DIFF || null;
        return { message, diff, raw: parsed };
      }
      return { message: details, diff: null, raw: details };
    } catch (e) {
      return { message: details, diff: null, raw: details };
    }
  };

  const getTimeInfo = (dateStr: string) => {
    if (!dateStr) return { relative: '', full: 'Date inconnue' };
    try {
      const isoStr = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const date = new Date(isoStr + (isoStr.includes('Z') || isoStr.includes('+') ? '' : 'Z'));
      if (!isValid(date)) return { relative: '', full: 'Format invalide' };
      return {
        relative: formatDistanceToNow(date, { addSuffix: true, locale: fr }),
        full: format(date, 'd MMMM yyyy • HH:mm:ss', { locale: fr })
      };
    } catch {
      return { relative: '', full: 'Erreur de date' };
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/5 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-black text-white rounded-lg">
                <Shield size={20} />
             </div>
             <div>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-luxury/60">Console d'Observation</p>
                <h3 className="text-3xl font-editorial-title text-black">Journal d'Activité</h3>
             </div>
          </div>
          <p className="text-sm font-serif italic text-black/40">Traçabilité complète des opérations système et humaines.</p>
        </div>
        
        <button 
          onClick={onClear}
          className="group flex items-center gap-3 px-6 py-3 bg-white border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-red-200"
        >
          <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Réinitialiser les logs</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <Activity className="animate-spin text-luxury" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest text-black/20 italic">Synchronisation sécurisée...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-32 flex flex-col items-center gap-6 bg-white border border-dashed border-black/10 rounded-xl">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                <History size={32} />
             </div>
             <div className="text-center space-y-1">
                <p className="font-editorial-title text-2xl text-black/60">Historique Vierge</p>
                <p className="text-[10px] items-center font-bold tracking-widest uppercase text-black/20">Aucune activité suspecte ou opérationnelle enregistrée</p>
             </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Legend / Table Header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-[9px] font-bold uppercase tracking-widest text-black/30 border-b border-black/5">
               <div className="col-span-1">Action</div>
               <div className="col-span-3">Acteur System</div>
               <div className="col-span-6">Description des faits</div>
               <div className="col-span-2 text-right">Horodatage</div>
            </div>

            {logs.map((log) => {
              const { message, diff, raw } = parseLogDetails(log.details);
              const theme = getActionTheme(log.action);
              const time = getTimeInfo(log.created_at);
              const isExpanded = expandedLog === log.id;

              return (
                <div 
                  key={log.id} 
                  className={`group bg-white border border-slate-100 hover:border-black/20 transition-all duration-500 ${isExpanded ? 'ring-1 ring-black/5 shadow-2xl scale-[1.01] z-20 sticky top-4 bottom-4' : 'hover:shadow-md'}`}
                >
                  <div 
                    className="p-5 lg:p-6 cursor-pointer grid grid-cols-1 lg:grid-cols-12 items-center gap-6"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    {/* Colonne Action */}
                    <div className="lg:col-span-1 flex items-center justify-center">
                       <div className={`w-10 h-10 flex items-center justify-center text-white rounded-xl ${theme.iconColor} shadow-lg shadow-current/10`}>
                          <ScrollText size={18} />
                       </div>
                    </div>

                    {/* Colonne Acteur */}
                    <div className="lg:col-span-3 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-white">
                          <User size={14} />
                       </div>
                       <div className="space-y-0.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-black">{log.user_name}</p>
                          <div className="flex items-center gap-1.5">
                             <span className={`text-[8px] px-1.5 py-0.5 font-bold uppercase ${log.user_role === 'admin' ? 'bg-red-500 text-white' : 'bg-black/5 text-black/60'}`}>
                                {log.user_role || 'Staff'}
                             </span>
                             <span className="text-[9px] font-mono text-black/20">#{log.user_id.slice(-4)}</span>
                          </div>
                       </div>
                    </div>

                    {/* Colonne Message */}
                    <div className="lg:col-span-6">
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${theme.border} ${theme.bg} ${theme.color}`}>
                             {log.action.replace(/_/g, ' ')}
                          </span>
                       </div>
                       <p className="text-base font-serif italic text-black/80 line-clamp-1 group-hover:line-clamp-none transition-all">
                          {message}
                       </p>
                    </div>

                    {/* Colonne Temps */}
                    <div className="lg:col-span-2 flex items-center lg:items-end justify-between lg:justify-center gap-4">
                       <div className="flex flex-col items-end gap-1">
                          <p className="text-[10px] font-bold text-black uppercase tracking-widest">{time.relative}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-black/20 font-medium">
                             <Clock size={10} />
                             <span>{time.full}</span>
                          </div>
                       </div>
                       <div className="text-black/10">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                       </div>
                    </div>
                  </div>

                  {/* Expansion Area */}
                  {isExpanded && (
                    <div className="border-t border-slate-50 bg-slate-50/50 p-8 lg:p-10 animate-in fade-in slide-in-from-top-4 duration-500">
                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                          {/* Metadata Section */}
                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <span className="h-px flex-1 bg-black/5"></span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/20">Identité & Contexte</span>
                                <span className="h-px flex-1 bg-black/5"></span>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white border border-black/5 space-y-2">
                                   <p className="text-[8px] font-bold uppercase tracking-widest text-luxury/60">Identifiant Log</p>
                                   <p className="text-xs font-mono font-bold">{log.id}</p>
                                </div>
                                <div className="p-4 bg-white border border-black/5 space-y-2">
                                   <p className="text-[8px] font-bold uppercase tracking-widest text-luxury/60">Entité Cible</p>
                                   <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold uppercase">{log.entity_type || 'N/A'}</span>
                                      <span className="text-[10px] font-mono text-black/30">({log.entity_id || 'Global'})</span>
                                   </div>
                                </div>
                             </div>

                             <div className="p-6 bg-white border border-black/5 space-y-4">
                                <p className="text-[8px] font-bold uppercase tracking-widest text-luxury/60">Données Brutes (Payload)</p>
                                <pre className="text-[10px] font-mono text-slate-500 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[300px]">
                                   {JSON.stringify(raw || log.details, null, 2)}
                                </pre>
                             </div>
                          </div>

                          {/* Action Details & Diffs */}
                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <span className="h-px flex-1 bg-black/5"></span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-luxury">Analyse des Changements</span>
                                <span className="h-px flex-1 bg-black/5"></span>
                             </div>

                             <div className="p-6 bg-white border border-black/5 min-h-[100px] flex flex-col justify-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-black/20 mb-3">Interprétation Humanisée</p>
                                <p className="text-xl font-serif italic text-black/90 leading-relaxed">
                                   "{message}"
                                </p>
                             </div>

                             {diff && (
                                <div className="space-y-3">
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-luxury flex items-center gap-2">
                                      <Database size={12} /> Mutations Détectées
                                   </p>
                                   <div className="bg-slate-900 rounded-xl p-6 space-y-3 shadow-xl">
                                      {diff.toString().split(', ').map((d: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3 text-[11px]">
                                           <span className="mt-1 w-1.5 h-1.5 rounded-full bg-luxury shrink-0"></span>
                                           <span className="font-mono text-slate-300 break-all">{d}</span>
                                        </div>
                                      ))}
                                   </div>
                                </div>
                             )}

                             <div className="pt-6">
                                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black hover:text-luxury transition-colors">
                                   <ExternalLink size={12} />
                                   Voir l'archive complète
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-10 flex border-t border-black/5 justify-between items-center text-[9px] font-bold uppercase tracking-[0.2em] text-black/20">
         <p>© Système de Traçabilité YUMI Elite</p>
         <div className="flex gap-6">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Serveur Actif</span>
            <span>Rétention : 30 Jours</span>
         </div>
      </div>
    </div>
  );
};
