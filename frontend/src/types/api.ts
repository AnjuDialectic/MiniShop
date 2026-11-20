export interface ApiMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiListResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: ApiMeta;
}

export type ValidationErrors = Record<string, string[]>;

export type CheckoutConflictReason = 'INSUFFICIENT_STOCK' | 'PRODUCT_UNAVAILABLE';

export interface CheckoutConflictItem {
  product_id: number;
  product_name: string | null;
  requested_quantity: number;
  available_stock: number;
  reason: CheckoutConflictReason;
}

export interface ApiErrorPayload {
  success: false;
  message: string;
  errors?: ValidationErrors | { items: CheckoutConflictItem[] };
}
