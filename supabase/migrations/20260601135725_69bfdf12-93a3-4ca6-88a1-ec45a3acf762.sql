CREATE OR REPLACE VIEW public.product_stock_levels
WITH (security_invoker = on) AS
SELECT
  p.id AS product_id,
  COALESCE((SELECT SUM(se.quantity) FROM public.stock_entries se WHERE se.product_id = p.id AND se.type = 'inbound'), 0) AS received,
  COALESCE((SELECT SUM(se.quantity) FROM public.stock_entries se WHERE se.product_id = p.id AND se.type = 'adjustment'), 0) AS adjustments,
  COALESCE((SELECT SUM(si.quantity) FROM public.sale_items si WHERE si.product_id = p.id), 0) AS sold
FROM public.products p;

GRANT SELECT ON public.product_stock_levels TO authenticated;