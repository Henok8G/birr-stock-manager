// Mock data for development - will be replaced with Lovable Cloud backend
import { Product, Sale, SaleItem, StockEntry, DashboardSummary, DailySalesData, TopSellerData } from '@/types/inventory';

// Sample products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Habesha Beer 330ml',
    sku: 'BRH-001',
    category: 'Beer',
    unit_size: '330ml',
    buying_price: 35.00,
    selling_price: 55.00,
    opening_stock: 100,
    reorder_level: 20,
    created_at: '2025-01-15T10:00:00Z',
    received: 200,
    sold: 280,
    adjustments: -5,
    current_stock: 15, // 100 + 200 - 280 - 5 = 15
  },
  {
    id: '2',
    name: 'St. George Beer 500ml',
    sku: 'BRS-002',
    category: 'Beer',
    unit_size: '500ml',
    buying_price: 40.00,
    selling_price: 65.00,
    opening_stock: 80,
    reorder_level: 15,
    created_at: '2025-01-15T10:00:00Z',
    received: 150,
    sold: 240,
    adjustments: 0,
    current_stock: -10, // NEGATIVE
  },
  {
    id: '3',
    name: 'Coca-Cola 350ml',
    sku: 'SOD-001',
    category: 'Soda',
    unit_size: '350ml',
    buying_price: 15.00,
    selling_price: 30.00,
    opening_stock: 200,
    reorder_level: 50,
    created_at: '2025-01-15T10:00:00Z',
    received: 300,
    sold: 350,
    adjustments: 10,
    current_stock: 160,
  },
  {
    id: '4',
    name: 'Ambo Water 500ml',
    sku: 'WAT-001',
    category: 'Water',
    unit_size: '500ml',
    buying_price: 10.00,
    selling_price: 25.00,
    opening_stock: 150,
    reorder_level: 30,
    created_at: '2025-01-15T10:00:00Z',
    received: 100,
    sold: 220,
    adjustments: -3,
    current_stock: 27, // LOW
  },
  {
    id: '5',
    name: 'Johnnie Walker Red',
    sku: 'ALC-001',
    category: 'Alcohol',
    unit_size: '750ml',
    buying_price: 850.00,
    selling_price: 1200.00,
    opening_stock: 12,
    reorder_level: 3,
    created_at: '2025-01-15T10:00:00Z',
    received: 6,
    sold: 20,
    adjustments: 0,
    current_stock: -2, // NEGATIVE
  },
  {
    id: '6',
    name: 'Fresh Orange Juice 1L',
    sku: 'JUI-001',
    category: 'Juice',
    unit_size: '1L',
    buying_price: 45.00,
    selling_price: 80.00,
    opening_stock: 40,
    reorder_level: 10,
    created_at: '2025-01-15T10:00:00Z',
    received: 60,
    sold: 75,
    adjustments: 5,
    current_stock: 30,
  },
];

// Dashboard summary
export const mockDashboardSummary: DashboardSummary = {
  totalProducts: mockProducts.length,
  totalUnitsInStock: mockProducts.reduce((sum, p) => sum + (p.current_stock || 0), 0),
  todayUnitsSold: 47,
  todaySalesValue: 4250.00,
  totalStockValue: mockProducts.reduce((sum, p) => sum + ((p.current_stock || 0) * p.buying_price), 0),
};

// Daily sales for chart (last 7 days)
export const mockDailySales: DailySalesData[] = [
  { date: '2025-01-28', units: 38, value: 3200 },
  { date: '2025-01-29', units: 45, value: 3850 },
  { date: '2025-01-30', units: 52, value: 4100 },
  { date: '2025-01-31', units: 41, value: 3650 },
  { date: '2025-02-01', units: 56, value: 4800 },
  { date: '2025-02-02', units: 63, value: 5200 },
  { date: '2025-02-03', units: 47, value: 4250 },
];

// Top sellers
export const mockTopSellers: TopSellerData[] = [
  { product_id: '3', product_name: 'Coca-Cola 350ml', units_sold: 85 },
  { product_id: '1', product_name: 'Habesha Beer 330ml', units_sold: 72 },
  { product_id: '2', product_name: 'St. George Beer 500ml', units_sold: 58 },
  { product_id: '4', product_name: 'Ambo Water 500ml', units_sold: 45 },
  { product_id: '6', product_name: 'Fresh Orange Juice 1L', units_sold: 32 },
];

// Recent sales
export const mockSales: Sale[] = [
  {
    id: 'S001',
    total_units: 5,
    total_value: 280.00,
    payment_type: 'Cash',
    notes: null,
    created_at: '2025-02-03T14:30:00Z',
    items: [
      { id: 'SI001', sale_id: 'S001', product_id: '1', quantity: 2, selling_price: 55.00 },
      { id: 'SI002', sale_id: 'S001', product_id: '3', quantity: 3, selling_price: 30.00 },
    ],
  },
  {
    id: 'S002',
    total_units: 3,
    total_value: 1290.00,
    payment_type: 'Card',
    notes: 'VIP customer',
    created_at: '2025-02-03T13:15:00Z',
    items: [
      { id: 'SI003', sale_id: 'S002', product_id: '5', quantity: 1, selling_price: 1200.00 },
      { id: 'SI004', sale_id: 'S002', product_id: '3', quantity: 2, selling_price: 30.00 },
    ],
  },
  {
    id: 'S003',
    total_units: 8,
    total_value: 520.00,
    payment_type: 'Cash',
    notes: null,
    created_at: '2025-02-03T11:45:00Z',
    items: [
      { id: 'SI005', sale_id: 'S003', product_id: '2', quantity: 4, selling_price: 65.00 },
      { id: 'SI006', sale_id: 'S003', product_id: '4', quantity: 4, selling_price: 25.00 },
    ],
  },
];

// Recent stock entries
export const mockStockEntries: StockEntry[] = [
  {
    id: 'SE001',
    product_id: '1',
    quantity: 50,
    buying_price: 35.00,
    type: 'inbound',
    reason: null,
    notes: 'Weekly restock from BGI',
    created_at: '2025-02-02T09:00:00Z',
  },
  {
    id: 'SE002',
    product_id: '3',
    quantity: 100,
    buying_price: 15.00,
    type: 'inbound',
    reason: null,
    notes: 'Monthly delivery',
    created_at: '2025-02-01T10:30:00Z',
  },
  {
    id: 'SE003',
    product_id: '4',
    quantity: -3,
    buying_price: null,
    type: 'adjustment',
    reason: 'Damaged bottles found',
    notes: 'Disposed per manager approval',
    created_at: '2025-01-30T16:00:00Z',
  },
];

// Get low/negative stock products
export function getLowStockProducts(): Product[] {
  return mockProducts.filter(p => {
    const current = p.current_stock || 0;
    if (current < 0) return true;
    if (p.reorder_level !== null && current <= p.reorder_level) return true;
    return false;
  });
}
