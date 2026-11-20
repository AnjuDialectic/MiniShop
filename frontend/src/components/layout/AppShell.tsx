import type { ReactNode } from 'react';
import { CartDrawer } from '../../features/cart/CartDrawer';
import { CheckoutModal } from '../../features/checkout/CheckoutModal';
import { ToastContainer } from '../ui/Toast';
import { Navbar } from './Navbar';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-[10px] focus:bg-ink focus:px-4 focus:text-sm focus:font-semibold focus:text-surface"
      >
        Langsung ke konten utama
      </a>

      <Navbar />

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {children}
      </main>

      <footer className="mt-10 border-t border-hairline bg-surface/70 py-6 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-ink-secondary sm:flex-row sm:px-6 lg:px-8">
          <p className="font-medium text-ink">MiniShop — Curated Product Catalog</p>
          <p>Stok diverifikasi real-time · Transaksi atomik tanpa payment gateway</p>
        </div>
      </footer>

      <CartDrawer />
      <CheckoutModal />
      <ToastContainer />
    </div>
  );
}
