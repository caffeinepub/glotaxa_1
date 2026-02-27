import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Download, FileCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabName, InvoicePrePopData } from '../App';
import { VAT_RULES } from '../data/vatRules';
import type { CountryCode } from '../data/vatRules';
import { downloadInvoicePDF } from '../utils/invoicePDF';
import { downloadInvoiceXML } from '../utils/invoiceXML';
import type { Invoice16931, InvoiceLineItem } from '../types/invoice';

interface InvoiceProps {
  setActiveTab: (tab: TabName) => void;
  prePopData: InvoicePrePopData | null;
}

interface LocalLineItem {
  id: string;
  description: string;
  itemType: string;
  netAmount: number;
  vatCategory: string;
  vatRate: number;
}

const MAX_LINE_ITEMS = 3;

const ITEM_TYPES = ['Goods', 'Services', 'Digital Services', 'Mixed'];
const VAT_CATEGORIES_LIST = ['Others', 'Basic Food', 'Books', 'Medical', 'Transport', 'Hotel', 'Financial Services', 'Insurance', 'Education', 'Exports', 'Intra-EU B2B'];
const CURRENCIES = ['EUR', 'GBP', 'SEK', 'PLN', 'HUF'];

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(VAT_RULES).map(([code, rule]) => [code, rule.name])
);

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
}

/**
 * Resolve the correct VAT rate for a given category and country.
 * For GB, uses the categoryRates map from vatRules.ts (same source as vatEngine.ts).
 * For non-GB countries, uses the standard reduced/standard rate logic.
 */
function getVatRateForCategory(vatCategory: string, country: CountryCode): number {
  const rules = VAT_RULES[country];
  if (!rules) return 0;

  // UK (GB) — use categoryRates map directly, matching vatEngine.ts logic
  if (country === 'GB') {
    // Intra-EU B2B: reverse charge → 0%
    if (vatCategory === 'Intra-EU B2B') return 0;

    // Transport: default 20% (public transport 0% is a special case handled separately)
    if (vatCategory === 'Transport') return 20;

    // Check category-specific rates from vatRules.ts
    if (rules.categoryRates && vatCategory in rules.categoryRates) {
      return rules.categoryRates[vatCategory].rate;
    }

    // All other UK categories (e.g. Books, Others): standard 20%
    return rules.standard;
  }

  // Non-UK countries
  switch (vatCategory) {
    case 'Financial Services':
    case 'Insurance':
    case 'Education':
      return 0; // Exempt
    case 'Exports':
    case 'Intra-EU B2B':
      return 0; // Zero-rated / Reverse Charge
    case 'Basic Food':
    case 'Books':
    case 'Medical':
    case 'Transport':
    case 'Hotel':
      return rules.reduced ?? rules.standard;
    default:
      return rules.standard;
  }
}

export default function Invoice({ setActiveTab, prePopData }: InvoiceProps) {
  const today = new Date().toISOString().split('T')[0];
  const dueDateDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(dueDateDefault);

  // Seller details
  const [sellerName, setSellerName] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerVatNumber, setSellerVatNumber] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerCountry, setSellerCountry] = useState<CountryCode>('DE');

  // Buyer details
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerTaxId, setBuyerTaxId] = useState('');
  const [buyerContractNumber, setBuyerContractNumber] = useState('');

  // Line items
  const [lineItems, setLineItems] = useState<LocalLineItem[]>([
    { id: '1', description: 'Professional Services', itemType: 'Services', netAmount: 1000, vatCategory: 'Others', vatRate: 20 },
  ]);

  const [currency, setCurrency] = useState('EUR');
  const [paymentMeans, setPaymentMeans] = useState('Bank Transfer');
  const [iban, setIban] = useState('');
  const [earlyPaymentDiscount, setEarlyPaymentDiscount] = useState('2% if paid within 10 days');
  const [latePenaltyTerms, setLatePenaltyTerms] = useState('1.5% per month on overdue amounts');
  const [notes, setNotes] = useState('');

  const atLineItemLimit = lineItems.length >= MAX_LINE_ITEMS;

  // Pre-populate from transaction data
  useEffect(() => {
    if (!prePopData) return;

    setSellerCountry((prePopData.country as CountryCode) || 'DE');

    const descriptionMap: Record<string, string> = {
      'Others': 'Professional Services',
      'Basic Food': 'Food & Beverages Supply',
      'Books': 'Books & Publications',
      'Medical': 'Medical Supplies',
      'Transport': 'Transport Services',
      'Hotel': 'Hotel & Accommodation',
      'Financial Services': 'Financial Services',
      'Insurance': 'Insurance Services',
      'Education': 'Educational Services',
      'Exports': 'Export of Goods',
      'Intra-EU B2B': 'Intra-EU B2B Supply',
    };

    const itemTypeMap: Record<string, string> = {
      'Others': 'Services',
      'Basic Food': 'Goods',
      'Books': 'Goods',
      'Medical': 'Goods',
      'Transport': 'Services',
      'Hotel': 'Services',
      'Financial Services': 'Services',
      'Insurance': 'Services',
      'Education': 'Services',
      'Exports': 'Goods',
      'Intra-EU B2B': 'Goods',
    };

    setLineItems([
      {
        id: '1',
        description: descriptionMap[prePopData.category] || prePopData.category,
        itemType: itemTypeMap[prePopData.category] || 'Services',
        netAmount: prePopData.netAmount,
        vatCategory: prePopData.category,
        vatRate: prePopData.vatRate,
      },
    ]);

    // Set currency based on country
    const currencyMap: Record<string, string> = {
      GB: 'GBP', SE: 'SEK', PL: 'PLN', HU: 'HUF',
    };
    setCurrency(currencyMap[prePopData.country] || 'EUR');

    // Add reverse charge note if applicable
    if (prePopData.vatType === 'Reverse Charge') {
      setNotes('VAT reverse charge applies. The recipient is liable for the VAT amount under Article 196 of the EU VAT Directive.');
    }
  }, [prePopData]);

  const updateLineItem = (id: string, field: keyof LocalLineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Auto-update VAT rate when category changes
        if (field === 'vatCategory') {
          updated.vatRate = getVatRateForCategory(value as string, sellerCountry);
        }
        return updated;
      })
    );
  };

  const addLineItem = () => {
    if (atLineItemLimit) return;
    setLineItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', itemType: 'Services', netAmount: 0, vatCategory: 'Others', vatRate: getVatRateForCategory('Others', sellerCountry) },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Totals
  const totalNet = useMemo(() => lineItems.reduce((sum, item) => sum + item.netAmount, 0), [lineItems]);
  const vatBreakdown = useMemo(() =>
    lineItems.reduce<Record<string, { rate: number; base: number; vat: number }>>((acc, item) => {
      const key = `${item.vatRate}`;
      if (!acc[key]) acc[key] = { rate: item.vatRate, base: 0, vat: 0 };
      acc[key].base += item.netAmount;
      acc[key].vat += item.netAmount * (item.vatRate / 100);
      return acc;
    }, {}),
    [lineItems]
  );
  const totalVat = useMemo(() => Object.values(vatBreakdown).reduce((sum, v) => sum + v.vat, 0), [vatBreakdown]);
  const totalGross = totalNet + totalVat;

  // Build Invoice16931 for export
  const buildInvoice16931 = (): Invoice16931 => {
    const cleanLineItems: InvoiceLineItem[] = lineItems.map((item) => ({
      itemType: item.itemType,
      description: item.description || 'Item',
      quantity: 1,
      unitPrice: item.netAmount,
      amount: item.netAmount,
      vatRate: item.vatRate,
    }));

    const taxDetails: { [vatRate: string]: number } = {};
    Object.entries(vatBreakdown).forEach(([rate, v]) => {
      taxDetails[rate] = v.vat;
    });

    return {
      header: {
        invoiceNumber,
        invoiceDate,
        invoiceType: 'Invoice',
      },
      seller: {
        name: sellerName || 'Seller',
        address: sellerAddress || '',
        vatNumber: sellerVatNumber || '',
        email: sellerEmail || '',
        phone: sellerPhone || '',
      },
      buyer: {
        name: buyerName || 'Buyer',
        address: buyerAddress || '',
        taxIdOrBusinessRegNumber: buyerTaxId || '',
        publicContractNumber: buyerContractNumber || '',
      },
      lineItems: cleanLineItems,
      taxDetails,
      subtotal: totalNet,
      grandTotal: totalGross,
      currency,
      paymentTerms: {
        paymentDueDate: dueDate,
        paymentMeans,
        bankingInfo: { iban: iban || 'N/A' },
        earlyPaymentDiscount,
        latePenaltyTerms,
      },
    };
  };

  const handleDownloadPDF = () => downloadInvoicePDF(buildInvoice16931());
  const handleDownloadXML = () => downloadInvoiceXML(buildInvoice16931());

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('transaction')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transaction
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EN 16931 Compliant Invoice</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate EU/UK compliant electronic invoices
            {prePopData && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary font-medium">
                <FileText className="w-3 h-3" />
                Pre-populated from transaction
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadXML} className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            XML
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Invoice Header */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice Number</label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice Date</label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Seller & Buyer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seller */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Seller (Supplier)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Company Name</label>
                <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Your Company Ltd" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                <Input value={sellerAddress} onChange={(e) => setSellerAddress(e.target.value)} placeholder="123 Business St, City" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">VAT Number</label>
                <Input value={sellerVatNumber} onChange={(e) => setSellerVatNumber(e.target.value)} placeholder="GB123456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <Input value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} placeholder="billing@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="+44 123 456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Country</label>
                <select
                  value={sellerCountry}
                  onChange={(e) => {
                    const newCountry = e.target.value as CountryCode;
                    setSellerCountry(newCountry);
                    // Re-calculate VAT rates for all line items when country changes
                    setLineItems((prev) =>
                      prev.map((item) => ({
                        ...item,
                        vatRate: getVatRateForCategory(item.vatCategory, newCountry),
                      }))
                    );
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>{name} ({code})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Buyer */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Buyer (Customer)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Company Name</label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Customer Company Ltd" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="456 Customer Ave, City" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tax ID / VAT ID</label>
                <Input value={buyerTaxId} onChange={(e) => setBuyerTaxId(e.target.value)} placeholder="FR987654321" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contract No. (optional)</label>
                <Input value={buyerContractNumber} onChange={(e) => setBuyerContractNumber(e.target.value)} placeholder="CONTRACT-001" />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">Line Items</h2>
              <span className="text-xs text-muted-foreground">
                {lineItems.length} / {MAX_LINE_ITEMS}
              </span>
              {atLineItemLimit && (
                <span className="text-xs text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full">
                  Maximum reached
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addLineItem}
              disabled={atLineItemLimit}
              className="flex items-center gap-2"
              title={atLineItemLimit ? `Maximum of ${MAX_LINE_ITEMS} line items allowed per invoice` : 'Add a new line item'}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Net Amount</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">VAT Category</th>
                  <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">VAT Rate</th>
                  <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">VAT Amount</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2 pr-3">
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Description"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={item.itemType}
                        onChange={(e) => updateLineItem(item.id, 'itemType', e.target.value)}
                        className="h-8 px-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={item.netAmount}
                        onChange={(e) => updateLineItem(item.id, 'netAmount', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={item.vatCategory}
                        onChange={(e) => updateLineItem(item.id, 'vatCategory', e.target.value)}
                        className="h-8 px-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {VAT_CATEGORIES_LIST.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Input
                        type="number"
                        value={item.vatRate}
                        onChange={(e) => updateLineItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right w-20"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {currency} {(item.netAmount * (item.vatRate / 100)).toFixed(2)}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (Net)</span>
                <span className="font-medium">{currency} {totalNet.toFixed(2)}</span>
              </div>
              {Object.values(vatBreakdown).map((v) => (
                <div key={v.rate} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT {v.rate}%</span>
                  <span>{currency} {v.vat.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5">
                <span>Total (Gross)</span>
                <span>{currency} {totalGross.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Payment Terms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Means</label>
              <select
                value={paymentMeans}
                onChange={(e) => setPaymentMeans(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>Bank Transfer</option>
                <option>Credit Card</option>
                <option>Direct Debit</option>
                <option>Cheque</option>
                <option>Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">IBAN</label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="GB29 NWBK 6016 1331 9268 19" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Early Payment Discount</label>
              <Input value={earlyPaymentDiscount} onChange={(e) => setEarlyPaymentDiscount(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Late Penalty Terms</label>
              <Input value={latePenaltyTerms} onChange={(e) => setLatePenaltyTerms(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes, reverse charge statements, etc."
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* UK VAT Reference Panel */}
        {sellerCountry === 'GB' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-3">UK VAT Rate Reference</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { cat: 'Others', rate: '20%', note: 'Standard' },
                { cat: 'Basic Food', rate: '0%', note: 'Zero-rated' },
                { cat: 'Books', rate: '0%', note: 'Zero-rated' },
                { cat: 'Medical', rate: '0%', note: 'Zero-rated' },
                { cat: 'Transport', rate: '20%/0%', note: 'Mixed' },
                { cat: 'Hotel', rate: '20%', note: 'Standard' },
                { cat: 'Financial Services', rate: '0%', note: 'Exempt' },
                { cat: 'Insurance', rate: '0%', note: 'Exempt' },
                { cat: 'Education', rate: '0%', note: 'Zero-rated' },
                { cat: 'Exports', rate: '0%', note: 'Zero-rated' },
                { cat: 'Intra-EU B2B', rate: '0%', note: 'Reverse Charge' },
              ].map(({ cat, rate, note }) => (
                <div key={cat} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">{cat}</span>
                  <div className="text-right">
                    <span className="font-semibold text-foreground">{rate}</span>
                    <span className="block text-muted-foreground/70">{note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <Button variant="outline" onClick={handleDownloadXML} className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            Download XML
          </Button>
          <Button onClick={handleDownloadPDF} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
