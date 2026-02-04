import { useState, useEffect } from 'react';
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
import { Product, StockEntryFormData, getStockStatus } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  selectedProduct?: Product | null;
  onSuccess?: (entry: StockEntryFormData) => void;
}

export function AddStockModal({ 
  open, 
  onOpenChange, 
  products, 
  selectedProduct,
  onSuccess 
}: AddStockModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StockEntryFormData>({
    product_id: '',
    quantity: 0,
    buying_price: undefined,
    supplier: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof StockEntryFormData, string>>>({});

  useEffect(() => {
    if (selectedProduct) {
      setFormData({
        ...formData,
        product_id: selectedProduct.id,
        buying_price: selectedProduct.buying_price,
      });
    } else {
      setFormData({
        product_id: '',
        quantity: 0,
        buying_price: undefined,
        supplier: '',
        notes: '',
      });
    }
  }, [selectedProduct, open]);

  const currentProduct = products.find(p => p.id === formData.product_id);
  const currentStock = currentProduct?.current_stock ?? 0;
  const status = currentProduct ? getStockStatus(currentStock, currentProduct.reorder_level) : 'OK';

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof StockEntryFormData, string>> = {};
    
    if (!formData.product_id) {
      newErrors.product_id = 'Please select a product';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const productName = currentProduct?.name || 'Product';
    toast({
      title: "Stock Added",
      description: `Added ${formData.quantity} units to ${productName}.`,
    });
    
    onSuccess?.(formData);
    onOpenChange(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="modal-header">Add Stock (Inbound)</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <Label htmlFor="product" className="form-label">
              Product <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => {
                const product = products.find(p => p.id === value);
                setFormData({ 
                  ...formData, 
                  product_id: value,
                  buying_price: product?.buying_price,
                });
              }}
            >
              <SelectTrigger className={errors.product_id ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} {product.sku && `(${product.sku})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product_id && <p className="text-sm text-destructive">{errors.product_id}</p>}
          </div>

          {currentProduct && (
            <div className={cn(
              "p-3 rounded-lg border text-sm",
              status === 'NEGATIVE' ? 'bg-destructive/10 border-destructive/30' :
              status === 'LOW' ? 'bg-warning/10 border-warning/30' :
              'bg-muted border-border'
            )}>
              <p className="font-medium">Current Stock: 
                <span className={cn(
                  "ml-2",
                  status === 'NEGATIVE' && "text-destructive font-bold"
                )}>
                  {currentStock} units
                </span>
                {status !== 'OK' && (
                  <span className={cn(
                    "ml-2 text-xs px-2 py-0.5 rounded-full",
                    status === 'NEGATIVE' ? 'badge-negative' : 'badge-low'
                  )}>
                    {status}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label htmlFor="quantity" className="form-label">
                Quantity Received <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className={errors.quantity ? 'border-destructive' : ''}
              />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
            </div>
            <div className="form-group">
              <Label htmlFor="buying_price" className="form-label">Buying Price (ETB)</Label>
              <Input
                id="buying_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.buying_price ?? ''}
                onChange={(e) => setFormData({ ...formData, buying_price: parseFloat(e.target.value) || undefined })}
                placeholder="Use product default"
              />
            </div>
          </div>

          <div className="form-group">
            <Label htmlFor="supplier" className="form-label">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="e.g., BGI Ethiopia"
            />
          </div>

          <div className="form-group">
            <Label htmlFor="notes" className="form-label">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
