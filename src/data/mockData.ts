// Mock data - no longer needed, database is used instead
import { DashboardSummary, DailySalesData, TopSellerData } from '@/types/inventory';

// Dashboard summary (mock for fallback)
export const mockDashboardSummary: DashboardSummary = {
  totalProducts: 0,
  totalUnitsInStock: 0,
  todayUnitsSold: 0,
  todaySalesValue: 0,
  totalStockValue: 0,
};

// Daily sales for chart (last 7 days) - mock for fallback
export const mockDailySales: DailySalesData[] = [
  { date: '2025-01-28', units: 0, value: 0 },
  { date: '2025-01-29', units: 0, value: 0 },
  { date: '2025-01-30', units: 0, value: 0 },
  { date: '2025-01-31', units: 0, value: 0 },
  { date: '2025-02-01', units: 0, value: 0 },
  { date: '2025-02-02', units: 0, value: 0 },
  { date: '2025-02-03', units: 0, value: 0 },
];

// Top sellers - mock for fallback
export const mockTopSellers: TopSellerData[] = [];
