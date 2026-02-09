import { useState, useMemo } from 'react';
import { 
  Calendar,
  TrendingUp,
  BarChart3,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShoppingCart,
  Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useProducts } from '@/hooks/useProducts';
import { useSales, DateFilterType, getDateFilterLabel, Sale } from '@/hooks/useSales';
import { formatETB } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InventoryHistoryTab } from '@/components/history/InventoryHistoryTab';
import { format, parseISO, startOfDay, eachDayOfInterval, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';

// Extended date filters for history
type HistoryDateFilterType = DateFilterType | 'last_30_days' | 'last_90_days';

const dateFilterOptions: { value: HistoryDateFilterType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

export default function History() {
  const [dateFilter, setDateFilter] = useState<HistoryDateFilterType>('7days');
  const { products, isLoading: productsLoading } = useProducts();
  
  // For extended filters, we use 'all' and filter client-side
  const queryFilter: DateFilterType = ['last_30_days', 'last_90_days'].includes(dateFilter) 
    ? 'all' 
    : dateFilter as DateFilterType;
  
  const { sales: allSales, isLoading: salesLoading } = useSales(queryFilter);

  // Selected sale for detail view
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Filter sales based on extended date range
  const sales = useMemo(() => {
    if (dateFilter === 'last_30_days') {
      const cutoff = startOfDay(subDays(new Date(), 30));
      return allSales.filter(s => new Date(s.created_at) >= cutoff);
    }
    if (dateFilter === 'last_90_days') {
      const cutoff = startOfDay(subDays(new Date(), 90));
      return allSales.filter(s => new Date(s.created_at) >= cutoff);
    }
    return allSales;
  }, [allSales, dateFilter]);

  // Calculate chart data - aggregate by day
  const chartData = useMemo(() => {
    if (sales.length === 0) return [];

    // Determine date range for the chart
    const now = new Date();
    let startDate: Date;
    
    switch (dateFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        break;
      case '7days':
        startDate = startOfDay(subDays(now, 6));
        break;
      case 'this_week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last_week':
        startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'last_30_days':
        startDate = startOfDay(subDays(now, 29));
        break;
      case 'last_90_days':
        startDate = startOfDay(subDays(now, 89));
        break;
      default:
        // For 'all', use the earliest sale date or last 30 days
        const earliest = sales.length > 0 
          ? new Date(Math.min(...sales.map(s => new Date(s.created_at).getTime())))
          : subDays(now, 30);
        startDate = startOfDay(earliest);
    }

    // Generate all days in the range
    const days = eachDayOfInterval({ start: startDate, end: now });
    
    // Aggregate sales by day
    const salesByDay = new Map<string, { units: number; value: number }>();
    
    sales.forEach(sale => {
      if (sale.is_reversed || sale.total_units < 0) return; // Skip reversals
      
      const dateKey = format(parseISO(sale.created_at), 'yyyy-MM-dd');
      const existing = salesByDay.get(dateKey) || { units: 0, value: 0 };
      salesByDay.set(dateKey, {
        units: existing.units + sale.total_units,
        value: existing.value + sale.total_value,
      });
    });

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const data = salesByDay.get(dateKey) || { units: 0, value: 0 };
      return {
        date: dateKey,
        displayDate: format(day, 'MMM d'),
        units: data.units,
        value: data.value,
      };
    });
  }, [sales, dateFilter]);

  // Calculate top 5 sellers for the period
  const topSellers = useMemo(() => {
    const productSales = new Map<string, { units: number; value: number }>();
    
    sales.forEach(sale => {
      if (sale.is_reversed || sale.total_units < 0) return;
      
      sale.items?.forEach(item => {
        const existing = productSales.get(item.product_id) || { units: 0, value: 0 };
        productSales.set(item.product_id, {
          units: existing.units + item.quantity,
          value: existing.value + (item.quantity * item.selling_price),
        });
      });
    });

    const sorted = Array.from(productSales.entries())
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return {
          id: productId,
          name: product?.name || 'Unknown',
          shortName: product?.name?.split(' ').slice(0, 2).join(' ') || 'Unknown',
          ...data,
        };
      })
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return sorted;
  }, [sales, products]);

  // Summary stats
  const summary = useMemo(() => {
    const validSales = sales.filter(s => !s.is_reversed && s.total_units > 0);
    return {
      totalUnits: validSales.reduce((sum, s) => sum + s.total_units, 0),
      totalValue: validSales.reduce((sum, s) => sum + s.total_value, 0),
      transactionCount: validSales.length,
    };
  }, [sales]);

  const isLoading = productsLoading || salesLoading;

  const getItemsSummary = (sale: Sale) => {
    if (!sale.items) return '';
    return sale.items.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return `${item.quantity}× ${product?.name.split(' ')[0] || 'Item'}`;
    }).join(', ');
  };

  if (isLoading && sales.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">History & Analytics</h1>
          <p className="text-muted-foreground">View sales trends and performance data</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">Date Range:</Label>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as HistoryDateFilterType)}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Sales History
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Boxes className="h-4 w-4" />
            Inventory History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi-card">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalUnits.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Units Sold</p>
                </div>
              </div>
            </div>
            <div className="kpi-card kpi-card-accent">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/20">
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient-gold">{formatETB(summary.totalValue)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                  <ShoppingCart className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.transactionCount}</p>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Units Sold Line Chart */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Units Sold</h3>
              </div>
              <div className="h-[280px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [value, 'Units']}
                      />
                      <Line type="monotone" dataKey="units" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No data for selected period</div>
                )}
              </div>
            </div>

            {/* Sales Value Line Chart */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-lg">Sales Value (ETB)</h3>
              </div>
              <div className="h-[280px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [formatETB(value), 'Revenue']}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No data for selected period</div>
                )}
              </div>
            </div>

            {/* Top 5 Sellers Bar Chart */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-success" />
                <h3 className="font-semibold text-lg">Top 5 Sellers</h3>
              </div>
              <div className="h-[300px]">
                {topSellers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSellers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="shortName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'units') return [value, 'Units Sold'];
                          return [formatETB(value), 'Revenue'];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="units" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Units" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No data for selected period</div>
                )}
              </div>
            </div>
          </div>

          {/* Sales History Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-lg">Transaction History</h3>
              <p className="text-sm text-muted-foreground">Click a row to view details</p>
            </div>
            
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <table className="data-table">
                  <thead className="sticky top-0 bg-card">
                    <tr>
                      <th>Items</th>
                      <th>Date & Time</th>
                      <th>Payment</th>
                      <th className="text-right">Units</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.filter(s => !s.is_reversed && s.total_units > 0).map((sale) => (
                      <tr 
                        key={sale.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <td className="font-medium max-w-[250px]">
                          <span className="truncate block">{getItemsSummary(sale)}</span>
                        </td>
                        <td className="text-muted-foreground">
                          {format(new Date(sale.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-muted">
                            {sale.payment_type || 'N/A'}
                          </span>
                        </td>
                        <td className="text-right">{sale.total_units}</td>
                        <td className="text-right currency font-medium">
                          {formatETB(sale.total_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!isLoading && sales.filter(s => !s.is_reversed && s.total_units > 0).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No transactions found</p>
                  <p className="text-sm">Try selecting a different date range</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryHistoryTab dateFilter={dateFilter} />
        </TabsContent>
      </Tabs>

      {/* Sale Detail Modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {format(new Date(selectedSale.created_at), 'EEEE, MMMM d, yyyy HH:mm')}
              </div>
              
              <div className="space-y-2">
                <Label className="form-label">Items Sold</Label>
                {selectedSale.items?.map((item, idx) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <div key={idx} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>{product?.name || 'Unknown Product'}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} × {formatETB(item.selling_price)} = {formatETB(item.quantity * item.selling_price)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Type</span>
                  <span>{selectedSale.payment_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-medium">{selectedSale.total_units}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Value</span>
                  <span className="text-gradient-gold">{formatETB(selectedSale.total_value)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div className="p-3 bg-muted/50 rounded text-sm">
                  <p className="text-muted-foreground">Notes:</p>
                  <p>{selectedSale.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
