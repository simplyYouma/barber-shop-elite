import React from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Plus } from 'lucide-react';

export const EliteAlert: React.FC = () => {
  const { alert, hideAlert } = useNotificationStore();

  if (!alert) return null;

  const handleConfirm = () => {
    if (alert.onConfirm) alert.onConfirm();
    hideAlert();
  };

  const handleCancel = () => {
    if (alert.onCancel) alert.onCancel();
    hideAlert();
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-white/90 backdrop-blur-md p-6 animate-fade-up">
      {/* Background decoration: B Monogram */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
         <span className="text-[400px] font-serif italic text-black">B</span>
      </div>

      <div className="w-full max-w-md bg-white border border-black p-8 md:p-10 shadow-2xl relative flex flex-col items-center text-center space-y-8">
        {/* Close Button if not a pure confirm */}
        {!alert.isConfirm && (
          <button 
            onClick={hideAlert} 
            className="absolute top-6 right-6 p-2 hover:rotate-90 transition-transform"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        )}

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury">Information Système</p>
          <h2 className="text-3xl md:text-4xl text-editorial-title">{alert.title}</h2>
          
          <div className="flex justify-center py-2">
              <div className="h-px bg-black/20 w-12" />
          </div>
          
          <p className="text-xs md:text-sm font-serif italic text-black/60 leading-relaxed max-w-xs mx-auto">
            {alert.message}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full pt-4">
          <button 
            onClick={handleConfirm}
            className="w-full bg-black text-white py-4 text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border border-black transition-all"
          >
            {alert.confirmLabel || 'CONTINUER'}
          </button>
          
          {alert.isConfirm && (
            <button 
              onClick={handleCancel}
              className="w-full py-4 text-[11px] font-bold uppercase tracking-widest hover:bg-background-soft transition-all"
            >
              {alert.cancelLabel || 'ANNULER'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
