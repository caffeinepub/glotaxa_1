# Specification

## Summary
**Goal:** Limit invoice line items to a maximum of 3 per invoice in the Invoice tab, for all countries.

**Planned changes:**
- Disable or hide the "Add Line Item" button in `Invoice.tsx` when 3 line items are already present
- Apply this limit universally regardless of the selected country
- Re-enable the "Add Line Item" button if a line item is removed and the count drops below 3

**User-visible outcome:** Users can add up to 3 line items on an invoice; the option to add more is disabled once the limit is reached and becomes available again if an item is removed.
