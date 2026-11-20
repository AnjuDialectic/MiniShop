import { useOutletContext } from 'react-router-dom';

export interface AdminSummaryMetrics {
  totalProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalOrders: number;
  categoriesCount: number;
}

export interface AdminOutletContext {
  adminRefreshKey: number;
  categories: string[];
  categoriesLoading: boolean;
  summary: AdminSummaryMetrics | null;
  refreshAdminData: () => void;
}

export function useAdminContext(): AdminOutletContext {
  return useOutletContext<AdminOutletContext>();
}
