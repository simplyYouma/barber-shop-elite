import React from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const { toasts, hideToast } = useNotificationStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} className="text-black" />;
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={14} className="text-amber-500" />;
      default: return <Info size={14} className="text-black/40" />;
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white border border-black p-5 shadow-2xl flex items-center gap-4 min-w-[300px] max-w-md animate-fade-up relative overflow-hidden group"
        >
          {/* Accent line for editorial feel */}
          <div className={`absolute top-0 left-0 bottom-0 w-1 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-black'
          }`} />

          <div className="shrink-0">
            {getIcon(toast.type)}
          </div>

          <div className="flex-1 space-y-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-luxury opacity-50">
              {toast.type === 'success' ? 'Confirmation' : toast.type.toUpperCase()}
            </p>
            <p className="text-xs font-serif italic text-black leading-tight">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => hideToast(toast.id)}
            className="p-1 hover:bg-background-soft transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
