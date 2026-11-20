import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Shield, ShoppingBag } from 'lucide-react';
import {
  selectHasCartConflicts,
  selectTotalItems,
  useCartStore,
} from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../utils/format';

export function Navbar() {
  const location = useLocation();
  const totalItems = useCartStore(selectTotalItems);
  const hasConflicts = useCartStore(selectHasCartConflicts);
  const openCart = useUiStore((state) => state.openCart);

  const isStorefrontActive =
    location.pathname === '/' || location.pathname.startsWith('/products');
  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Element 1: Brand / Storefront Link */}
        <Link
          to="/"
          aria-label="MiniShop — Beranda Storefront"
          className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[10px] pr-2 transition-opacity hover:opacity-85"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-surface shadow-[var(--shadow-card)]">
            <ShoppingBag className="h-4.5 w-4.5 stroke-[1.9]" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.025em] text-ink">
            MiniShop
          </span>
        </Link>

        {/* Primary Navigation: Storefront, Admin, Cart */}
        <nav
          aria-label="Navigasi utama"
          className="flex items-center gap-1.5 sm:gap-2"
        >
          <Link
            to="/"
            aria-label="Storefront"
            aria-current={isStorefrontActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-sm font-medium transition-colors duration-200 sm:px-3',
              isStorefrontActive
                ? 'bg-subtle text-ink'
                : 'text-ink-secondary hover:bg-subtle hover:text-ink',
            )}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
            <span className="hidden sm:inline">Storefront</span>
          </Link>

          <Link
            to="/admin"
            aria-current={isAdminActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium transition-colors duration-200',
              isAdminActive
                ? 'border-ink bg-ink text-surface'
                : 'border-hairline bg-surface text-ink hover:border-border-strong hover:bg-subtle',
            )}
          >
            <Shield className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
            <span>Admin</span>
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Buka keranjang belanja, ${totalItems} item`}
            className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-hairline bg-surface px-3 text-sm font-semibold text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:border-border-strong hover:bg-subtle"
          >
            <ShoppingBag className="h-4.5 w-4.5 shrink-0 stroke-[1.75]" aria-hidden="true" />
            <span className="hidden sm:inline">Keranjang</span>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums transition-colors',
                totalItems > 0
                  ? 'bg-accent text-surface'
                  : 'bg-subtle text-ink-secondary',
              )}
            >
              {totalItems > 99 ? '99+' : totalItems}
            </span>

            {hasConflicts && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-danger"
              />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
