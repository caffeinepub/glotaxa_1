# Specification

## Summary
**Goal:** Add a "Generate Invoice" button on the Transaction tab that pre-populates and navigates to the Invoice tab, and add a "Back" button on each tab to allow navigation to the previous screen.

**Planned changes:**
- Add a "Generate Invoice" button in the VAT Calculation Summary column on the Transaction tab; when clicked, it transfers transaction data (country, VAT rate, VAT type, net/gross amounts, buyer type, category) into the Invoice tab form fields and switches to the Invoice tab.
- Disable or show a tooltip on the "Generate Invoice" button if no VAT calculation has been performed yet.
- Add a "Back" button on the Transaction tab (navigates to Country/RegionSelect tab).
- Add a "Back" button on the Invoice tab (navigates to Transaction tab).
- Add a "Back" button on the API Docs tab (navigates to Invoice tab).
- Hide or disable the "Back" button on the Country/RegionSelect tab since it is the first screen.
- All navigation uses the existing tab-switching mechanism in App.tsx and state sharing goes through existing shared state.

**User-visible outcome:** Users can click "Generate Invoice" on the Transaction tab to carry their VAT data directly into the Invoice form, and can use "Back" buttons across all tabs to return to the previous screen without losing entered data.
