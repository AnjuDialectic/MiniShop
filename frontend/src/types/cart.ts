import type { CheckoutConflictReason } from './api';

export interface CartItemConflict {
  requestedQuantity: number;
  availableStock: number;
  reason: CheckoutConflictReason;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  maxStock: number;
  quantity: number;
  unavailable?: boolean;
  conflict?: CartItemConflict;
}

export type AddToCartStatus = 'added' | 'capped' | 'max_reached' | 'out_of_stock';

export interface AddToCartResult {
  status: AddToCartStatus;
  addedQuantity: number;
  finalQuantity: number;
  maxStock: number;
}

export interface UpdateQuantityResult {
  clamped: boolean;
  quantity: number;
  maxStock: number;
}
