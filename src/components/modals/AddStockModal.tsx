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

interface AddStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  selectedProduct?: Product | null;
}

export function AddStockModal({ 
  open, 
  onOpenChange, 
  products, 
  selectedProduct,
}: AddStockModalProps) {
  const { addStockEntry } = useStockEntries();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [buyingPrice, setBuyingPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
      setBuyingPrice(selectedProduct.buying_price);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!open) {
      setProductId('');
      setQuantity(0);
      setBuyingPrice(0);
      setNotes('');
      setErrors({});
    }
  }, [open]);

  const currentProduct = products.find(p => p.id === productId);
  const currentStock = currentProduct?.current_stock ?? 0;
  const status = currentProduct ? getStockStatus(currentStock, currentProduct.reorder_level) : 'OK';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!productId) {
      newErrors.productId = 'Please select a product';
    }
    if (quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    addStockEntry.mutate({
      product_id: productId,
      quantity: quantity,
      buying_price: buyingPrice > 0 ? buyingPrice : undefined,
      type: 'inbound',
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleProductChange = (value: string) => {
    setProductId(value);
    const product = products.find(p => p.id === value);
    if (product) {
      setBuyingPrice(product.buying_price);
    }
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
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger className={errors.productId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
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
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
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
                value={buyingPrice || ''}
                onChange={(e) => setBuyingPrice(parseFloat(e.target.value) || 0)}
                placeholder="Use product default"
              />
            </div>
          </div>

          <div className="form-group">
            <Label htmlFor="notes" className="form-label">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Weekly restock from supplier"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addStockEntry.isPending}>
              {addStockEntry.isPending ? 'Adding...' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
