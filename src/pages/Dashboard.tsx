import { useState } from 'react';
import { 
  Package, 
  Boxes, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  Plus,
  ClipboardList,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopSellersChart } from '@/components/dashboard/TopSellersChart';
import { LowStockTable } from '@/components/dashboard/LowStockTable';
import { AddProductModal } from '@/components/modals/AddProductModal';
import { AddStockModal } from '@/components/modals/AddStockModal';
import { RecordSaleModal } from '@/components/modals/RecordSaleModal';
import { 
  mockDashboardSummary, 
  mockDailySales, 
  mockTopSellers,
  getLowStockProducts,
  mockProducts
} from '@/data/mockData';
import { formatETB, Product } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const lowStockProducts = getLowStockProducts();
  const summary = mockDashboardSummary;

  const handleAddStock = (product: Product) => {
    setSelectedProduct(product);
    setIsAddStockOpen(true);
  };

  const handleExportSnapshot = () => {
    toast({
      title: "Export Started",
      description: "Dashboard snapshot is being generated as PDF...",
    });
    // PDF export would be implemented with backend
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your beverage inventory</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsAddProductOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
          <Button variant="outline" onClick={() => { setSelectedProduct(null); setIsAddStockOpen(true); }} className="gap-2">
            <Boxes className="h-4 w-4" />
            Add Stock
          </Button>
          <Button variant="outline" onClick={() => setIsRecordSaleOpen(true)} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Record Sale
          </Button>
          <Button variant="ghost" onClick={handleExportSnapshot} className="gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Products"
          value={summary.totalProducts}
          icon={Package}
        />
        <KPICard
          title="Total Units In Stock"
          value={summary.totalUnitsInStock.toLocaleString()}
          icon={Boxes}
          variant={summary.totalUnitsInStock < 0 ? 'negative' : 'default'}
        />
        <KPICard
          title="Today Units Sold"
          value={summary.todayUnitsSold}
          icon={ShoppingBag}
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="Today Sales Value"
          value={formatETB(summary.todaySalesValue)}
          icon={DollarSign}
          variant="accent"
          trend={{ value: 8, isPositive: true }}
        />
        <KPICard
          title="Total Stock Value"
          value={formatETB(summary.totalStockValue)}
          icon={TrendingUp}
          tooltip="Sum of (current_stock × buying_price) for all products"
          variant={summary.totalStockValue < 0 ? 'negative' : 'default'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart 
          data={mockDailySales} 
          dataKey="units" 
          title="Daily Units Sold (Last 7 Days)" 
        />
        <TopSellersChart data={mockTopSellers} />
      </div>

      {/* Low Stock Table */}
      <LowStockTable 
        products={lowStockProducts} 
        onAddStock={handleAddStock} 
      />

      {/* Modals */}
      <AddProductModal 
        open={isAddProductOpen} 
        onOpenChange={setIsAddProductOpen}
      />
      <AddStockModal 
        open={isAddStockOpen} 
        onOpenChange={setIsAddStockOpen}
        products={mockProducts}
        selectedProduct={selectedProduct}
      />
      <RecordSaleModal 
        open={isRecordSaleOpen} 
        onOpenChange={setIsRecordSaleOpen}
        products={mockProducts}
      />
    </div>
  );
}
