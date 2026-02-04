import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export interface SaleItem {
  product_id: string;
  quantity: number;
  selling_price: number;
}

export interface Sale {
  id: string;
  total_units: number;
  total_value: number;
  payment_type: 'Cash' | 'Card' | 'Other' | null;
  notes: string | null;
  is_reversed: boolean;
  reversed_sale_id: string | null;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleFormData {
  items: SaleItem[];
  payment_type: 'Cash' | 'Card' | 'Other';
  notes?: string;
}

export type DateFilterType = 
  | 'today' 
  | 'yesterday' 
  | 'day_before' 
  | '7days' 
  | 'this_week'
  | 'last_week'
  | 'week_before_last'
  | 'month' 
  | 'all';

export function getDateRange(filter: DateFilterType): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'day_before':
      const dayBefore = subDays(now, 2);
      return { start: startOfDay(dayBefore), end: endOfDay(dayBefore) };
    case '7days':
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week':
      const lastWeek = subWeeks(now, 1);
      return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    case 'week_before_last':
      const weekBeforeLast = subWeeks(now, 2);
      return { start: startOfWeek(weekBeforeLast, { weekStartsOn: 1 }), end: endOfWeek(weekBeforeLast, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case 'all':
      return null;
    default:
      return null;
  }
}

export function getDateFilterLabel(filter: DateFilterType): string {
  const range = getDateRange(filter);
  if (!range) return 'All Time';
  
  switch (filter) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'day_before':
      return format(subDays(new Date(), 2), 'EEEE');
    case '7days':
      return 'Last 7 Days';
    case 'this_week':
      return 'This Week';
    case 'last_week':
      return 'Last Week';
    case 'week_before_last':
      return '2 Weeks Ago';
    case 'month':
      return 'This Month';
    default:
      return 'All Time';
  }
}

export function useSales(dateFilter: DateFilterType = 'today') {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['sales', dateFilter],
    queryFn: async () => {
      const dateRange = getDateRange(dateFilter);
      
      let salesQuery = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateRange) {
        salesQuery = salesQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Get all sale items for these sales
      const saleIds = sales?.map((s: any) => s.id) || [];
      
      if (saleIds.length === 0) return [];

      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);

      if (itemsError) throw itemsError;

      // Combine sales with their items
      return sales.map((sale: any) => ({
        ...sale,
        items: saleItems?.filter((item: any) => item.sale_id === sale.id) || [],
      })) as Sale[];
    },
  });

  const createSale = useMutation({
    mutationFn: async (data: SaleFormData) => {
      const totalUnits = data.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = data.items.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_units: totalUnits,
          total_value: totalValue,
          payment_type: data.payment_type,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = data.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        selling_price: item.selling_price,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Create stock adjustments for each item (negative to reduce stock)
      const stockAdjustments = data.items.map(item => ({
        product_id: item.product_id,
        quantity: -item.quantity, // Negative because we're selling
        type: 'adjustment' as const,
        reason: `Sale ${sale.id}`,
        notes: null,
      }));

      // We don't create stock entries for sales - the useSales query calculates sold from sale_items

      // Create audit log
      await supabase.from('audit_logs').insert({
        entity: 'sale',
        entity_id: sale.id,
        action: 'sale_created',
        details: { 
          total_units: totalUnits, 
          total_value: totalValue,
          items_count: data.items.length,
        },
      });

      return { ...sale, items: data.items };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      toast({
        title: "Sale Recorded",
        description: `Sale of ${data.total_units} units for ETB ${data.total_value.toFixed(2)} recorded.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  const reverseSale = useMutation({
    mutationFn: async (saleId: string) => {
      // Get the original sale
      const { data: originalSale, error: fetchError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (fetchError) throw fetchError;

      // Get sale items
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      // Mark original sale as reversed
      const { error: updateError } = await supabase
        .from('sales')
        .update({ is_reversed: true })
        .eq('id', saleId);

      if (updateError) throw updateError;

      // Create reversal sale record (negative values)
      const { data: reversalSale, error: reversalError } = await supabase
        .from('sales')
        .insert({
          total_units: -originalSale.total_units,
          total_value: -originalSale.total_value,
          payment_type: originalSale.payment_type,
          notes: `Reversal of sale ${saleId}`,
          reversed_sale_id: saleId,
        })
        .select()
        .single();

      if (reversalError) throw reversalError;

      // Create reversal sale items
      if (saleItems && saleItems.length > 0) {
        const reversalItems = saleItems.map((item: any) => ({
          sale_id: reversalSale.id,
          product_id: item.product_id,
          quantity: -item.quantity,
          selling_price: item.selling_price,
        }));

        const { error: reversalItemsError } = await supabase
          .from('sale_items')
          .insert(reversalItems);

        if (reversalItemsError) throw reversalItemsError;
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        entity: 'sale',
        entity_id: saleId,
        action: 'sale_reversed',
        details: { 
          original_sale_id: saleId,
          reversal_sale_id: reversalSale.id,
        },
      });

      return reversalSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      toast({
        title: "Sale Reversed",
        description: "Sale has been reversed and stock quantities restored.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reverse sale",
        variant: "destructive",
      });
    },
  });

  return {
    sales: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createSale,
    reverseSale,
  };
}
