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
import { Product, StockAdjustmentFormData, getStockStatus } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AdjustStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  selectedProduct?: Product | null;
  onSuccess?: (adjustment: StockAdjustmentFormData) => void;
}

export function AdjustStockModal({ 
  open, 
  onOpenChange, 
  products, 
  selectedProduct,
  onSuccess 
}: AdjustStockModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StockAdjustmentFormData>({
    product_id: '',
    change_value: 0,
    reason: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof StockAdjustmentFormData, string>>>({});

  useEffect(() => {
    if (selectedProduct) {
      setFormData({
        ...formData,
        product_id: selectedProduct.id,
      });
    } else {
      setFormData({
        product_id: '',
        change_value: 0,
        reason: '',
        notes: '',
      });
    }
  }, [selectedProduct, open]);

  const currentProduct = products.find(p => p.id === formData.product_id);
  const currentStock = currentProduct?.current_stock ?? 0;
  const newStock = currentStock + formData.change_value;
  const status = getStockStatus(currentStock, currentProduct?.reorder_level ?? null);
  const newStatus = getStockStatus(newStock, currentProduct?.reorder_level ?? null);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof StockAdjustmentFormData, string>> = {};
    
    if (!formData.product_id) {
      newErrors.product_id = 'Please select a product';
    }
    if (formData.change_value === 0) {
      newErrors.change_value = 'Adjustment value cannot be 0';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required for adjustments';
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
    const changeText = formData.change_value > 0 ? `+${formData.change_value}` : formData.change_value;
    
    toast({
      title: "Stock Adjusted",
      description: `${productName}: ${changeText} units. New stock: ${newStock}`,
    });

    if (newStock < 0) {
      toast({
        title: "Negative Stock Warning",
        description: `${productName} now has NEGATIVE stock: ${newStock}`,
        variant: "destructive",
      });
    }
    
    onSuccess?.(formData);
    onOpenChange(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="modal-header">Adjust Stock</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <Label htmlFor="adjust-product" className="form-label">
              Product <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
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
              </p>
            </div>
          )}

          <div className="form-group">
            <Label htmlFor="change_value" className="form-label">
              Adjustment Value <span className="text-destructive">*</span>
            </Label>
            <Input
              id="change_value"
              type="number"
              value={formData.change_value || ''}
              onChange={(e) => setFormData({ ...formData, change_value: parseInt(e.target.value) || 0 })}
              className={errors.change_value ? 'border-destructive' : ''}
              placeholder="e.g., +10 or -5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use positive numbers to add, negative to subtract
            </p>
            {errors.change_value && <p className="text-sm text-destructive">{errors.change_value}</p>}
          </div>

          {currentProduct && formData.change_value !== 0 && (
            <div className={cn(
              "p-3 rounded-lg border text-sm",
              newStatus === 'NEGATIVE' ? 'bg-destructive/10 border-destructive/30' :
              newStatus === 'LOW' ? 'bg-warning/10 border-warning/30' :
              'bg-success/10 border-success/30'
            )}>
              <p className="font-medium">
                New Stock: 
                <span className={cn(
                  "ml-2",
                  newStatus === 'NEGATIVE' && "text-destructive font-bold",
                  newStatus === 'LOW' && "text-warning font-bold",
                  newStatus === 'OK' && "text-success font-bold"
                )}>
                  {newStock} units
                </span>
                {newStatus !== 'OK' && (
                  <span className={cn(
                    "ml-2 text-xs px-2 py-0.5 rounded-full",
                    newStatus === 'NEGATIVE' ? 'badge-negative' : 'badge-low'
                  )}>
                    {newStatus}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="form-group">
            <Label htmlFor="reason" className="form-label">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Damaged goods, Inventory count correction"
              className={errors.reason ? 'border-destructive' : ''}
            />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
          </div>

          <div className="form-group">
            <Label htmlFor="adjust-notes" className="form-label">Notes</Label>
            <Textarea
              id="adjust-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adjusting...' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
