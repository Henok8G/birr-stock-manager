# Fix: Stock doesn't update after recording sales

## Root cause

The `sale_items` table now has **1015 rows** (and growing). Supabase's PostgREST API returns a maximum of **1000 rows per query by default**. 

In `src/hooks/useProducts.ts` we do:
```ts
supabase.from('sale_items').select('product_id, quantity')
```
This silently returns only the first 1000 rows (oldest ones). Newly inserted sale_items for your latest sales are missing from the result, so when the hook computes `sold = sum(sale_items.quantity)` per product, the new sale is not counted and `current_stock` looks unchanged.

The same bug exists in `src/hooks/useDashboard.ts` (which also fetches `sale_items` and `stock_entries` client-side). It will get worse as data grows — eventually inventory totals and dashboard KPIs will all drift.

## The fix

Move the aggregation to the database so we don't pull thousands of rows to the client.

### 1. Database: add a stock-levels view

Create a SQL view `product_stock_levels` that returns one row per product with pre-aggregated totals:

```sql
CREATE OR REPLACE VIEW public.product_stock_levels
WITH (security_invoker = on) AS
SELECT
  p.id AS product_id,
  COALESCE(SUM(CASE WHEN se.type = 'inbound'    THEN se.quantity END), 0) AS received,
  COALESCE(SUM(CASE WHEN se.type = 'adjustment' THEN se.quantity END), 0) AS adjustments,
  COALESCE((SELECT SUM(si.quantity) FROM public.sale_items si WHERE si.product_id = p.id), 0) AS sold
FROM public.products p
LEFT JOIN public.stock_entries se ON se.product_id = p.id
GROUP BY p.id;

GRANT SELECT ON public.product_stock_levels TO authenticated;
```

`security_invoker = on` means RLS on the base tables still applies.

### 2. Rewrite `useProducts.ts`

Replace the two big `stock_entries` / `sale_items` fetches with a single select on the view:

```ts
const { data: levels } = await supabase
  .from('product_stock_levels')
  .select('product_id, received, adjustments, sold');
```
Then merge `levels` into `products` by `product_id` and compute `current_stock = opening_stock + received - sold + adjustments`. No more 1000-row ceiling.

### 3. Rewrite `useDashboard.ts`

- Use the same `product_stock_levels` view for `productsWithStock`, `totalUnitsInStock`, `totalStockValue`, and low-stock list.
- For today's sales KPIs (`todayUnitsSold`, `todaySalesValue`) and the 7-day chart, query `sales` with a `gte('created_at', startOfToday)` / 7-day filter — that returns far fewer rows.
- For top sellers (last 7 days), query `sale_items` filtered by `created_at >= weekAgo` so we never load the full history.

### 4. No changes to `useSales.createSale`

The insert logic is correct; the bug is purely on the read side.

## Files touched

- `supabase/migrations/<new>.sql` — create the view + grant
- `src/hooks/useProducts.ts` — use the view
- `src/hooks/useDashboard.ts` — use the view + date-filtered queries

## Verification

After the fix:
1. Record a sale on the Sales page.
2. Inventory page should immediately show the reduced `current_stock` for that product.
3. Dashboard KPIs and low-stock list should update too.
