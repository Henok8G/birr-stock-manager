 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 export interface StockEntry {
   id: string;
   product_id: string;
   quantity: number;
   buying_price: number | null;
   type: 'inbound' | 'adjustment';
   reason: string | null;
   notes: string | null;
   created_at: string;
 }
 
 export interface StockEntryFormData {
   product_id: string;
   quantity: number;
   buying_price?: number;
   type: 'inbound' | 'adjustment';
   reason?: string;
   notes?: string;
 }
 
 export function useProductStockEntries(productId: string | null) {
   return useQuery({
     queryKey: ['stock-entries', productId],
     queryFn: async () => {
       if (!productId) return [];
       
       const { data, error } = await supabase
         .from('stock_entries')
         .select('*')
         .eq('product_id', productId)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return data as StockEntry[];
     },
     enabled: !!productId,
   });
 }
 
 export function useStockEntries() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   const addStockEntry = useMutation({
     mutationFn: async (data: StockEntryFormData) => {
       const { data: entry, error } = await supabase
         .from('stock_entries')
         .insert({
           product_id: data.product_id,
           quantity: data.quantity,
           buying_price: data.buying_price || null,
           type: data.type,
           reason: data.reason || null,
           notes: data.notes || null,
         })
         .select()
         .single();
 
       if (error) throw error;
 
       // Create audit log
       await supabase.from('audit_logs').insert({
         entity: 'stock_entry',
         entity_id: entry.id,
         action: data.type === 'inbound' ? 'stock_received' : 'stock_adjusted',
         details: { 
           product_id: data.product_id, 
           quantity: data.quantity,
           type: data.type,
           reason: data.reason,
         },
       });
 
       return entry;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['products'] });
       queryClient.invalidateQueries({ queryKey: ['dashboard'] });
       queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
       
       const action = variables.type === 'inbound' ? 'Stock Added' : 'Stock Adjusted';
       toast({
         title: action,
         description: `${Math.abs(variables.quantity)} units ${variables.type === 'inbound' ? 'added' : 'adjusted'}.`,
       });
     },
     onError: (error: any) => {
       toast({
         title: "Error",
         description: error.message || "Failed to update stock",
         variant: "destructive",
       });
     },
   });
 
   return {
     addStockEntry,
   };
 }