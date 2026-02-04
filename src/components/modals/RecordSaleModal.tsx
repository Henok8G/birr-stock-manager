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
import { Plus, Trash2 } from 'lucide-react';
import { Product, PaymentType, SaleLineItem, formatETB, getStockStatus } from '@/types/inventory';
import { useSales } from '@/hooks/useSales';
import { cn } from '@/lib/utils';

interface RecordSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSuccess?: () => void;
}

const paymentTypes: PaymentType[] = ['Cash', 'Card', 'Other'];

export function RecordSaleModal({ open, onOpenChange, products, onSuccess }: RecordSaleModalProps) {
  const { createSale } = useSales('today');
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([
    { id: '1', product_id: '', product_name: '', quantity: 1, selling_price: 0, current_stock: 0 }
  ]);
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [notes, setNotes] = useState('');

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { 
        id: Date.now().toString(), 
        product_id: '', 
        product_name: '', 
        quantity: 1, 
        selling_price: 0,
        current_stock: 0 
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, updates: Partial<SaleLineItem>) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleProductSelect = (lineId: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateLineItem(lineId, {
        product_id: productId,
        product_name: product.name,
        selling_price: product.selling_price,
        current_stock: product.current_stock ?? 0,
      });
    }
  };

  const totalUnits = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = lineItems.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidItems = lineItems.filter(item => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0) {
      return;
    }

    createSale.mutate({
      items: lineItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        selling_price: item.selling_price,
      })),
      payment_type: paymentType,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
        setLineItems([{ id: '1', product_id: '', product_name: '', quantity: 1, selling_price: 0, current_stock: 0 }]);
        setPaymentType('Cash');
        setNotes('');
      },
    });
  };

  const handleClear = () => {
    setLineItems([{ id: '1', product_id: '', product_name: '', quantity: 1, selling_price: 0, current_stock: 0 }]);
    setPaymentType('Cash');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="modal-header">Record Sale</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Line Items */}
          <div className="space-y-3">
            <Label className="form-label">Sale Items</Label>
            {lineItems.map((item) => {
              const product = products.find(p => p.id === item.product_id);
              const status = product ? getStockStatus(item.current_stock, product.reorder_level) : 'OK';
              
              return (
                <div key={item.id} className="pos-line-item">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <Select 
                        value={item.product_id} 
                        onValueChange={(value) => handleProductSelect(item.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.product_id && (
                        <p className={cn(
                          "text-xs mt-1",
                          status === 'NEGATIVE' ? 'text-destructive' :
                          status === 'LOW' ? 'text-warning' :
                          'text-muted-foreground'
                        )}>
                          Stock: {item.current_stock}
                          {status !== 'OK' && ` (${status})`}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                        placeholder="Qty"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.selling_price}
                        onChange={(e) => updateLineItem(item.id, { selling_price: parseFloat(e.target.value) || 0 })}
                        placeholder="Price"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        = {formatETB(item.quantity * item.selling_price)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" onClick={addLineItem} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>

          {/* Payment Type */}
          <div className="form-group">
            <Label className="form-label">Payment Type</Label>
            <Select value={paymentType} onValueChange={(value: PaymentType) => setPaymentType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="form-group">
            <Label htmlFor="sale-notes" className="form-label">Notes</Label>
            <Textarea
              id="sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Units:</span>
              <span className="font-medium">{totalUnits}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-gradient-gold">{formatETB(totalValue)}</span>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSale.isPending}>
                {createSale.isPending ? 'Recording...' : 'Record Sale'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
