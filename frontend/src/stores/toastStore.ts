import { create } from 'zustand';

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

const activeTimers = new Map<string, number>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (message, variant = 'info', durationMs = 3400) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, variant }],
    }));

    const timerId = window.setTimeout(() => {
      activeTimers.delete(id);
      get().dismissToast(id);
    }, durationMs);

    activeTimers.set(id, timerId);
  },

  dismissToast: (id) => {
    const timerId = activeTimers.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      activeTimers.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
