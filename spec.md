# Glotaxa — Feature Build: Batch 1 (VAT ID Validation, Monthly VAT Summary Export, White-Label Branding Removal) + Remaining Features

## Current State
- VAT ID fields exist in Transaction.tsx (`vatId`) and Invoice.tsx (`buyerTaxId`) but are plain text inputs with zero validation.
- No monthly VAT summary export exists — only single-invoice PDF/XML download.
- Branding (Glotaxa logo, name, subtitle) is hardcoded in Header.tsx with no conditional render, no plan gate, no white-label toggle.
- OSS invoices detect OSS correctly but PDF/XML output lacks OSS-specific fields.
- No CSV bulk import, no multiple business profiles, no team access, no quarterly OSS report, no self-serve API key generation.
- Auth context exposes `currentPlan` ("free"|"starter"|"pro"|"business") and `accessToken`.

## Requested Changes (Diff)

### Add
- **VAT ID Validation utility** (`src/frontend/src/utils/vatIdValidator.ts`): regex patterns for all EU country VAT formats + UK (GB). Returns `{ valid: boolean, country: string, format: string, message: string }`.
- **VAT ID validation UI** on Transaction.tsx buyer VAT ID field and Invoice.tsx buyer Tax ID field: inline green checkmark / red error feedback on blur. Show format hint. Block calculation if B2B and VAT ID entered but invalid format.
- **Monthly VAT Summary Export** (`src/frontend/src/utils/vatSummaryExport.ts`): reads transactions stored in localStorage (`glotaxa_transactions`), groups by month, sums net/VAT/gross per country, generates a downloadable CSV and a printable PDF summary table.
- **VAT Summary Export button** on Dashboard.tsx: month/year selector + "Export CSV" and "Export PDF" buttons. Works from locally stored transaction history.
- **White-label branding toggle**: add `hideBranding` prop to Header.tsx. When true, hide the Glotaxa h1 text, gradient logo, and subtitle — replace with a neutral "Invoicing Platform" label or just hide entirely.
- **Plan-gated branding removal**: in App.tsx, pass `hideBranding={currentPlan === 'starter' || currentPlan === 'pro' || currentPlan === 'business'}` to Header.
- **Transaction history persistence**: every time the user completes a VAT calculation on Transaction.tsx, append a transaction record to `localStorage.getItem('glotaxa_transactions')` (array of `{ date, country, category, netAmount, vatRate, vatAmount, grossAmount, isOSS, currency }`). This powers the monthly VAT summary export.
- **OSS invoice fields**: in `utils/generateInvoicePDF.ts` and `utils/generateInvoiceXML.ts`, when `isOSS === true`, add an OSS reference line: "OSS Scheme — VAT remitted to [buyer country] tax authority" in the PDF notes section, and a `<cbc:TaxExemptionReasonCode>OSS</cbc:TaxExemptionReasonCode>` node in the XML.
- **Bulk CSV invoice upload**: new tab/section on Invoice page — a file input that accepts `.csv`, parses it (Papa Parse or manual split), and pre-fills the invoice form fields from the first row. Show a preview table before confirming. Gate behind `pro` or `business` plan.
- **Multiple business profiles** (up to 5): new `BusinessProfiles` component on Dashboard — lets Business-plan users save up to 5 named seller profiles (name, address, VAT number, email, phone, country) in localStorage. A "Load Profile" button on Invoice page lets users pick a saved profile to pre-fill seller details.
- **Team access** (up to 3 users): simple invite-by-email UI on Dashboard for Business-plan users. Stores invited emails in localStorage `glotaxa_team_members` (max 3). Shows a team member list. Note: actual shared-session enforcement requires backend — frontend shows the UI and stores invites; backend enforcement is a separate Supabase step.
- **Quarterly OSS VAT report export**: on Dashboard, a quarter/year selector that filters `glotaxa_transactions` for OSS transactions, groups by destination country, and exports a CSV in the OSS one-stop-shop format (country, net, VAT rate, VAT amount).
- **Self-serve API key generation**: on ApiDocs page, add an "Generate My API Key" button (gated behind Starter+). Generates a UUID-based key, stores it in localStorage `glotaxa_api_key`, and displays it with a copy button. Show instructions for use.

### Modify
- `Header.tsx`: accept `hideBranding?: boolean` prop. Conditionally render branding section.
- `App.tsx`: pass `hideBranding` to Header based on `currentPlan`.
- `Transaction.tsx`: on blur of vatId field, run validation and show inline status.
- `Invoice.tsx`: on blur of buyerTaxId field, run validation and show inline status. Also pass `isOSS` through to PDF/XML builder.
- `Dashboard.tsx`: add Monthly VAT Summary Export section and (for Business plan) Business Profiles and Team Access sections.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/utils/vatIdValidator.ts` with EU+UK VAT regex patterns.
2. Update `Transaction.tsx` — add validation on vatId blur, inline status badge, persist transaction to localStorage on calculation.
3. Update `Invoice.tsx` — add validation on buyerTaxId blur, OSS fields in PDF/XML, CSV bulk import (Pro+).
4. Update `Header.tsx` — add `hideBranding` prop and conditional render.
5. Update `App.tsx` — pass `hideBranding` to Header based on `currentPlan`.
6. Create `src/frontend/src/utils/vatSummaryExport.ts` — monthly grouping, CSV + PDF export.
7. Update `Dashboard.tsx` — add Monthly VAT Summary section, Business Profiles (Business plan), Team Access (Business plan), Quarterly OSS Report.
8. Update `ApiDocs.tsx` — add self-serve API key generation (Starter+).
