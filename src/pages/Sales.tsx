import { useState } from 'react';
import { 
  Search, 
  Calendar,
  Download,
  Eye,
  RotateCcw,
  ShoppingCart,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { mockProducts, mockSales } from '@/data/mockData';
import { Sale, Product, PaymentType, SaleLineItem, formatETB, getStockStatus } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const paymentTypes: PaymentType[] = ['Cash', 'Card', 'Other'];

export default function Sales() {
  const { toast } = useToast();
  const [products] = useState<Product[]>(mockProducts);
  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('today');

  // Sale entry form
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([
    { id: '1', product_id: '', product_name: '', quantity: 1, selling_price: 0, current_stock: 0 }
  ]);
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View sale modal
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  // Reversal dialog
  const [reverseSale, setReverseSale] = useState<Sale | null>(null);
  const [reverseConfirmText, setReverseConfirmText] = useState('');

  // Line item management
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

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidItems = lineItems.filter(item => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please ensure all items have a product selected and quantity > 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for negative stock warnings
    const negativeWarnings = lineItems.filter(item => {
      const newStock = item.current_stock - item.quantity;
      return newStock < 0;
    });

    // Create new sale
    const newSale: Sale = {
      id: `S${(sales.length + 1).toString().padStart(3, '0')}`,
      total_units: totalUnits,
      total_value: totalValue,
      payment_type: paymentType,
      notes: notes || null,
      created_at: new Date().toISOString(),
      items: lineItems.map((item, idx) => ({
        id: `SI${Date.now()}-${idx}`,
        sale_id: `S${(sales.length + 1).toString().padStart(3, '0')}`,
        product_id: item.product_id,
        quantity: item.quantity,
        selling_price: item.selling_price,
      })),
    };

    setSales([newSale, ...sales]);

    if (negativeWarnings.length > 0) {
      negativeWarnings.forEach(item => {
        const newStock = item.current_stock - item.quantity;
        toast({
          title: "Negative Stock Warning",
          description: `${item.product_name} now NEGATIVE: ${newStock}`,
          variant: "destructive",
        });
      });
    }

    toast({
      title: "Sale Recorded",
      description: `Sale of ${totalUnits} units for ${formatETB(totalValue)} recorded successfully.`,
    });
    
    // Reset form
    setLineItems([{ id: '1', product_id: '', product_name: '', quantity: 1, selling_price: 0, current_stock: 0 }]);
    setPaymentType('Cash');
    setNotes('');
    setIsSubmitting(false);
  };

  const handleClear = () => {
    setLineItems([{ id: '1', product_id: '', product_name: '', quantity: 1, selling_price: 0, current_stock: 0 }]);
    setPaymentType('Cash');
    setNotes('');
  };

  const handleReverseSale = () => {
    if (reverseSale && reverseConfirmText === 'CONFIRM') {
      setSales(sales.map(s => 
        s.id === reverseSale.id ? { ...s, is_reversed: true } : s
      ));
      toast({
        title: "Sale Reversed",
        description: `Sale ${reverseSale.id} has been reversed. Stock quantities have been restored.`,
      });
      setReverseSale(null);
      setReverseConfirmText('');
    }
  };

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.items?.some(item => {
      const product = products.find(p => p.id === item.product_id);
      return product?.name.toLowerCase().includes(searchQuery.toLowerCase());
    }) || sale.id.toLowerCase().includes(searchQuery.toLowerCase());

    const saleDate = new Date(sale.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = saleDate >= today;
    } else if (dateFilter === '7days') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = saleDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = saleDate >= monthAgo;
    }

    return matchesSearch && matchesDate;
  });

  const getItemsSummary = (sale: Sale) => {
    if (!sale.items) return '';
    return sale.items.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return `${item.quantity}× ${product?.name.split(' ')[0] || 'Item'}`;
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <p className="text-muted-foreground">Record sales and view history</p>
      </div>

      {/* Main content - split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Sale Entry Form */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Record Sale</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordSale} className="space-y-4">
            {/* Line Items */}
            <div className="space-y-3">
              <Label className="form-label">Sale Items</Label>
              {lineItems.map((item) => {
                const product = products.find(p => p.id === item.product_id);
                const status = product ? getStockStatus(item.current_stock, product.reorder_level) : 'OK';
                
                return (
                  <div key={item.id} className="pos-line-item">
                    <div className="flex-1 space-y-2">
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
                          "text-xs",
                          status === 'NEGATIVE' ? 'text-destructive' :
                          status === 'LOW' ? 'text-warning' :
                          'text-muted-foreground'
                        )}>
                          Stock: {item.current_stock}
                          {status !== 'OK' && ` (${status})`}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                          placeholder="Qty"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.selling_price}
                          onChange={(e) => updateLineItem(item.id, { selling_price: parseFloat(e.target.value) || 0 })}
                          placeholder="Price"
                        />
                      </div>
                      <p className="text-xs text-right text-muted-foreground">
                        Line total: {formatETB(item.quantity * item.selling_price)}
                      </p>
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
                <SelectTrigger>
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
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg p-4 space-y-2 border border-accent/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Units:</span>
                <span className="font-medium">{totalUnits}</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span className="text-gradient-gold">{formatETB(totalValue)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClear} className="flex-1">
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
                <DollarSign className="h-4 w-4" />
                {isSubmitting ? 'Recording...' : 'Record Sale'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right: Sales History */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Sales History</h2>
              <Button variant="ghost" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="data-table">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th>Sale ID</th>
                  <th>Date & Time</th>
                  <th>Items</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr 
                    key={sale.id}
                    className={cn(sale.is_reversed && "opacity-50")}
                  >
                    <td className="font-medium">
                      {sale.id}
                      {sale.is_reversed && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          REVERSED
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground">
                      {format(new Date(sale.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="text-sm max-w-[150px] truncate">
                      {getItemsSummary(sale)}
                    </td>
                    <td className="text-right">{sale.total_units}</td>
                    <td className="text-right currency font-medium">
                      {formatETB(sale.total_value)}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setViewingSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!sale.is_reversed && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setReverseSale(sale)}
                            className="text-destructive hover:text-destructive"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSales.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No sales found</p>
                <p className="text-sm">Record a sale to see it here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Sale Modal */}
      <Dialog open={!!viewingSale} onOpenChange={() => setViewingSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Details - {viewingSale?.id}</DialogTitle>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {format(new Date(viewingSale.created_at), 'EEEE, MMMM d, yyyy HH:mm')}
              </div>
              
              <div className="space-y-2">
                <Label className="form-label">Items</Label>
                {viewingSale.items?.map((item, idx) => {
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
                  <span>{viewingSale.payment_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-medium">{viewingSale.total_units}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Value</span>
                  <span className="text-gradient-gold">{formatETB(viewingSale.total_value)}</span>
                </div>
              </div>

              {viewingSale.notes && (
                <div className="p-3 bg-muted/50 rounded text-sm">
                  <p className="text-muted-foreground">Notes:</p>
                  <p>{viewingSale.notes}</p>
                </div>
              )}

              {!viewingSale.is_reversed && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 text-destructive"
                  onClick={() => { setViewingSale(null); setReverseSale(viewingSale); }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reverse This Sale
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reverse Sale Confirmation */}
      <AlertDialog open={!!reverseSale} onOpenChange={() => { setReverseSale(null); setReverseConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse Sale {reverseSale?.id}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Reversing will add the sold quantities back to stock. This action creates a reversal record and is auditable.
              </p>
              <p className="font-medium">
                Sale total: {reverseSale && formatETB(reverseSale.total_value)}
              </p>
              <div className="mt-4">
                <Label htmlFor="confirm-text" className="text-sm">
                  Type <strong>CONFIRM</strong> to proceed:
                </Label>
                <Input
                  id="confirm-text"
                  value={reverseConfirmText}
                  onChange={(e) => setReverseConfirmText(e.target.value)}
                  className="mt-2"
                  placeholder="CONFIRM"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReverseSale}
              disabled={reverseConfirmText !== 'CONFIRM'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reverse Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
