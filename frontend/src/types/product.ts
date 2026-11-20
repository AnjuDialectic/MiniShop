export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  is_in_stock: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export type ProductSortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface ProductListParams {
  search?: string;
  category?: string;
  sort?: ProductSortOption;
  page?: number;
  per_page?: number;
}
