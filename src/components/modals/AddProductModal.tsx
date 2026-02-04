import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductCategory, ProductFormData } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (product: ProductFormData) => void;
}

const categories: ProductCategory[] = ['Beer', 'Soda', 'Water', 'Alcohol', 'Juice', 'Other'];

export function AddProductModal({ open, onOpenChange, onSuccess }: AddProductModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: 'Beer',
    unit_size: '',
    buying_price: 0,
    selling_price: 0,
    opening_stock: 0,
    reorder_level: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.buying_price < 0) {
      newErrors.buying_price = 'Buying price must be 0 or greater';
    }
    if (formData.selling_price < 0) {
      newErrors.selling_price = 'Selling price must be 0 or greater';
    }
    if (formData.opening_stock < 0) {
      newErrors.opening_stock = 'Opening stock must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    
    // Simulate API call - will be replaced with Lovable Cloud
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast({
      title: "Product Added",
      description: `${formData.name} has been added to inventory.`,
    });
    
    onSuccess?.(formData);
    onOpenChange(false);
    setFormData({
      name: '',
      sku: '',
      category: 'Beer',
      unit_size: '',
      buying_price: 0,
      selling_price: 0,
      opening_stock: 0,
      reorder_level: 0,
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="modal-header">Add New Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <Label htmlFor="name" className="form-label">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Habesha Beer 330ml"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label htmlFor="sku" className="form-label">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., BRH-001"
              />
            </div>
            <div className="form-group">
              <Label htmlFor="category" className="form-label">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: ProductCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="form-group">
            <Label htmlFor="unit_size" className="form-label">Unit Size</Label>
            <Input
              id="unit_size"
              value={formData.unit_size}
              onChange={(e) => setFormData({ ...formData, unit_size: e.target.value })}
              placeholder="e.g., 330ml, 500ml, 1L"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label htmlFor="buying_price" className="form-label">
                Buying Price (ETB) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="buying_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.buying_price}
                onChange={(e) => setFormData({ ...formData, buying_price: parseFloat(e.target.value) || 0 })}
                className={errors.buying_price ? 'border-destructive' : ''}
              />
              {errors.buying_price && <p className="text-sm text-destructive">{errors.buying_price}</p>}
            </div>
            <div className="form-group">
              <Label htmlFor="selling_price" className="form-label">Selling Price (ETB)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label htmlFor="opening_stock" className="form-label">Opening Stock</Label>
              <Input
                id="opening_stock"
                type="number"
                min="0"
                value={formData.opening_stock}
                onChange={(e) => setFormData({ ...formData, opening_stock: parseInt(e.target.value) || 0 })}
                className={errors.opening_stock ? 'border-destructive' : ''}
              />
              {errors.opening_stock && <p className="text-sm text-destructive">{errors.opening_stock}</p>}
            </div>
            <div className="form-group">
              <Label htmlFor="reorder_level" className="form-label">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
