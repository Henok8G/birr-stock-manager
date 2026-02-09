import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { Product, ProductCategory } from '@/types/inventory';
import { Loader2 } from 'lucide-react';

const categories: ProductCategory[] = ['Beer', 'Soda', 'Water', 'Alcohol', 'Juice', 'Other'];

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function EditProductModal({ open, onOpenChange, product }: EditProductModalProps) {
  const { updateProduct } = useProducts();
  const [form, setForm] = useState({
    name: '',
    category: '' as ProductCategory,
    buying_price: 0,
    selling_price: 0,
    opening_stock: 0,
    reorder_level: 0,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        buying_price: product.buying_price,
        selling_price: product.selling_price,
        opening_stock: product.opening_stock,
        reorder_level: product.reorder_level ?? 0,
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    updateProduct.mutate(
      { id: product.id, ...form },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as ProductCategory }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buying Price</Label>
              <Input
                type="number"
                step="0.01"
                value={form.buying_price}
                onChange={(e) => setForm(f => ({ ...f, buying_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price</Label>
              <Input
                type="number"
                step="0.01"
                value={form.selling_price}
                onChange={(e) => setForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening Stock</Label>
              <Input
                type="number"
                value={form.opening_stock}
                onChange={(e) => setForm(f => ({ ...f, opening_stock: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm(f => ({ ...f, reorder_level: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
