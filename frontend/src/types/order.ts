export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image_url: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_email: string | null;
  notes: string | null;
  status: string;
  total_quantity: number;
  items_count: number;
  total_amount: number;
  created_at: string | null;
  items?: OrderItem[];
}

export interface CreateOrderItemPayload {
  product_id: number;
  quantity: number;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_email?: string | null;
  notes?: string | null;
  items: CreateOrderItemPayload[];
}
