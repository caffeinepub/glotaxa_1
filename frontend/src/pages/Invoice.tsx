import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Download, FileCode, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabName, InvoicePrePopData } from '../App';
import { VAT_RULES } from '../data/vatRules';
import type { CountryCode } from '../data/vatRules';
import { downloadInvoicePDF } from '../utils/invoicePDF';
import { downloadInvoiceXML } from '../utils/invoiceXML';
import type { Invoice16931, InvoiceLineItem } from '../types/invoice';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = 'https://cvelhiuefcykduwgnjjs.supabase.co';

interface InvoiceProps {
  setActiveTab: (tab: TabName) => void;
  prePopData: InvoicePrePopData | null;
  onInvoiceGenerated?: (invoiceNumber: string, totalAmount: number, currency: string) => void;
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
const VAT_CATEGORIES_LIST = [
  'Others', 'Basic Food', 'Books', 'Medical', 'Transport', 'Hotel',
  'Financial Services', 'Insurance', 'Education', 'Exports', 'Intra-EU B2B',
];
const CURRENCIES = ['EUR', 'GBP', 'SEK', 'PLN', 'HUF'];

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(VAT_RULES).map(([code, rule]) => [code, rule.name])
);

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function getVatRateForCategory(vatCategory: string, country: CountryCode): number {
  const rules = VAT_RULES[country];
  if (!rules) return 0;

  if (country === 'GB') {
    if (vatCategory === 'Intra-EU B2B') return 0;
    if (vatCategory === 'Transport') return 20;
    if (rules.categoryRates && vatCategory in rules.categoryRates) {
      return rules.categoryRates[vatCategory].rate;
    }
    return rules.standard;
  }

  switch (vatCategory) {
    case 'Financial Services':
    case 'Insurance':
    case 'Education':
      return 0;
    case 'Exports':
    case 'Intra-EU B2B':
      return 0;
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

export default function Invoice({ setActiveTab, prePopData, onInvoiceGenerated }: InvoiceProps) {
  const today = new Date().toISOString().split('T')[0];
  const dueDateDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { accessToken, isAuthenticated } = useAuth();

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

  // Generate Invoice via edge function
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

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

    const currencyMap: Record<string, string> = {
      GB: 'GBP', SE: 'SEK', PL: 'PLN', HU: 'HUF',
    };
    setCurrency(currencyMap[prePopData.country] || 'EUR');

    if (prePopData.vatType === 'Reverse Charge') {
      setNotes('VAT reverse charge applies. The recipient is liable for the VAT amount under Article 196 of the EU VAT Directive.');
    }
  }, [prePopData]);

  const updateLineItem = (id: string, field: keyof LocalLineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
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
      header: { invoiceNumber, invoiceDate, invoiceType: 'Invoice' },
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

  // Generate Invoice via Supabase Edge Function
  const handleGenerateInvoice = async () => {
    if (!isAuthenticated || !accessToken) {
      setGenerateError('You must be signed in to generate invoices via the cloud. Use PDF/XML export instead.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(false);

    const timestamp = Date.now();
    const edgeInvoiceNumber = `INV-${timestamp}`;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_number: edgeInvoiceNumber,
          total_amount: totalGross,
        }),
      });

      if (response.status === 200 || response.ok) {
        setGenerateSuccess(true);
        if (onInvoiceGenerated) {
          onInvoiceGenerated(edgeInvoiceNumber, totalGross, currency);
        }
      } else if (response.status === 403) {
        setGenerateError("You've reached your free plan limit. Upgrade to continue.");
        // Navigate to pricing after short delay
        setTimeout(() => setActiveTab('pricing'), 2000);
      } else {
        const data = await response.json().catch(() => ({}));
        setGenerateError(data?.message || data?.error || 'Failed to generate invoice. Please try again.');
      }
    } catch {
      setGenerateError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

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
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground">VAT Amount</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-3">
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={item.itemType}
                        onChange={(e) => updateLineItem(item.id, 'itemType', e.target.value)}
                        className="h-8 px-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <Input
                        type="number"
                        value={item.netAmount}
                        onChange={(e) => updateLineItem(item.id, 'netAmount', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right w-28"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={item.vatCategory}
                        onChange={(e) => updateLineItem(item.id, 'vatCategory', e.target.value)}
                        className="h-8 px-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {VAT_CATEGORIES_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <span className="text-xs font-medium text-foreground">{item.vatRate}%</span>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <span className="text-xs text-muted-foreground">
                        {(item.netAmount * item.vatRate / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Currency & Payment */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
              <Input value={paymentMeans} onChange={(e) => setPaymentMeans(e.target.value)} placeholder="Bank Transfer" />
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes or reverse charge statement" />
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Invoice Totals</h2>
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Total</span>
              <span className="font-medium">{currency} {totalNet.toFixed(2)}</span>
            </div>
            {Object.values(vatBreakdown).map((v) => (
              <div key={v.rate} className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT ({v.rate}%)</span>
                <span className="font-medium">{currency} {v.vat.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
              <span>Total (incl. VAT)</span>
              <span>{currency} {totalGross.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* UK VAT Reference Panel */}
        {sellerCountry === 'GB' && (
          <div className="bg-muted/40 border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">UK VAT Reference</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Standard Rate: 20%</span>
              <span>Reduced Rate: 5%</span>
              <span>Zero Rate: 0%</span>
              <span>Basic Food: 0%</span>
              <span>Medical: 0%</span>
              <span>Education: 0%</span>
              <span>Exports: 0%</span>
              <span>Financial Services: Exempt</span>
              <span>Insurance: Exempt</span>
            </div>
          </div>
        )}

        {/* Generate Invoice via Edge Function */}
        {isAuthenticated && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Generate Invoice (Cloud)</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Save your invoice to the cloud via your Glotaxa account.
                </p>
              </div>
              <Button
                onClick={handleGenerateInvoice}
                disabled={isGenerating}
                className="shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  'Generate Invoice'
                )}
              </Button>
            </div>

            {generateError && (
              <div className="mt-4 flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generateError}</span>
              </div>
            )}

            {generateSuccess && (
              <div className="mt-4 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg px-4 py-3">
                ✓ Invoice generated successfully! Navigating to preview…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
