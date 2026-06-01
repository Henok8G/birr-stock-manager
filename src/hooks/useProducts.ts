import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Product, ProductFormData } from '@/types/inventory';

export function useProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      // Pre-aggregated stock levels via server-side view to avoid the
      // PostgREST 1000-row limit on stock_entries / sale_items.
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

      return products.map((product: any) => {
        const lv = levelMap.get(product.id) || { received: 0, adjustments: 0, sold: 0 };
        const current_stock = product.opening_stock + lv.received - lv.sold + lv.adjustments;
        return {
          ...product,
          received: lv.received,
          sold: lv.sold,
          adjustments: lv.adjustments,
          current_stock,
        } as Product;
      });
    },
  });

  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name: data.name,
          category: data.category,
          buying_price: data.buying_price,
          selling_price: data.selling_price,
          opening_stock: data.opening_stock,
          reorder_level: data.reorder_level || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        entity: 'product',
        entity_id: product.id,
        action: 'create',
        details: { name: data.name, category: data.category },
      });

      return product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Product Added",
        description: `${data.name} has been added to inventory.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProductFormData> & { id: string }) => {
      const { data: product, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Product Deleted",
        description: "Product has been removed from inventory.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
