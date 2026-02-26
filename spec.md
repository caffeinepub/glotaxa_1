# Specification

## Summary
**Goal:** Add a fixed 3-row line items section to the Transaction tab that flows description, net amount, VAT category, and resolved VAT rate into the Invoice tab, while removing the item type dropdown from Invoice line items.

**Planned changes:**
- Add a "Line Items" section in the Transaction tab with exactly 3 always-visible rows, each containing a description text field, a net amount numeric input, and a VAT category selector populated from the existing `VAT_CATEGORIES` list
- Pass the line item data (description, net amount, VAT category) from Transaction state into the Invoice tab, filtering out empty/zero-amount rows
- Display each line item in the Invoice tab with description, net amount, VAT category label, and the resolved VAT rate percentage derived from the selected category and transaction country
- Remove the item type dropdown from Invoice tab line items and replace it with a read-only text display of the description carried over from the Transaction tab

**User-visible outcome:** Users can fill in up to 3 line items directly in the Transaction tab and see them automatically appear in the Invoice tab with VAT category and rate resolved — without any item type dropdown on the invoice.
