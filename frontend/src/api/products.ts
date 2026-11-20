import type { ApiListResponse, ApiSuccessResponse } from '../types/api';
import type {
  Product,
  ProductListParams,
  ProductMutationPayload,
} from '../types/product';
import { apiRequest } from './client';

export async function fetchProducts(
  params: ProductListParams = {},
  signal?: AbortSignal,
): Promise<ApiListResponse<Product>> {
  return apiRequest<ApiListResponse<Product>>('/products', {
    query: {
      search: params.search,
      category: params.category,
      sort: params.sort,
      page: params.page,
      per_page: params.per_page,
    },
    signal,
  });
}

export async function fetchProductById(
  id: number,
  signal?: AbortSignal,
): Promise<Product> {
  const response = await apiRequest<ApiSuccessResponse<Product>>(`/products/${id}`, {
    signal,
  });
  return response.data;
}

export async function fetchCategories(signal?: AbortSignal): Promise<string[]> {
  const response = await apiRequest<ApiSuccessResponse<string[]>>('/categories', {
    signal,
  });
  return response.data;
}

export async function createProduct(
  payload: ProductMutationPayload,
): Promise<Product> {
  const response = await apiRequest<ApiSuccessResponse<Product>>('/products', {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

export async function updateProduct(
  id: number,
  payload: ProductMutationPayload,
): Promise<Product> {
  const response = await apiRequest<ApiSuccessResponse<Product>>(`/products/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return response.data;
}

export async function deleteProduct(id: number): Promise<void> {
  await apiRequest<ApiSuccessResponse<null>>(`/products/${id}`, {
    method: 'DELETE',
  });
}
