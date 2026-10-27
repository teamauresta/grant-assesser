import { create } from 'zustand';

export const TOAST_MS = 4000;
const MAX_TOASTS = 3;

export type ToastAction = { label: string; href: string };
export type Toast = { id: number; message: string; action?: ToastAction };

type ToastState = { toasts: Toast[]; show(message: string, action?: ToastAction): number; dismiss(id: number): void };

let nextId = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  show: (message, action) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, action }].slice(-MAX_TOASTS) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shows a short message at the bottom of the screen. Safe to call from event handlers anywhere. */
export const toast = (message: string, action?: ToastAction) => useToasts.getState().show(message, action);
