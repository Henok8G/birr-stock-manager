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

          {/* Movement Timeline placeholder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent Movement</h3>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <Download className="h-3 w-3" />
                Export History
              </Button>
            </div>
            
            <div className="text-center py-6 text-muted-foreground text-sm">
              Movement history will be loaded from database
            </div>
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
