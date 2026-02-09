import { useMemo } from 'react';
import { Loader2, Package, ArrowDown, ArrowUp, ShoppingCart } from 'lucide-react';
import { useInventoryHistory, InventoryHistoryEntry } from '@/hooks/useInventoryHistory';
import { formatETB } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfDay, subDays, startOfWeek, subWeeks, startOfMonth } from 'date-fns';

interface InventoryHistoryTabProps {
  dateFilter: string;
}

export function InventoryHistoryTab({ dateFilter }: InventoryHistoryTabProps) {
  const { data: allEntries = [], isLoading } = useInventoryHistory();

  const entries = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;

    switch (dateFilter) {
      case 'today':
        cutoff = startOfDay(now);
        break;
      case 'yesterday':
        cutoff = startOfDay(subDays(now, 1));
        break;
      case '7days':
        cutoff = startOfDay(subDays(now, 6));
        break;
      case 'this_week':
        cutoff = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last_week':
        cutoff = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'month':
        cutoff = startOfMonth(now);
        break;
      case 'last_30_days':
        cutoff = startOfDay(subDays(now, 29));
        break;
      case 'last_90_days':
        cutoff = startOfDay(subDays(now, 89));
        break;
      default:
        cutoff = null;
    }

    if (!cutoff) return allEntries;
    return allEntries.filter(e => new Date(e.created_at) >= cutoff!);
  }, [allEntries, dateFilter]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inbound':
        return <ArrowDown className="h-4 w-4 text-success" />;
      case 'sale':
        return <ShoppingCart className="h-4 w-4 text-destructive" />;
      case 'adjustment':
        return <ArrowUp className="h-4 w-4 text-warning" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'inbound': return 'Inbound';
      case 'sale': return 'Sold';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="font-semibold text-lg">Inventory Movement History</h3>
        <p className="text-sm text-muted-foreground">All stock inbound, sales, and adjustments</p>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="data-table">
          <thead className="sticky top-0 bg-card">
            <tr>
              <th>Type</th>
              <th>Product</th>
              <th>Date & Time</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Price</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.type}-${entry.id}`}>
                <td>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(entry.type)}
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      entry.type === 'inbound' && "bg-success/10 text-success",
                      entry.type === 'sale' && "bg-destructive/10 text-destructive",
                      entry.type === 'adjustment' && "bg-warning/10 text-warning",
                    )}>
                      {getTypeLabel(entry.type)}
                    </span>
                  </div>
                </td>
                <td className="font-medium">{entry.product_name}</td>
                <td className="text-muted-foreground">
                  {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="text-right">
                  <span className={cn(
                    "font-semibold",
                    entry.type === 'inbound' && "text-success",
                    entry.type === 'sale' && "text-destructive",
                    entry.type === 'adjustment' && (entry.quantity >= 0 ? "text-success" : "text-destructive"),
                  )}>
                    {entry.type === 'inbound' ? '+' : entry.type === 'sale' ? '-' : entry.quantity >= 0 ? '+' : ''}
                    {entry.type === 'sale' ? entry.quantity : entry.quantity}
                  </span>
                </td>
                <td className="text-right currency">
                  {entry.type === 'sale' && entry.selling_price
                    ? formatETB(entry.selling_price)
                    : entry.buying_price
                    ? formatETB(entry.buying_price)
                    : '—'}
                </td>
                <td className="text-muted-foreground text-sm max-w-[200px] truncate">
                  {entry.reason || entry.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No inventory movements found</p>
          <p className="text-sm">Try selecting a different date range</p>
        </div>
      )}
    </div>
  );
}
