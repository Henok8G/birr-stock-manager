import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryHistoryEntry {
  id: string;
  type: 'inbound' | 'adjustment' | 'sale';
  product_id: string;
  product_name: string;
  quantity: number;
  created_at: string;
  notes: string | null;
  reason: string | null;
  buying_price: number | null;
  selling_price: number | null;
}

export function useInventoryHistory() {
  return useQuery({
    queryKey: ['inventory-history'],
    queryFn: async () => {
      // Fetch stock entries with product names
      const { data: stockEntries, error: stockError } = await supabase
        .from('stock_entries')
        .select('id, type, product_id, quantity, created_at, notes, reason, buying_price, products(name)')
        .order('created_at', { ascending: false });

      if (stockError) throw stockError;

      // Fetch sale items with product names and sale info
      const { data: saleItems, error: saleError } = await supabase
        .from('sale_items')
        .select('id, product_id, quantity, selling_price, created_at, sales(id, created_at, is_reversed), products(name)')
        .order('created_at', { ascending: false });

      if (saleError) throw saleError;

      const entries: InventoryHistoryEntry[] = [];

      // Map stock entries
      stockEntries?.forEach((entry: any) => {
        entries.push({
          id: entry.id,
          type: entry.type,
          product_id: entry.product_id,
          product_name: entry.products?.name || 'Unknown',
          quantity: entry.quantity,
          created_at: entry.created_at,
          notes: entry.notes,
          reason: entry.reason,
          buying_price: entry.buying_price,
          selling_price: null,
        });
      });

      // Map sale items (exclude reversed sales)
      saleItems?.forEach((item: any) => {
        if (item.sales?.is_reversed) return;
        entries.push({
          id: item.id,
          type: 'sale',
          product_id: item.product_id,
          product_name: item.products?.name || 'Unknown',
          quantity: item.quantity,
          created_at: item.sales?.created_at || item.created_at,
          notes: null,
          reason: null,
          buying_price: null,
          selling_price: item.selling_price,
        });
      });

      // Sort by date descending
      entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return entries;
    },
  });
}
