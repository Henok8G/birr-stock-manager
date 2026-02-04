import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Plus, ArrowUpDown, Package } from 'lucide-react';
import { Product, getStockStatus, formatETB } from '@/types/inventory';
import { mockStockEntries, mockSales } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ProductDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductDetailDrawer({ open, onOpenChange, product }: ProductDetailDrawerProps) {
  if (!product) return null;

  const currentStock = product.current_stock ?? 0;
  const status = getStockStatus(currentStock, product.reorder_level);

  // Get related stock entries and sales
  const relatedEntries = mockStockEntries.filter(e => e.product_id === product.id);
  const relatedSaleItems = mockSales
    .flatMap(sale => (sale.items || []).map(item => ({ ...item, sale_date: sale.created_at })))
    .filter(item => item.product_id === product.id);

  // Combine and sort timeline
  const timeline = [
    ...relatedEntries.map(e => ({
      type: e.type === 'inbound' ? 'Received' : 'Adjustment',
      date: e.created_at,
      quantity: e.quantity,
      details: e.notes || e.reason || '',
    })),
    ...relatedSaleItems.map(item => ({
      type: 'Sold',
      date: item.sale_date,
      quantity: -item.quantity,
      details: `Sale ${item.sale_id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl">{product.name}</p>
              {product.sku && <p className="text-sm text-muted-foreground">{product.sku}</p>}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Product Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{product.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Unit Size</p>
              <p className="font-medium">{product.unit_size || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Buying Price</p>
              <p className="font-medium currency">{formatETB(product.buying_price)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Selling Price</p>
              <p className="font-medium currency">{formatETB(product.selling_price)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reorder Level</p>
              <p className="font-medium">{product.reorder_level ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(product.created_at), 'MMM d, yyyy')}</p>
            </div>
          </div>

          <Separator />

          {/* Stock Breakdown */}
          <div>
            <h3 className="font-semibold mb-3">Stock Breakdown</h3>
            <div className={cn(
              "rounded-lg border p-4",
              status === 'NEGATIVE' ? 'bg-destructive/5 border-destructive/30' :
              status === 'LOW' ? 'bg-warning/5 border-warning/30' :
              'bg-success/5 border-success/30'
            )}>
              <div className="text-center mb-4">
                <p className={cn(
                  "text-3xl font-bold",
                  status === 'NEGATIVE' && "text-destructive",
                  status === 'LOW' && "text-warning",
                  status === 'OK' && "text-success"
                )}>
                  {currentStock}
                </p>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                {status !== 'OK' && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full mt-2 inline-block",
                    status === 'NEGATIVE' ? 'badge-negative' : 'badge-low'
                  )}>
                    {status}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="p-2 bg-background rounded">
                  <p className="font-semibold">{product.opening_stock}</p>
                  <p className="text-xs text-muted-foreground">Opening</p>
                </div>
                <div className="p-2 bg-background rounded">
                  <p className="font-semibold text-success">+{product.received || 0}</p>
                  <p className="text-xs text-muted-foreground">Received</p>
                </div>
                <div className="p-2 bg-background rounded">
                  <p className="font-semibold text-destructive">−{product.sold || 0}</p>
                  <p className="text-xs text-muted-foreground">Sold</p>
                </div>
                <div className="p-2 bg-background rounded">
                  <p className={cn(
                    "font-semibold",
                    (product.adjustments ?? 0) >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {(product.adjustments ?? 0) >= 0 ? '+' : ''}{product.adjustments || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Adj.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Movement Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent Movement</h3>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <Download className="h-3 w-3" />
                Export History
              </Button>
            </div>
            
            {timeline.length > 0 ? (
              <div className="space-y-2">
                {timeline.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.type === 'Received' && "bg-success",
                      item.type === 'Sold' && "bg-destructive",
                      item.type === 'Adjustment' && "bg-warning"
                    )} />
                    <div className="flex-1">
                      <p className="font-medium">{item.type}</p>
                      <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        item.quantity > 0 && "text-success",
                        item.quantity < 0 && "text-destructive"
                      )}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No movement history yet
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1 gap-2">
              <Plus className="h-4 w-4" />
              Add Stock
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Adjust
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
