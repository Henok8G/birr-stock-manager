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
      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      // Fetch stock entries grouped by product
      const { data: stockEntries, error: stockError } = await supabase
        .from('stock_entries')
        .select('product_id, quantity, type');

      if (stockError) throw stockError;

      // Fetch sale items grouped by product
      const { data: saleItems, error: saleError } = await supabase
        .from('sale_items')
        .select('product_id, quantity');

      if (saleError) throw saleError;

      // Calculate stock for each product
      return products.map((product: any) => {
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
          received,
          sold,
          adjustments,
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
