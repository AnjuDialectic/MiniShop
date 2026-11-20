import { create } from 'zustand';

interface UiState {
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  catalogRefreshKey: number;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  triggerCatalogRefresh: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isCartOpen: false,
  isCheckoutOpen: false,
  catalogRefreshKey: 0,

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  openCheckout: () => set({ isCartOpen: false, isCheckoutOpen: true }),
  closeCheckout: () => set({ isCheckoutOpen: false }),
  triggerCatalogRefresh: () =>
    set((state) => ({ catalogRefreshKey: state.catalogRefreshKey + 1 })),
}));
