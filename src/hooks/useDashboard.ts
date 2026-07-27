import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';
import { isCountableSale } from '@/lib/sales';

export interface DashboardSummary {
  totalProducts: number;
  totalUnitsInStock: number;
  todayUnitsSold: number;
  todaySalesValue: number;
  totalStockValue: number;
}

export interface DailySalesData {
  date: string;
  units: number;
  value: number;
}

export interface TopSellerData {
  product_id: string;
  product_name: string;
  units_sold: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // Products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');
      if (productsError) throw productsError;

      // Pre-aggregated stock levels (server-side, avoids 1000-row limit)
      const { data: levels, error: levelsError } = await supabase
        .from('product_stock_levels' as any)
        .select('product_id, received, adjustments, sold');
      if (levelsError) throw levelsError;

      const levelMap = new Map<string, { received: number; adjustments: number; sold: number }>();
      (levels || []).forEach((l: any) => {
        levelMap.set(l.product_id, {
          received: Number(l.received) || 0,
          adjustments: Number(l.adjustments) || 0,
          sold: Number(l.sold) || 0,
        });
      });

      const productsWithStock = products.map((product: any) => {
        const lv = levelMap.get(product.id) || { received: 0, adjustments: 0, sold: 0 };
        const current_stock = product.opening_stock + lv.received - lv.sold + lv.adjustments;
        return { ...product, current_stock };
      });

      // Date-bounded queries (much smaller result sets)
      const weekAgoDate = subDays(new Date(), 7);
      const weekAgo = weekAgoDate.toISOString();
      const todayStart = startOfDay(new Date()).toISOString();

      // Exclude BOTH halves of a reversal pair: the flagged original
      // (is_reversed = true) and the negative mirror row (reversed_sale_id set).
      const { data: recentSales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('is_reversed', false)
        .is('reversed_sale_id', null)
        .gte('created_at', weekAgo);
      if (salesError) throw salesError;

      const { data: recentSaleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity, selling_price, created_at, sales(is_reversed, reversed_sale_id)')
        .gte('created_at', weekAgo);
      if (saleItemsError) throw saleItemsError;

      // Same rule for line items, so reversed quantities don't skew top sellers.
      const countableSaleItems = (recentSaleItems || []).filter((item: any) =>
        isCountableSale(item.sales)
      );

      const todaySales = (recentSales || []).filter((s: any) => s.created_at >= todayStart);

      const summary: DashboardSummary = {
        totalProducts: products.length,
        totalUnitsInStock: productsWithStock.reduce((sum: number, p: any) => sum + (p.current_stock || 0), 0),
        todayUnitsSold: todaySales.reduce((sum: number, s: any) => sum + s.total_units, 0),
        todaySalesValue: todaySales.reduce((sum: number, s: any) => sum + Number(s.total_value), 0),
        totalStockValue: productsWithStock.reduce((sum: number, p: any) => {
          return sum + ((p.current_stock || 0) * Number(p.buying_price));
        }, 0),
      };

      // Daily sales for last 7 days
      const dailySales: DailySalesData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = startOfDay(subDays(date, -1)).toISOString();

        const daySales = (recentSales || []).filter((s: any) =>
          s.created_at >= dayStart && s.created_at < dayEnd
        );

        dailySales.push({
          date: dateStr,
          units: daySales.reduce((sum: number, s: any) => sum + s.total_units, 0),
          value: daySales.reduce((sum: number, s: any) => sum + Number(s.total_value), 0),
        });
      }

      // Top sellers (last 7 days)
      const productSales: Record<string, number> = {};
      (recentSaleItems || []).forEach((item: any) => {
        productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
      });

      const topSellers: TopSellerData[] = products.map((product: any) => ({
        product_id: product.id,
        product_name: product.name,
        units_sold: productSales[product.id] || 0,
      })).sort((a, b) => b.units_sold - a.units_sold);

      const lowStockProducts = productsWithStock.filter((p: any) => {
        if (p.current_stock < 0) return true;
        if (p.reorder_level !== null && p.current_stock <= p.reorder_level) return true;
        return false;
      });

      return {
        summary,
        dailySales,
        topSellers,
        lowStockProducts,
        productsWithStock,
      };
    },
  });
}
