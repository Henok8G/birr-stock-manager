/**
 * Reversal rules shared across dashboard, history and analytics.
 *
 * A reversal creates TWO rows:
 *   1. the original sale, flagged `is_reversed = true`
 *   2. a mirror row with negative values and `reversed_sale_id` set to the original
 *
 * Both halves must be excluded from any total, otherwise the negative mirror
 * survives on its own and drags the numbers below zero.
 *
 * Stock levels are NOT affected by this rule: the raw sale_items of both halves
 * cancel each other out, which is exactly what keeps current stock correct.
 */
export interface ReversalFlags {
  is_reversed?: boolean | null;
  reversed_sale_id?: string | null;
}

/** True when the sale is either half of a reversal pair. */
export function isReversalPair(sale: ReversalFlags | null | undefined): boolean {
  if (!sale) return false;
  return Boolean(sale.is_reversed) || sale.reversed_sale_id != null;
}

/** True when the sale should be counted in sales totals / analytics. */
export function isCountableSale(sale: ReversalFlags | null | undefined): boolean {
  return !isReversalPair(sale);
}
