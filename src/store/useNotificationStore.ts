import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface Alert {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirm?: boolean;
}

interface NotificationState {
  toasts: Toast[];
  alert: Alert | null;
  showToast: (message: string, type?: NotificationType, duration?: number) => void;
  hideToast: (id: string) => void;
  showAlert: (options: Alert) => void;
  hideAlert: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  alert: null,

  showToast: (message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration !== Infinity) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  hideToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showAlert: (options) => set({ alert: options }),
  
  hideAlert: () => set({ alert: null }),
}));
