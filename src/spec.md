# Specification

## Summary
**Goal:** Fix VAT Category dropdown visibility issues by applying CSS fixes for z-index layering and limiting visible dropdown items to 3 with scrolling.

**Planned changes:**
- Apply CSS fixes to resolve dropdown being overshadowed by setting overflow: visible on all elements, z-index: 9999 on select elements, z-index: 99999 on dropdown-menu class, and overflow: visible on tabs, tab-content, grid, column, and card classes
- Limit VAT Category dropdown to display maximum 3 visible items at a time with scrolling enabled for remaining options

**User-visible outcome:** The VAT Category dropdown in the Transaction tab will be fully visible above all other content, and will display only 3 items at a time with smooth scrolling to access additional categories.
