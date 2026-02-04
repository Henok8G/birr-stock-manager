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
import { Product, getStockStatus } from '@/types/inventory';
import { useStockEntries } from '@/hooks/useStockEntries';
import { cn } from '@/lib/utils';

interface AdjustStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  selectedProduct?: Product | null;
}

export function AdjustStockModal({ 
  open, 
  onOpenChange, 
  products, 
  selectedProduct,
}: AdjustStockModalProps) {
  const { addStockEntry } = useStockEntries();
  const [productId, setProductId] = useState('');
  const [changeValue, setChangeValue] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!open) {
      setProductId('');
      setChangeValue(0);
      setReason('');
      setNotes('');
      setErrors({});
    }
  }, [open]);

  const currentProduct = products.find(p => p.id === productId);
  const currentStock = currentProduct?.current_stock ?? 0;
  const newStock = currentStock + changeValue;
  const status = getStockStatus(currentStock, currentProduct?.reorder_level ?? null);
  const newStatus = getStockStatus(newStock, currentProduct?.reorder_level ?? null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!productId) {
      newErrors.productId = 'Please select a product';
    }
    if (changeValue === 0) {
      newErrors.changeValue = 'Adjustment value cannot be 0';
    }
    if (!reason.trim()) {
      newErrors.reason = 'Reason is required for adjustments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    addStockEntry.mutate({
      product_id: productId,
      quantity: changeValue,
      type: 'adjustment',
      reason: reason,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
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
              value={productId} 
              onValueChange={setProductId}
            >
              <SelectTrigger className={errors.productId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stock: {product.current_stock ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && <p className="text-sm text-destructive">{errors.productId}</p>}
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
              value={changeValue || ''}
              onChange={(e) => setChangeValue(parseInt(e.target.value) || 0)}
              className={errors.changeValue ? 'border-destructive' : ''}
              placeholder="e.g., +10 or -5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use positive numbers to add, negative to subtract
            </p>
            {errors.changeValue && <p className="text-sm text-destructive">{errors.changeValue}</p>}
          </div>

          {currentProduct && changeValue !== 0 && (
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
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Damaged goods, Inventory count correction"
              className={errors.reason ? 'border-destructive' : ''}
            />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
          </div>

          <div className="form-group">
            <Label htmlFor="adjust-notes" className="form-label">Notes</Label>
            <Textarea
              id="adjust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addStockEntry.isPending}>
              {addStockEntry.isPending ? 'Adjusting...' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
