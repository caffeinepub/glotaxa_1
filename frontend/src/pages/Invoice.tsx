import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Printer, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LineItemEntry } from "@/App";
import { downloadInvoicePDF } from "@/utils/invoicePDF";
import { downloadInvoiceXML } from "@/utils/invoiceXML";
import { VAT_RULES } from "@/data/vatRules";
import type { CountryCode } from "@/data/vatRules";
import type { Invoice16931, InvoiceLineItem } from "@/types/invoice";

// Derive VAT rate from a VAT category string (from VAT_CATEGORIES) and country rules
function getVatRateForCategory(vatCategory: string, country: CountryCode): number {
  const rules = VAT_RULES[country];
  if (!rules) return 0;

  // Map VAT_CATEGORIES values to rate tiers
  switch (vatCategory) {
    case "Financial Services":
    case "Insurance":
    case "Education":
      return 0; // exempt
    case "Exports":
    case "Intra-EU B2B":
      return 0; // zero / reverse charge
    case "Basic Food":
    case "Books":
    case "Medical":
    case "Transport":
    case "Hotel":
      if (country === "GB") return 0; // zero-rated for GB food/books
      return rules.reduced ?? rules.standard;
    case "Others":
    default:
      return rules.standard;
  }
}

// Derive a display label for the VAT category
function getVatCategoryLabel(vatCategory: string, country: CountryCode): string {
  switch (vatCategory) {
    case "Financial Services":
    case "Insurance":
    case "Education":
      return "Exempt";
    case "Exports":
      return "Zero Rate";
    case "Intra-EU B2B":
      return "Reverse Charge";
    case "Basic Food":
    case "Books":
    case "Medical":
    case "Transport":
    case "Hotel":
      if (country === "GB") return "Zero Rate";
      return "Reduced Rate";
    case "Others":
    default:
      return "Standard Rate";
  }
}

const CURRENCIES = ["EUR", "GBP", "USD", "PLN", "SEK", "HUF"];

interface InvoiceProps {
  calculationData: any;
  selectedCountry: string;
  lineItems: LineItemEntry[];
}

export function Invoice({ calculationData, selectedCountry, lineItems }: InvoiceProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2024-001");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [currency, setCurrency] = useState("EUR");
  const [paymentMeans, setPaymentMeans] = useState("Bank Transfer");
  const [iban, setIban] = useState("GB00BANK00000000000000");
  const [earlyPaymentDiscount, setEarlyPaymentDiscount] = useState("2% if paid within 10 days");
  const [latePenaltyTerms, setLatePenaltyTerms] = useState("1.5% per month on overdue amounts");
  const [notes, setNotes] = useState("");

  // Seller details
  const [sellerName, setSellerName] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerVatNumber, setSellerVatNumber] = useState(
    calculationData?.supplierVatId || ""
  );
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");

  // Buyer details
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState(
    calculationData?.buyerVatId || ""
  );
  const [buyerContractNumber, setBuyerContractNumber] = useState("");

  // Sync VAT IDs from calculationData when it changes
  useEffect(() => {
    if (calculationData?.supplierVatId) {
      setSellerVatNumber(calculationData.supplierVatId);
    }
    if (calculationData?.buyerVatId) {
      setBuyerTaxId(calculationData.buyerVatId);
    }
  }, [calculationData]);

  // Determine the effective country for VAT rate resolution
  const effectiveCountry: CountryCode =
    ((calculationData?.supplierCountry || selectedCountry) as CountryCode) || "DE";

  // Filter valid line items (non-empty description or non-zero net amount)
  const validLineItems = useMemo(
    () =>
      lineItems.filter(
        (item) =>
          item.description.trim() !== "" ||
          (item.netAmount !== "" && Number(item.netAmount) > 0)
      ),
    [lineItems]
  );

  // Compute per-line totals
  const lineItemTotals = useMemo(
    () =>
      validLineItems.map((item) => {
        const net = Number(item.netAmount) || 0;
        const vatRate = getVatRateForCategory(item.vatCategory, effectiveCountry);
        const vatAmount = (net * vatRate) / 100;
        return { net, vatRate, vatAmount, gross: net + vatAmount };
      }),
    [validLineItems, effectiveCountry]
  );

  const totalNet = useMemo(
    () => lineItemTotals.reduce((sum, t) => sum + t.net, 0),
    [lineItemTotals]
  );
  const totalVat = useMemo(
    () => lineItemTotals.reduce((sum, t) => sum + t.vatAmount, 0),
    [lineItemTotals]
  );
  const totalGross = totalNet + totalVat;

  // Group VAT breakdown by rate (for taxDetails in Invoice16931)
  const taxDetails = useMemo(() => {
    const details: { [vatRate: string]: number } = {};
    lineItemTotals.forEach((t) => {
      const key = t.vatRate.toString();
      details[key] = (details[key] || 0) + t.vatAmount;
    });
    return details;
  }, [lineItemTotals]);

  // Group VAT breakdown by rate with category label for display
  const vatBreakdown = useMemo(() => {
    const breakdown: Record<
      number,
      { net: number; vat: number; categoryLabel: string }
    > = {};
    validLineItems.forEach((item, i) => {
      const rate = lineItemTotals[i].vatRate;
      if (!breakdown[rate]) {
        breakdown[rate] = {
          net: 0,
          vat: 0,
          categoryLabel: getVatCategoryLabel(item.vatCategory, effectiveCountry),
        };
      }
      breakdown[rate].net += lineItemTotals[i].net;
      breakdown[rate].vat += lineItemTotals[i].vatAmount;
    });
    return breakdown;
  }, [validLineItems, lineItemTotals, effectiveCountry]);

  function buildInvoice16931(): Invoice16931 {
    const cleanLineItems: InvoiceLineItem[] = validLineItems.map((item, i) => ({
      itemType: item.vatCategory,
      description: item.description || `Item ${i + 1}`,
      quantity: 1,
      unitPrice: Number(item.netAmount) || 0,
      amount: Number(item.netAmount) || 0,
      vatRate: lineItemTotals[i].vatRate,
    }));

    return {
      header: {
        invoiceNumber,
        invoiceDate,
        invoiceType: "Invoice",
      },
      seller: {
        name: sellerName || "Seller",
        address: sellerAddress || "",
        vatNumber: sellerVatNumber || "",
        email: sellerEmail || "",
        phone: sellerPhone || "",
      },
      buyer: {
        name: buyerName || "Buyer",
        address: buyerAddress || "",
        taxIdOrBusinessRegNumber: buyerTaxId || "",
        publicContractNumber: buyerContractNumber || "",
      },
      lineItems: cleanLineItems,
      taxDetails,
      subtotal: totalNet,
      grandTotal: totalGross,
      currency,
      paymentTerms: {
        paymentDueDate: dueDate,
        paymentMeans,
        bankingInfo: { iban },
        earlyPaymentDiscount,
        latePenaltyTerms,
      },
    };
  }

  const handlePrint = () => {
    downloadInvoicePDF(buildInvoice16931());
  };

  const handleDownloadXML = () => {
    downloadInvoiceXML(buildInvoice16931());
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">EN 16931 Compliant Invoice</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadXML}>
            <Download className="h-4 w-4 mr-2" />
            Download XML
          </Button>
        </div>
      </div>

      {validLineItems.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No line items found. Please add line items in the Transaction tab to populate this invoice.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-2024-001"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Seller
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Seller name"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                />
                <Input
                  placeholder="Seller address"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="VAT Number"
                    value={sellerVatNumber}
                    onChange={(e) => setSellerVatNumber(e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Buyer
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Buyer name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
                <Input
                  placeholder="Buyer address"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Tax ID / VAT ID"
                    value={buyerTaxId}
                    onChange={(e) => setBuyerTaxId(e.target.value)}
                  />
                  <Input
                    placeholder="Contract No. (optional)"
                    value={buyerContractNumber}
                    onChange={(e) => setBuyerContractNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {validLineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No line items to display. Add items in the Transaction tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">
                      Net Amount
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">
                      VAT Category
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">
                      VAT Rate
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">
                      VAT Amount
                    </th>
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">
                      Gross
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validLineItems.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {item.description || `Item ${i + 1}`}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {currency} {Number(item.netAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-xs">
                          {getVatCategoryLabel(item.vatCategory, effectiveCountry)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {lineItemTotals[i].vatRate}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        {currency} {lineItemTotals[i].vatAmount.toFixed(2)}
                      </td>
                      <td className="py-3 pl-4 text-right font-semibold">
                        {currency} {lineItemTotals[i].gross.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals & VAT Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VAT Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">VAT Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(vatBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No VAT data available.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(vatBreakdown).map(([rate, data]) => (
                  <div
                    key={rate}
                    className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {data.categoryLabel}
                      </Badge>
                      <span className="text-muted-foreground">{rate}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground mr-3">
                        Net: {currency} {data.net.toFixed(2)}
                      </span>
                      <span className="font-medium">
                        VAT: {currency} {data.vat.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Total Net</span>
                <span className="font-medium">
                  {currency} {totalNet.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Total VAT</span>
                <span className="font-medium">
                  {currency} {totalVat.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between py-2">
                <span className="font-semibold text-base">Total Gross</span>
                <span className="font-bold text-base text-primary">
                  {currency} {totalGross.toFixed(2)}
                </span>
              </div>
            </div>

            {calculationData?.isOSS && (
              <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  OSS (One Stop Shop) applicable for this transaction.
                </p>
              </div>
            )}

            {calculationData?.buyerType === "B2B" &&
              calculationData?.supplierCountry !== calculationData?.buyerCountry && (
                <div className="mt-4 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    Cross-border B2B transaction. Reverse charge may apply.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Payment Means</Label>
            <Input
              value={paymentMeans}
              onChange={(e) => setPaymentMeans(e.target.value)}
              placeholder="Bank Transfer"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">IBAN</Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="GB00BANK00000000000000"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Early Payment Discount</Label>
            <Input
              value={earlyPaymentDiscount}
              onChange={(e) => setEarlyPaymentDiscount(e.target.value)}
              placeholder="2% if paid within 10 days"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Late Payment Penalty</Label>
            <Input
              value={latePenaltyTerms}
              onChange={(e) => setLatePenaltyTerms(e.target.value)}
              placeholder="1.5% per month on overdue amounts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional notes or payment instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
