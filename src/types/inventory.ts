// Core types for Restaurant Beverage Inventory System

export type ProductCategory = 'Beer' | 'Soda' | 'Water' | 'Alcohol' | 'Juice' | 'Other';
export type PaymentType = 'Cash' | 'Card' | 'Other';
export type StockEntryType = 'inbound' | 'adjustment';
export type StockStatus = 'NEGATIVE' | 'LOW' | 'OK';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'Owner' | 'Manager';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  buying_price: number;
  selling_price: number;
  opening_stock: number;
  reorder_level: number | null;
  created_at: string;
  updated_at?: string;
  // Computed fields
  received?: number;
  sold?: number;
  adjustments?: number;
  current_stock?: number;
}

export interface StockEntry {
  id: string;
  product_id: string;
  quantity: number;
  buying_price: number | null;
  type: StockEntryType;
  reason: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  product?: Product;
}

export interface Sale {
  id: string;
  total_units: number;
  total_value: number;
  payment_type: PaymentType | null;
  notes: string | null;
  created_at: string;
  is_reversed?: boolean;
  reversed_sale_id?: string | null;
  // Joined data
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  selling_price: number;
  // Joined data
  product?: Product;
}

export interface AuditLog {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  details: string | null;
  user_id: string | null;
  created_at: string;
}

// Dashboard types
export interface DashboardSummary {
  totalProducts: number;
  totalUnitsInStock: number;
  todayUnitsSold: number;
  todaySalesValue: number;
  totalStockValue: number;
}

export interface DailySalesData {
  date: string;
  units: number;
  value: number;
}

export interface TopSellerData {
  product_id: string;
  product_name: string;
  units_sold: number;
}

// Form types
export interface ProductFormData {
  name: string;
  category: ProductCategory;
  buying_price: number;
  selling_price: number;
  opening_stock: number;
  reorder_level: number;
}

export interface StockEntryFormData {
  product_id: string;
  quantity: number;
  buying_price?: number;
  type: StockEntryType;
  reason?: string;
  notes?: string;
}

export interface StockAdjustmentFormData {
  product_id: string;
  change_value: number;
  reason: string;
  notes?: string;
}

export interface SaleLineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  selling_price: number;
  current_stock: number;
}

export interface SaleFormData {
  items: SaleLineItem[];
  payment_type: PaymentType;
  notes?: string;
}

// Helper function to determine stock status
export function getStockStatus(currentStock: number, reorderLevel: number | null): StockStatus {
  if (currentStock < 0) return 'NEGATIVE';
  if (reorderLevel !== null && currentStock <= reorderLevel) return 'LOW';
  return 'OK';
}

// Format currency in ETB
export function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
