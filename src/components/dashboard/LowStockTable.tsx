import { Product, getStockStatus } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LowStockTableProps {
  products: Product[];
  onAddStock: (product: Product) => void;
}

export function LowStockTable({ products, onAddStock }: LowStockTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-foreground mb-4">Low & Negative Stock Alerts</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>✓ All products are well stocked!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="font-semibold text-lg text-foreground">Low & Negative Stock Alerts</h3>
        <p className="text-sm text-muted-foreground mt-1">{products.length} products need attention</p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th className="text-right">Current Stock</th>
              <th className="text-right">Reorder Level</th>
              <th className="text-center">Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const currentStock = product.current_stock ?? 0;
              const status = getStockStatus(currentStock, product.reorder_level);
              
              return (
                <tr 
                  key={product.id}
                  className={cn(status === 'NEGATIVE' && "stock-negative-row")}
                >
                  <td className="font-medium">{product.name}</td>
                  <td className={cn(
                    "text-right",
                    status === 'NEGATIVE' && "stock-negative"
                  )}>
                    {currentStock}
                  </td>
                  <td className="text-right text-muted-foreground">
                    {product.reorder_level ?? '—'}
                  </td>
                  <td className="text-center">
                    <span className={cn(
                      status === 'NEGATIVE' ? 'badge-negative' : 
                      status === 'LOW' ? 'badge-low' : 'badge-ok'
                    )}>
                      {status}
                    </span>
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddStock(product)}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Stock
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
