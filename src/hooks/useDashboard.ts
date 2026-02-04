import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

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
      // Fetch all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Fetch all stock entries
      const { data: stockEntries, error: stockError } = await supabase
        .from('stock_entries')
        .select('product_id, quantity, type');

      if (stockError) throw stockError;

      // Fetch all sale items
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity, selling_price, created_at');

      if (saleItemsError) throw saleItemsError;

      // Fetch all sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('is_reversed', false);

      if (salesError) throw salesError;

      // Calculate current stock for each product
      const productsWithStock = products.map((product: any) => {
        const productStockEntries = stockEntries?.filter((e: any) => e.product_id === product.id) || [];
        const productSaleItems = saleItems?.filter((s: any) => s.product_id === product.id) || [];

        const received = productStockEntries
          .filter((e: any) => e.type === 'inbound')
          .reduce((sum: number, e: any) => sum + e.quantity, 0);

        const adjustments = productStockEntries
          .filter((e: any) => e.type === 'adjustment')
          .reduce((sum: number, e: any) => sum + e.quantity, 0);

        const sold = productSaleItems.reduce((sum: number, s: any) => sum + s.quantity, 0);

        const current_stock = product.opening_stock + received - sold + adjustments;

        return {
          ...product,
          current_stock,
        };
      });

      // Calculate summary
      const todayStart = startOfDay(new Date()).toISOString();
      const todaySales = sales?.filter((s: any) => s.created_at >= todayStart) || [];

      const summary: DashboardSummary = {
        totalProducts: products.length,
        totalUnitsInStock: productsWithStock.reduce((sum: number, p: any) => sum + (p.current_stock || 0), 0),
        todayUnitsSold: todaySales.reduce((sum: number, s: any) => sum + s.total_units, 0),
        todaySalesValue: todaySales.reduce((sum: number, s: any) => sum + Number(s.total_value), 0),
        totalStockValue: productsWithStock.reduce((sum: number, p: any) => {
          return sum + ((p.current_stock || 0) * Number(p.buying_price));
        }, 0),
      };

      // Calculate daily sales for last 7 days
      const dailySales: DailySalesData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = startOfDay(subDays(date, -1)).toISOString();

        const daySales = sales?.filter((s: any) => 
          s.created_at >= dayStart && s.created_at < dayEnd
        ) || [];

        dailySales.push({
          date: dateStr,
          units: daySales.reduce((sum: number, s: any) => sum + s.total_units, 0),
          value: daySales.reduce((sum: number, s: any) => sum + Number(s.total_value), 0),
        });
      }

      // Calculate top sellers (last 7 days)
      const weekAgo = subDays(new Date(), 7).toISOString();
      const recentSaleItems = saleItems?.filter((item: any) => item.created_at >= weekAgo) || [];

      const productSales: Record<string, number> = {};
      recentSaleItems.forEach((item: any) => {
        productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
      });

      const topSellers: TopSellerData[] = Object.entries(productSales)
        .map(([product_id, units_sold]) => {
          const product = products.find((p: any) => p.id === product_id);
          return {
            product_id,
            product_name: product?.name || 'Unknown',
            units_sold,
          };
        })
        .sort((a, b) => b.units_sold - a.units_sold)
        .slice(0, 5);

      // Get low stock products
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
