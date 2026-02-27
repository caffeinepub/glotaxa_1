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

// Map VAT category string to a numeric rate for a given country
function getVatRateForCategory(vatCategory: string, country: CountryCode): number {
  const rules = VAT_RULES[country];
  if (!rules) return 0;
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
      if (country === 'GB') return 0;
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
                <Input value={sellerVatNumber} onChange={(e) => setSellerVatNumber(e.target.value)} placeholder="DE123456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <Input value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} placeholder="billing@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="+49 123 456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Country</label>
                <select
                  value={sellerCountry}
                  onChange={(e) => setSellerCountry(e.target.value as CountryCode)}
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
            <h2 className="text-base font-semibold text-foreground">Line Items</h2>
            <Button variant="outline" size="sm" onClick={addLineItem} className="flex items-center gap-2">
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
                        className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={item.netAmount}
                        onChange={(e) => updateLineItem(item.id, 'netAmount', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                        min="0"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={item.vatCategory}
                        onChange={(e) => updateLineItem(item.id, 'vatCategory', e.target.value)}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {VAT_CATEGORIES_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={item.vatRate}
                        onChange={(e) => updateLineItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                        min="0"
                        max="100"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right text-xs text-muted-foreground">
                      {(item.netAmount * (item.vatRate / 100)).toFixed(2)}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

        {/* VAT Breakdown & Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VAT Breakdown */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">VAT Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-1 text-xs font-medium text-muted-foreground">Rate</th>
                  <th className="text-right py-1 text-xs font-medium text-muted-foreground">Base</th>
                  <th className="text-right py-1 text-xs font-medium text-muted-foreground">VAT</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(vatBreakdown).map(([rate, v]) => (
                  <tr key={rate} className="border-b border-border/50">
                    <td className="py-1.5 text-xs text-right text-foreground">{v.rate}%</td>
                    <td className="py-1.5 text-xs text-right text-foreground">{v.base.toFixed(2)}</td>
                    <td className="py-1.5 text-xs text-right text-foreground">{v.vat.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Invoice Totals</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Total</span>
                <span className="font-medium">{currency} {totalNet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total VAT</span>
                <span className="font-medium">{currency} {totalVat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                <span>Gross Total</span>
                <span className="text-primary">{currency} {totalGross.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
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
          </div>
        </div>

        {/* Payment Terms & Notes */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Payment Terms & Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Means</label>
              <Input value={paymentMeans} onChange={(e) => setPaymentMeans(e.target.value)} placeholder="Bank Transfer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">IBAN</label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="GB00BANK00000000000000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Early Payment Discount</label>
              <Input value={earlyPaymentDiscount} onChange={(e) => setEarlyPaymentDiscount(e.target.value)} placeholder="2% if paid within 10 days" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Late Penalty Terms</label>
              <Input value={latePenaltyTerms} onChange={(e) => setLatePenaltyTerms(e.target.value)} placeholder="1.5% per month" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes / Legal Text</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes or legal text" />
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <Button variant="outline" onClick={handleDownloadXML} className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            Download XML (UBL 2.1)
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
