import { create } from 'zustand';
import type { Service } from '../types';

interface CartState {
  items: Service[];
  addItem: (service: Service) => void;
  removeItem: (serviceId: string) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  addItem: (service) => set((state) => {
    const newItems = [...state.items, service];
    return {
      items: newItems,
      total: newItems.reduce((acc, item) => acc + item.price, 0)
    };
  }),
  removeItem: (serviceId) => set((state) => {
    const newItems = state.items.filter((item) => item.id !== serviceId);
    return {
      items: newItems,
      total: newItems.reduce((acc, item) => acc + item.price, 0)
    };
  }),
  clearCart: () => set({ items: [], total: 0 }),
}));
