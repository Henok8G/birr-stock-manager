import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  Trash2,
  Package,
  ArrowUpDown,
  ChevronDown,
  Boxes,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AddProductModal } from '@/components/modals/AddProductModal';
import { AddStockModal } from '@/components/modals/AddStockModal';
import { AdjustStockModal } from '@/components/modals/AdjustStockModal';
import { ProductDetailDrawer } from '@/components/inventory/ProductDetailDrawer';
import { useProducts } from '@/hooks/useProducts';
import { Product, getStockStatus, formatETB, ProductCategory } from '@/types/inventory';
import { cn } from '@/lib/utils';

const categories: ProductCategory[] = ['Beer', 'Soda', 'Water', 'Alcohol', 'Juice', 'Other'];

export default function Inventory() {
  const { products, isLoading, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortField, setSortField] = useState<'current_stock' | 'name' | 'category'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesLowStock = !lowStockOnly || 
        (product.current_stock ?? 0) < 0 || 
        (product.reorder_level !== null && (product.current_stock ?? 0) <= product.reorder_level);
      
      return matchesSearch && matchesCategory && matchesLowStock;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'current_stock') {
        comparison = (a.current_stock ?? 0) - (b.current_stock ?? 0);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddStock = (product: Product) => {
    setSelectedProduct(product);
    setIsAddStockOpen(true);
  };

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setIsAdjustStockOpen(true);
  };

  const handleViewDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailDrawerOpen(true);
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      deleteProduct.mutate(productToDelete.id);
      setProductToDelete(null);
    }
  };

  // Summary stats
  const totalProducts = filteredProducts.length;
  const totalUnits = filteredProducts.reduce((sum, p) => sum + (p.current_stock ?? 0), 0);
  const negativeCount = filteredProducts.filter(p => (p.current_stock ?? 0) < 0).length;

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage products and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddProductOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="low-stock-filter"
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
            />
            <Label htmlFor="low-stock-filter" className="text-sm whitespace-nowrap">
              Low/Negative only
            </Label>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <span><strong>{totalProducts}</strong> products</span>
          <span><strong>{totalUnits}</strong> total units</span>
          {negativeCount > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <strong>{negativeCount}</strong> negative
            </span>
          )}
        </div>
      </div>

      {/* Stock Formula Helper */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <strong>Stock Formula:</strong> Current Stock = Opening Stock + Received − Sold + Adjustments
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer" onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">
                    Product
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="cursor-pointer" onClick={() => handleSort('category')}>
                  <span className="flex items-center gap-1">
                    Category
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-right">Buying (ETB)</th>
                <th className="text-right">Selling (ETB)</th>
                <th className="text-right">Opening</th>
                <th className="text-right">Received</th>
                <th className="text-right">Sold</th>
                <th className="text-right">Adj.</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort('current_stock')}>
                  <span className="flex items-center justify-end gap-1">
                    Current
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-right">Reorder</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const currentStock = product.current_stock ?? 0;
                const status = getStockStatus(currentStock, product.reorder_level);
                
                return (
                  <tr 
                    key={product.id}
                    className={cn(status === 'NEGATIVE' && "stock-negative-row")}
                  >
                    <td>
                      <button 
                        onClick={() => handleViewDetail(product)}
                        className="font-medium text-primary hover:underline text-left"
                      >
                        {product.name}
                      </button>
                    </td>
                    <td>{product.category}</td>
                    <td className="text-right currency">{formatETB(product.buying_price)}</td>
                    <td className="text-right currency">{formatETB(product.selling_price)}</td>
                    <td className="text-right">{product.opening_stock}</td>
                    <td className="text-right text-success">{product.received || 0}</td>
                    <td className="text-right text-destructive">{product.sold || 0}</td>
                    <td className="text-right">
                      <span className={cn(
                        (product.adjustments ?? 0) < 0 && "text-destructive",
                        (product.adjustments ?? 0) > 0 && "text-success"
                      )}>
                        {(product.adjustments ?? 0) > 0 ? '+' : ''}{product.adjustments || 0}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={cn(
                        "font-semibold",
                        status === 'NEGATIVE' && "stock-negative"
                      )}>
                        {currentStock}
                      </span>
                      {status !== 'OK' && (
                        <span className={cn(
                          "ml-2",
                          status === 'NEGATIVE' ? 'badge-negative' : 'badge-low'
                        )}>
                          {status}
                        </span>
                      )}
                    </td>
                    <td className="text-right text-muted-foreground">
                      {product.reorder_level ?? '—'}
                    </td>
                    <td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1">
                            Actions <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAddStock(product)}>
                            <Boxes className="h-4 w-4 mr-2" />
                            Add Inbound
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAdjustStock(product)}>
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                            <Package className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setProductToDelete(product)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No products found</p>
            <p className="text-sm">Try adjusting your filters or add a new product</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddProductModal 
        open={isAddProductOpen} 
        onOpenChange={setIsAddProductOpen}
      />
      <AddStockModal 
        open={isAddStockOpen} 
        onOpenChange={(open) => { setIsAddStockOpen(open); if (!open) setSelectedProduct(null); }}
        products={products}
        selectedProduct={selectedProduct}
      />
      <AdjustStockModal 
        open={isAdjustStockOpen} 
        onOpenChange={(open) => { setIsAdjustStockOpen(open); if (!open) setSelectedProduct(null); }}
        products={products}
        selectedProduct={selectedProduct}
      />
      <ProductDetailDrawer
        open={isDetailDrawerOpen}
        onOpenChange={(open) => { setIsDetailDrawerOpen(open); if (!open) setSelectedProduct(null); }}
        product={selectedProduct}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{productToDelete?.name}</strong>? 
              This action cannot be undone. Any sales history associated with this product will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
