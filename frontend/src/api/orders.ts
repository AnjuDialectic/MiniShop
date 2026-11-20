import type { ApiListResponse, ApiSuccessResponse } from '../types/api';
import type { CreateOrderPayload, Order, OrderListParams } from '../types/order';
import { apiRequest } from './client';

export async function fetchOrders(
  params: OrderListParams = {},
  signal?: AbortSignal,
): Promise<ApiListResponse<Order>> {
  return apiRequest<ApiListResponse<Order>>('/orders', {
    query: {
      page: params.page,
      per_page: params.per_page,
    },
    signal,
  });
}

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
