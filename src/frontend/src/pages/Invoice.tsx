import { useState, useEffect, useMemo } from 'react';
import { downloadInvoicePDF } from '../utils/invoicePDF';
import { downloadInvoiceXML } from '../utils/invoiceXML';
import type { CountryCode } from '../data/vatRules';
import { VAT_RULES } from '../data/vatRules';
import type { Invoice16931, InvoiceLineItem } from '../types/invoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, AlertCircle, Plus, Trash2, FileText } from 'lucide-react';

interface InvoiceData {
  country: CountryCode;
  category: string;
  amount: number;
  result: {
    vatRate: number;
    vatType: string;
    vatAmount: number;
    total: number;
  };
}

interface InvoiceProps {
  data: InvoiceData;
  initialLineItem?: InvoiceLineItem;
}

let invoiceCount = 0;

export function Invoice({ data, initialLineItem }: InvoiceProps) {
  const [error, setError] = useState<string>("");
  
  // Generate invoice number
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    const date = new Date();
    return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  });
  
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  
  const [invoiceType, setInvoiceType] = useState<'Invoice' | 'Credit Note'>('Invoice');
  
  // Seller details
  const [sellerName, setSellerName] = useState<string>('Your Company Name');
  const [sellerAddress, setSellerAddress] = useState<string>('123 Business Street\nCity, Postal Code\nCountry');
  const [sellerVAT, setSellerVAT] = useState<string>('VAT123456789');
  const [sellerEmail, setSellerEmail] = useState<string>('info@yourcompany.com');
  const [sellerPhone, setSellerPhone] = useState<string>('+1234567890');
  
  // Buyer details
  const [buyerName, setBuyerName] = useState<string>('Customer Name');
  const [buyerAddress, setBuyerAddress] = useState<string>('456 Customer Avenue\nCity, Postal Code\nCountry');
  const [buyerTaxId, setBuyerTaxId] = useState<string>('TAX987654321');
  const [buyerContractNumber, setBuyerContractNumber] = useState<string>('');
  
  // Line items - initialize with transaction data if provided
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => {
    if (initialLineItem) {
      return [initialLineItem];
    }
    return [{
      itemType: data.category,
      description: `${data.category} service`,
      quantity: 1,
      unitPrice: data.amount,
      amount: data.amount,
      vatRate: data.result.vatRate,
    }];
  });
  
  // Payment terms
  const [paymentDueDate, setPaymentDueDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [paymentMeans, setPaymentMeans] = useState<string>('Bank Transfer');
  const [iban, setIban] = useState<string>('GB00BANK00000000000000');
  const [earlyPaymentDiscount, setEarlyPaymentDiscount] = useState<string>('2% if paid within 10 days');
  const [latePenaltyTerms, setLatePenaltyTerms] = useState<string>('1.5% per month on overdue amounts');
  
  const currency = 'EUR';

  // Calculate totals
  const { subtotal, taxDetails, grandTotal } = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    
    const taxDetails: { [vatRate: string]: number } = {};
    lineItems.forEach(item => {
      const vatAmount = (item.amount * item.vatRate) / 100;
      const rateKey = item.vatRate.toString();
      taxDetails[rateKey] = (taxDetails[rateKey] || 0) + vatAmount;
    });
    
    const totalVAT = Object.values(taxDetails).reduce((sum, amount) => sum + amount, 0);
    const grandTotal = subtotal + totalVAT;
    
    return { subtotal, taxDetails, grandTotal };
  }, [lineItems]);

  // Update line item amount when quantity or unit price changes
  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    // Recalculate amount if quantity or unit price changed
    if (field === 'quantity' || field === 'unitPrice') {
      newLineItems[index].amount = newLineItems[index].quantity * newLineItems[index].unitPrice;
    }
    
    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemType: 'Service',
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        vatRate: data.result.vatRate,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const buildInvoice = (): Invoice16931 => {
    return {
      header: {
        invoiceNumber,
        invoiceDate,
        invoiceType,
      },
      seller: {
        name: sellerName,
        address: sellerAddress,
        vatNumber: sellerVAT,
        email: sellerEmail,
        phone: sellerPhone,
      },
      buyer: {
        name: buyerName,
        address: buyerAddress,
        taxIdOrBusinessRegNumber: buyerTaxId,
        publicContractNumber: buyerContractNumber,
      },
      lineItems,
      taxDetails,
      subtotal,
      grandTotal,
      currency,
      paymentTerms: {
        paymentDueDate,
        paymentMeans,
        bankingInfo: { iban },
        earlyPaymentDiscount,
        latePenaltyTerms,
      },
    };
  };

  const downloadPDF = () => {
    if (invoiceCount >= 10) {
      setError("Free limit reached (10 invoices)");
      return;
    }

    invoiceCount++;
    const invoice = buildInvoice();
    downloadInvoicePDF(invoice);
    setError("");
  };

  const downloadXML = () => {
    if (invoiceCount >= 10) {
      setError("Free limit reached (10 invoices)");
      return;
    }

    invoiceCount++;
    const invoice = buildInvoice();
    downloadInvoiceXML(invoice);
    setError("");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">EN 16931 Compliant Invoice</h2>
        <p className="text-muted-foreground">European standard for electronic invoicing</p>
      </div>

      <div className="grid gap-6">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Header</CardTitle>
            <CardDescription>Basic invoice information</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceType">Type of Invoice</Label>
              <Select value={invoiceType} onValueChange={(value) => setInvoiceType(value as 'Invoice' | 'Credit Note')}>
                <SelectTrigger id="invoiceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Credit Note">Credit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seller and Buyer Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sellerName">Seller's Name</Label>
                <Input
                  id="sellerName"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerAddress">Address</Label>
                <Textarea
                  id="sellerAddress"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerVAT">VAT Number</Label>
                <Input
                  id="sellerVAT"
                  value={sellerVAT}
                  onChange={(e) => setSellerVAT(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerEmail">Email</Label>
                <Input
                  id="sellerEmail"
                  type="email"
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerPhone">Phone</Label>
                <Input
                  id="sellerPhone"
                  type="tel"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buyer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buyerName">Buyer Name</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerAddress">Address</Label>
                <Textarea
                  id="buyerAddress"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerTaxId">Tax ID / Business Registration Number</Label>
                <Input
                  id="buyerTaxId"
                  value={buyerTaxId}
                  onChange={(e) => setBuyerTaxId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerContractNumber">Public Contract Number</Label>
                <Input
                  id="buyerContractNumber"
                  value={buyerContractNumber}
                  onChange={(e) => setBuyerContractNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Line Items</CardTitle>
            <CardDescription>Add products or services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">Item Type</th>
                    <th className="text-left p-2 text-sm font-medium">Description</th>
                    <th className="text-right p-2 text-sm font-medium w-24">Quantity</th>
                    <th className="text-right p-2 text-sm font-medium w-28">Unit Price</th>
                    <th className="text-right p-2 text-sm font-medium w-28">Amount</th>
                    <th className="text-right p-2 text-sm font-medium w-24">VAT Rate</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">
                        <Input
                          value={item.itemType}
                          onChange={(e) => updateLineItem(index, 'itemType', e.target.value)}
                          className="min-w-[120px]"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        {currency} {item.amount.toFixed(2)}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.vatRate}
                          onChange={(e) => updateLineItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={addLineItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Line Item
            </Button>
          </CardContent>
        </Card>

        {/* Tax Details and Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Details & Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-md ml-auto">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Subtotal (Net Amount before Tax):</span>
                <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {Object.entries(taxDetails).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">VAT {rate}%:</span>
                  <span className="font-medium">{currency} {amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 text-lg font-bold bg-muted/50 px-4 rounded-lg">
                <span>Grand Total (Gross Amount Payable):</span>
                <span>{currency} {grandTotal.toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground pt-2">
                Currency: <strong>{currency}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDueDate">Payment Due Date</Label>
                <Input
                  id="paymentDueDate"
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMeans">Payment Means</Label>
                <Input
                  id="paymentMeans"
                  value={paymentMeans}
                  onChange={(e) => setPaymentMeans(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">Banking Information (IBAN)</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earlyPaymentDiscount">Early Payment Discount</Label>
              <Input
                id="earlyPaymentDiscount"
                value={earlyPaymentDiscount}
                onChange={(e) => setEarlyPaymentDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latePenaltyTerms">Late Payment Penalty Terms</Label>
              <Input
                id="latePenaltyTerms"
                value={latePenaltyTerms}
                onChange={(e) => setLatePenaltyTerms(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Download Section */}
        <Card>
          <CardHeader>
            <CardTitle>Download Invoice</CardTitle>
            <CardDescription>Export in EN 16931 compliant formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Button 
                onClick={downloadPDF} 
                size="lg"
                disabled={invoiceCount >= 10}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={downloadXML} 
                size="lg"
                variant="outline"
                disabled={invoiceCount >= 10}
              >
                <FileText className="w-4 h-4 mr-2" />
                Download XML (UBL 2.1)
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Free users can download up to 10 invoices (combined PDF + XML). {10 - invoiceCount} downloads remaining.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
