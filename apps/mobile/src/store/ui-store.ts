import { create } from 'zustand';

interface UIState {
  readonly sidebarOpen: boolean;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly toggleSidebar: () => void;
  readonly activeModal: string | null;
  readonly openModal: (key: string) => void;
  readonly closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  activeModal: null,
  openModal: (key) => set({ activeModal: key }),
  closeModal: () => set({ activeModal: null }),
}));