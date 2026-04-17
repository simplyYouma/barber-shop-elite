import React from 'react';
import { Trash2, History, ScrollText } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AuditLog } from '@/lib/auditService';

interface AuditSectionProps {
  logs: AuditLog[];
  isLoading: boolean;
  onClear: () => void;
}

export const AuditSection: React.FC<AuditSectionProps> = ({ logs, isLoading, onClear }) => {
  return (
    <div className="space-y-10 lg:space-y-12 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-steel pb-6 text-black gap-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">Traçabilité</p>
          <h3 className="text-3xl lg:text-4xl text-editorial-title">Journal d'Audit</h3>
        </div>
        <button 
          onClick={onClear}
          className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 px-4 py-2 border border-red-500/10 hover:border-red-500/30"
        >
          <Trash2 size={14} /> VIDER LE JOURNAL
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex justify-center italic text-black/20 animate-pulse">Chargement de l'historique...</div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center space-y-4 border border-dashed border-black/10">
            <History size={48} className="mx-auto opacity-10" />
            <p className="font-serif italic text-black/40 text-lg text-editorial-title">Aucune action n'a encore été enregistrée.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map((log) => {
              let detailsParsed: any = null;
              try {
                if (log.details && typeof log.details === 'string') {
                   const trimmed = log.details.trim();
                   detailsParsed = (trimmed.startsWith('{') || trimmed.startsWith('[')) 
                     ? JSON.parse(trimmed) 
                     : log.details;
                } else {
                   detailsParsed = log.details;
                }
              } catch (e) {
                detailsParsed = log.details;
              }

              const isDiff = detailsParsed && typeof detailsParsed === 'object' && detailsParsed.diff;
              
              const formatLogDate = (dateStr: string) => {
                 if (!dateStr) return 'Maintenant';
                 try {
                    // SQLite format fallback: replace space with T if missing for better ISO parsing
                    const isoStr = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
                    const date = new Date(isoStr + (isoStr.includes('Z') || isoStr.includes('+') ? '' : 'Z'));
                    if (!isValid(date)) return 'Date inconnue';
                    return format(date, 'dd MMMM yyyy • HH:mm:ss', { locale: fr });
                 } catch (err) {
                    return 'Format invalide';
                 }
              };

              return (
                <div key={log.id} className="bg-white border border-black/5 hover:border-black/20 p-5 lg:p-6 transition-all group overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-10 h-10 shrink-0 flex items-center justify-center border ${
                        log.action?.includes('SUPPR') ? 'border-red-500 bg-red-50 text-red-500' :
                        log.action?.includes('AJOUT') ? 'border-green-500 bg-green-50 text-green-500' :
                        log.action?.includes('VENTE') ? 'border-luxury bg-luxury/5 text-luxury' :
                        'border-black bg-background-soft text-black/40'
                      }`}>
                        <ScrollText size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border border-black/10">{log.action || 'ACTION'}</span>
                          <div className="flex items-center gap-1.5">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-luxury">{log.user_name || 'Système'}</span>
                             {log.user_role === 'admin' && (
                                <span className="text-[7px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 bg-red-500 text-white rounded-sm">Admin</span>
                             )}
                          </div>
                        </div>
                        <p className="text-base lg:text-lg font-serif italic text-black/80">
                          {isDiff ? detailsParsed.message : (typeof detailsParsed === 'string' ? detailsParsed : "Action enregistrée")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">
                        {formatLogDate(log.created_at)}
                      </p>
                    </div>
                  </div>

                  {isDiff && detailsParsed.diff && (
                    <div className="mt-4 pl-14 animate-fade-down">
                      <div className="p-3 bg-background-soft border-l-2 border-black text-[10px] sm:text-[11px] font-mono leading-relaxed space-y-1 opacity-60">
                        {detailsParsed.diff.toString().split(', ').map((d: string, i: number) => (
                          <div key={i} className="flex gap-2">
                             <span className="text-luxury">●</span>
                             <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
