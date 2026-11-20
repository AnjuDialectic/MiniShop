import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CheckoutConflictItem } from '../types/api';
import type {
  AddToCartResult,
  CartItem,
  CartItemConflict,
  UpdateQuantityResult,
} from '../types/cart';
import type { Product } from '../types/product';

export const CART_STORAGE_KEY = 'minishop-cart-v1';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => AddToCartResult;
  updateQuantity: (productId: number, qty: number) => UpdateQuantityResult | null;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  syncWithCatalog: (products: Product[], isFullCatalog?: boolean) => void;
  applyStockConflicts: (conflicts: CheckoutConflictItem[]) => void;
  resolveConflictForItem: (productId: number) => void;
  resolveAllConflicts: () => { adjustedCount: number; removedCount: number };
}

function clampQuantity(qty: number, maxStock: number): number {
  const safeMax = Math.max(1, Math.floor(maxStock));
  const safeQty = Number.isFinite(qty) ? Math.floor(qty) : 1;
  return Math.max(1, Math.min(safeQty, safeMax));
}

function sanitizePersistedItem(raw: unknown): CartItem | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const candidate = raw as Partial<CartItem>;
  const productId = Number(candidate.productId);
  const price = Number(candidate.price);
  const maxStock = Number(candidate.maxStock);
  const quantity = Number(candidate.quantity);

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    typeof candidate.name !== 'string' ||
    candidate.name.trim() === '' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(maxStock) ||
    maxStock < 0 ||
    !Number.isFinite(quantity) ||
    quantity < 1
  ) {
    return null;
  }

  const safeMaxStock = Math.floor(maxStock);
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const unavailable = Boolean(candidate.unavailable) || safeMaxStock === 0;

  let conflict: CartItemConflict | undefined = candidate.conflict;
  if (!conflict && unavailable) {
    conflict = {
      requestedQuantity: safeQuantity,
      availableStock: 0,
      reason: 'INSUFFICIENT_STOCK',
    };
  } else if (!conflict && safeQuantity > safeMaxStock) {
    conflict = {
      requestedQuantity: safeQuantity,
      availableStock: safeMaxStock,
      reason: 'INSUFFICIENT_STOCK',
    };
  }

  return {
    productId,
    name: candidate.name,
    price: Math.round(price),
    imageUrl: typeof candidate.imageUrl === 'string' ? candidate.imageUrl : '',
    category: typeof candidate.category === 'string' ? candidate.category : '',
    maxStock: safeMaxStock,
    quantity: conflict ? safeQuantity : clampQuantity(safeQuantity, safeMaxStock),
    unavailable,
    conflict,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, qty = 1) => {
        const existing = get().items.find((item) => item.productId === product.id);

        if (product.stock <= 0) {
          return {
            status: 'out_of_stock',
            addedQuantity: 0,
            finalQuantity: existing?.quantity ?? 0,
            maxStock: 0,
          };
        }

        const requestedToAdd = Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1));

        if (existing) {
          const currentQty = existing.quantity;

          if (currentQty >= product.stock) {
            set((state) => ({
              items: state.items.map((item) =>
                item.productId === product.id
                  ? {
                      ...item,
                      name: product.name,
                      price: product.price,
                      imageUrl: product.image_url,
                      category: product.category,
                      maxStock: product.stock,
                      unavailable: false,
                      conflict:
                        item.quantity > product.stock
                          ? {
                              requestedQuantity: item.quantity,
                              availableStock: product.stock,
                              reason: 'INSUFFICIENT_STOCK',
                            }
                          : undefined,
                    }
                  : item,
              ),
            }));

            return {
              status: 'max_reached',
              addedQuantity: 0,
              finalQuantity: currentQty,
              maxStock: product.stock,
            };
          }

          const nextQty = clampQuantity(currentQty + requestedToAdd, product.stock);
          const addedQuantity = nextQty - currentQty;

          set((state) => ({
            items: state.items.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.image_url,
                    category: product.category,
                    maxStock: product.stock,
                    quantity: nextQty,
                    unavailable: false,
                    conflict: undefined,
                  }
                : item,
            ),
          }));

          return {
            status: addedQuantity < requestedToAdd ? 'capped' : 'added',
            addedQuantity,
            finalQuantity: nextQty,
            maxStock: product.stock,
          };
        }

        const nextQty = clampQuantity(requestedToAdd, product.stock);

        set((state) => ({
          items: [
            ...state.items,
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.image_url,
              category: product.category,
              maxStock: product.stock,
              quantity: nextQty,
              unavailable: false,
            },
          ],
        }));

        return {
          status: nextQty < requestedToAdd ? 'capped' : 'added',
          addedQuantity: nextQty,
          finalQuantity: nextQty,
          maxStock: product.stock,
        };
      },

      updateQuantity: (productId, qty) => {
        const target = get().items.find((item) => item.productId === productId);
        if (!target || target.unavailable || target.maxStock <= 0) {
          return null;
        }

        const parsed = Number.isFinite(qty) ? Math.floor(qty) : 1;
        const clampedQty = clampQuantity(parsed, target.maxStock);

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: clampedQty,
                  conflict: undefined,
                }
              : item,
          ),
        }));

        return {
          clamped: clampedQty !== parsed,
          quantity: clampedQty,
          maxStock: target.maxStock,
        };
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      syncWithCatalog: (products, isFullCatalog = false) => {
        const currentItems = get().items;
        if (currentItems.length === 0) {
          return;
        }

        const productMap = new Map<number, Product>();
        for (const product of products) {
          productMap.set(product.id, product);
        }

        let hasChanges = false;

        const nextItems = currentItems.map((item) => {
          const latest = productMap.get(item.productId);

          if (!latest) {
            if (!isFullCatalog) {
              return item;
            }

            const alreadyMarkedUnavailable =
              item.unavailable === true &&
              item.maxStock === 0 &&
              item.conflict?.reason === 'PRODUCT_UNAVAILABLE';

            if (alreadyMarkedUnavailable) {
              return item;
            }

            hasChanges = true;
            return {
              ...item,
              maxStock: 0,
              unavailable: true,
              conflict: {
                requestedQuantity: item.quantity,
                availableStock: 0,
                reason: 'PRODUCT_UNAVAILABLE' as const,
              },
            };
          }

          const latestStock = Math.max(0, latest.stock);
          const isUnavailable = latestStock <= 0;
          const nextConflict: CartItemConflict | undefined = isUnavailable
            ? {
                requestedQuantity: item.quantity,
                availableStock: 0,
                reason: 'INSUFFICIENT_STOCK',
              }
            : item.quantity > latestStock
              ? {
                  requestedQuantity: item.quantity,
                  availableStock: latestStock,
                  reason: 'INSUFFICIENT_STOCK',
                }
              : undefined;

          const unchanged =
            item.name === latest.name &&
            item.price === latest.price &&
            item.imageUrl === latest.image_url &&
            item.category === latest.category &&
            item.maxStock === latestStock &&
            Boolean(item.unavailable) === isUnavailable &&
            item.conflict?.availableStock === nextConflict?.availableStock &&
            item.conflict?.reason === nextConflict?.reason &&
            item.conflict?.requestedQuantity === nextConflict?.requestedQuantity;

          if (unchanged) {
            return item;
          }

          hasChanges = true;
          return {
            ...item,
            name: latest.name,
            price: latest.price,
            imageUrl: latest.image_url,
            category: latest.category,
            maxStock: latestStock,
            unavailable: isUnavailable,
            conflict: nextConflict,
          };
        });

        if (hasChanges) {
          set({ items: nextItems });
        }
      },

      applyStockConflicts: (conflicts) => {
        if (conflicts.length === 0) {
          return;
        }

        const conflictMap = new Map<number, CheckoutConflictItem>();
        for (const conflict of conflicts) {
          conflictMap.set(conflict.product_id, conflict);
        }

        set((state) => ({
          items: state.items.map((item) => {
            const conflict = conflictMap.get(item.productId);
            if (!conflict) {
              return item;
            }

            const availableStock = Math.max(0, conflict.available_stock);
            const isUnavailable =
              conflict.reason === 'PRODUCT_UNAVAILABLE' || availableStock <= 0;

            return {
              ...item,
              name: conflict.product_name ?? item.name,
              maxStock: availableStock,
              unavailable: isUnavailable,
              conflict: {
                requestedQuantity: conflict.requested_quantity,
                availableStock,
                reason: conflict.reason,
              },
            };
          }),
        }));
      },

      resolveConflictForItem: (productId) => {
        set((state) => {
          const target = state.items.find((item) => item.productId === productId);
          if (!target) {
            return state;
          }

          if (target.unavailable || target.maxStock <= 0) {
            return {
              items: state.items.filter((item) => item.productId !== productId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: clampQuantity(item.quantity, item.maxStock),
                    conflict: undefined,
                  }
                : item,
            ),
          };
        });
      },

      resolveAllConflicts: () => {
        let adjustedCount = 0;
        let removedCount = 0;

        set((state) => {
          const resolved: CartItem[] = [];

          for (const item of state.items) {
            if (item.unavailable || item.maxStock <= 0) {
              removedCount += 1;
              continue;
            }

            if (item.quantity > item.maxStock || item.conflict) {
              adjustedCount += 1;
              resolved.push({
                ...item,
                quantity: clampQuantity(item.quantity, item.maxStock),
                conflict: undefined,
              });
              continue;
            }

            resolved.push(item);
          }

          return { items: resolved };
        });

        return { adjustedCount, removedCount };
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { items?: unknown } | null | undefined;
        const rawItems = Array.isArray(persisted?.items) ? persisted.items : [];
        const sanitizedItems = rawItems
          .map(sanitizePersistedItem)
          .filter((item): item is CartItem => item !== null);

        return {
          ...currentState,
          items: sanitizedItems,
        };
      },
    },
  ),
);

export function isCartItemConflicted(item: CartItem): boolean {
  return Boolean(item.unavailable) || item.maxStock <= 0 || item.quantity > item.maxStock || Boolean(item.conflict);
}

export function selectTotalItems(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectGrandTotal(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function selectHasCartConflicts(state: CartState): boolean {
  return state.items.some(isCartItemConflicted);
}

export function selectConflictedItems(state: CartState): CartItem[] {
  return state.items.filter(isCartItemConflicted);
}
