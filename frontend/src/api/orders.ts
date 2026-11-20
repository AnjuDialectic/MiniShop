import type { ApiSuccessResponse } from '../types/api';
import type { CreateOrderPayload, Order } from '../types/order';
import { apiRequest } from './client';

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await apiRequest<ApiSuccessResponse<Order>>('/orders', {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

export async function fetchOrderById(
  id: number,
  signal?: AbortSignal,
): Promise<Order> {
  const response = await apiRequest<ApiSuccessResponse<Order>>(`/orders/${id}`, {
    signal,
  });
  return response.data;
}
