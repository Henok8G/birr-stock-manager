## What I verified in your data

Your three most recent sales rows:

```text
19,570   normal sale     (today 17:13)
-15,985  reversal row    (today 17:08)   reversed_sale_id -> original
 15,985  original sale   (today 08:28)   is_reversed = true
```

I also checked the underlying line items. The reversal mirrors the original **exactly**, item for item (Bedele 6/-6 and 5/-5, BEER 39/-39, DRAFT 123/-123, Soda 18/-18, Water 2/-2, 12/-12, 13/-13, CLASSIC 1/-1). I checked every reversed sale in the whole database — all three pairs cancel to zero units.

**So your stock numbers are already mathematically correct.** Nothing was lost from inventory; the reversal properly gave the units back. The "gap" you're seeing is a **display/reporting bug**, not corrupted data.

### The actual bug

The Dashboard filters sales with `is_reversed = false`. That removes the original (+15,985) but **keeps** the reversal row (−15,985), because the reversal row itself has `is_reversed = false` — the flag only ever gets set on the original. The pair no longer cancels, leaving a lone −15,985. That's exactly why today shows 3,585 instead of 19,570.

The History page filters both sides correctly, which is why the two pages disagree.

## The fix

Treat a sale as excluded when it is **either half** of a reversal pair: `is_reversed = true` OR `reversed_sale_id IS NOT NULL`. Read-side only — no data migration, no schema change, and past reversals correct themselves the moment the page reloads.

### Changes

1. **`src/hooks/useDashboard.ts`**
   - Sales query: add `.is('reversed_sale_id', null)` alongside the existing `is_reversed = false` filter, so both halves drop out of today's units, today's value, and the 7-day chart.
   - Top sellers: the `sale_items` fetch currently pulls raw line items with no reversal awareness, so the negative reversal quantities skew the ranking. Join the parent sale and skip items belonging to a reversed sale or a reversal sale.

2. **`src/hooks/useInventoryHistory.ts`**
   - Line 57 skips items whose sale `is_reversed`, but keeps the reversal sale's negative-quantity items — that's the phantom negative row you see under "Sold". Select `reversed_sale_id` on the joined sale and skip those items too, so a reversed sale disappears cleanly from history rather than leaving a −219 ghost.

3. **`src/pages/History.tsx`** — already filters correctly (`!is_reversed && total_units > 0`). I'll switch it to the same explicit `reversed_sale_id` check so all three pages use one consistent rule instead of relying on the sign of the total.

4. **Stock levels view / `useProducts.ts`** — **leave unchanged.** They sum all `sale_items`, so original and reversal net to zero and current stock stays right. This is the behaviour that's already correct and I don't want to break it.

### Nothing gets deleted

Reversal rows stay in the database and stay visible in the Sales list, so you keep the full audit trail of what was recorded and what was cancelled. They just stop polluting the totals.

### One thing I noticed and left alone

There's an old June chain where a reversal was itself reversed (a sale of 1 Ambo, cancelled, then re-instated). The math nets to +1 sold, which is correct. The filter above handles it correctly too.

## Verification after the fix

- Dashboard "Today's Sales Value" → **19,570** (currently 3,585)
- Dashboard "Today's Units Sold" → **265**
- Inventory History → Sold contains no negative-quantity rows
- Dashboard, History, and Inventory all report the same totals
- Current stock per product is unchanged (it was already right)
