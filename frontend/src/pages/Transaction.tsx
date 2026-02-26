import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { calculateVAT, VAT_CATEGORIES } from "@/engine/vatEngine";
import type { CountryCode } from "@/data/vatRules";
import { CompliancePanel } from "@/components/CompliancePanel";
import { calculateComplianceScore } from "@/utils/complianceScoreCalculator";
import { riskDetector } from "@/utils/riskDetector";
import type { LineItemEntry } from "@/App";

// VAT Categories for line item selector (from vatEngine)
const LINE_ITEM_VAT_CATEGORIES = VAT_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat,
}));

interface TransactionProps {
  selectedCountry: string;
  onCalculationChange: (data: any) => void;
  lineItems: LineItemEntry[];
  setLineItems: (items: LineItemEntry[]) => void;
}

const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "SE", name: "Sweden" },
  { code: "IT", name: "Italy" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "HU", name: "Hungary" },
  { code: "ES", name: "Spain" },
  { code: "GB", name: "United Kingdom" },
];

export function Transaction({
  selectedCountry,
  onCalculationChange,
  lineItems,
  setLineItems,
}: TransactionProps) {
  const [buyerType, setBuyerType] = useState<"B2B" | "B2C">("B2B");
  const [supplierCountry, setSupplierCountry] = useState<CountryCode>(
    (selectedCountry as CountryCode) || "DE"
  );
  const [buyerCountry, setBuyerCountry] = useState<CountryCode>("DE");
  const [category, setCategory] = useState<string>("Others");
  const [netAmount, setNetAmount] = useState<number>(1000);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [vatId, setVatId] = useState("");
  const [reverseChargeNote, setReverseChargeNote] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  useEffect(() => {
    if (selectedCountry) {
      setSupplierCountry(selectedCountry as CountryCode);
    }
  }, [selectedCountry]);

  useEffect(() => {
    try {
      const isB2B = buyerType === "B2B";
      const result = calculateVAT(
        supplierCountry,
        category,
        netAmount,
        supplierCountry,
        buyerCountry,
        isB2B
      );
      setCalculationResult(result);
      onCalculationChange({
        ...result,
        supplierCountry,
        buyerCountry,
        buyerType,
        category,
        netAmount,
        invoiceNumber,
        vatId,
        reverseChargeNote,
      });
    } catch {
      // ignore calculation errors
    }
  }, [
    supplierCountry,
    buyerCountry,
    buyerType,
    category,
    netAmount,
    invoiceNumber,
    vatId,
    reverseChargeNote,
  ]);

  const updateLineItem = (
    index: number,
    field: keyof LineItemEntry,
    value: string | number
  ) => {
    const updated = lineItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setLineItems(updated);
  };

  // Compliance score using the existing ComplianceData shape
  const complianceResult = calculateComplianceScore({
    vatId,
    buyerType,
    invoiceNumber,
    category,
    crossBorder: supplierCountry !== buyerCountry,
    reverseChargeNote,
  });

  // Risk detection using the existing riskDetector
  const risks = calculationResult
    ? riskDetector({
        sellerCountry: supplierCountry,
        buyerCountry,
        buyerType,
        vatCategory: calculationResult.vatCategory,
      })
    : [];

  const allWarnings = [
    ...complianceResult.deductions.map((d) => d.reason),
    ...risks,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Transaction Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buyer Type */}
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <div className="flex gap-2">
                  {(["B2B", "B2C"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setBuyerType(type)}
                      className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                        buyerType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Supplier Country</Label>
                  <Select
                    value={supplierCountry}
                    onValueChange={(v) => setSupplierCountry(v as CountryCode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Buyer Country</Label>
                  <Select
                    value={buyerCountry}
                    onValueChange={(v) => setBuyerCountry(v as CountryCode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* VAT Category */}
              <div className="space-y-2">
                <Label>VAT Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Net Amount */}
              <div className="space-y-2">
                <Label>Net Amount (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={netAmount}
                  onChange={(e) => setNetAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Invoice Number */}
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. INV-2024-001"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              {/* VAT ID */}
              {buyerType === "B2B" && (
                <div className="space-y-2">
                  <Label>Buyer VAT ID</Label>
                  <Input
                    type="text"
                    placeholder="e.g. DE123456789"
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                  />
                </div>
              )}

              {/* Reverse Charge Note */}
              {supplierCountry !== buyerCountry && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="reverseChargeNote"
                    checked={reverseChargeNote}
                    onChange={(e) => setReverseChargeNote(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="reverseChargeNote" className="text-sm cursor-pointer">
                    Invoice includes reverse charge note
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter up to 3 line items for this invoice. Each item will appear in the Invoice tab with its VAT category and rate.
              </p>
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="space-y-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Item {index + 1}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Input
                      type="text"
                      placeholder={`Line item ${index + 1} description`}
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Net Amount (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={item.netAmount === "" ? "" : item.netAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateLineItem(
                            index,
                            "netAmount",
                            val === "" ? ("" as any) : parseFloat(val) || 0
                          );
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">VAT Category</Label>
                      <Select
                        value={item.vatCategory}
                        onValueChange={(val) =>
                          updateLineItem(index, "vatCategory", val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINE_ITEM_VAT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4">
          {calculationResult ? (
            <>
              <CompliancePanel
                vatRate={calculationResult.vatRate}
                vatType={calculationResult.vatType}
                complianceScore={complianceResult.score}
                warnings={allWarnings}
                isOSS={calculationResult.isOSS}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    VAT Calculation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Net Amount</p>
                      <p className="font-semibold">€{netAmount.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">VAT Rate</p>
                      <p className="font-semibold">{calculationResult.vatRate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">VAT Amount</p>
                      <p className="font-semibold">
                        €{calculationResult.vatAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Gross Amount</p>
                      <p className="font-semibold text-primary">
                        €{calculationResult.total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction</span>
                      <Badge variant="outline">{buyerType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route</span>
                      <span className="font-medium">
                        {supplierCountry} → {buyerCountry}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT Type</span>
                      <Badge variant="secondary">{calculationResult.vatType}</Badge>
                    </div>
                    {calculationResult.isOSS && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">OSS</span>
                        <Badge variant="secondary">Applicable</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Fill in the transaction details to see VAT calculation results.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
