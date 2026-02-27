import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabName, InvoicePrePopData } from '../App';
import { VAT_RULES } from '../data/vatRules';
import type { CountryCode } from '../data/vatRules';
import { calculateVAT, VAT_CATEGORIES } from '../engine/vatEngine';
import { explainVATDecision } from '../utils/vatLogicExplainer';
import { CompliancePanel } from '../components/CompliancePanel';
import { calculateComplianceScore } from '../utils/complianceScoreCalculator';
import { riskDetector } from '../utils/riskDetector';
import { TransportVatModal } from '../components/TransportVatModal';

interface TransactionProps {
  selectedCountry: string;
  setActiveTab: (tab: TabName) => void;
  onGenerateInvoice: (data: InvoicePrePopData) => void;
}

const COUNTRIES = Object.entries(VAT_RULES).map(([code, rule]) => ({
  code: code as CountryCode,
  name: rule.name,
}));

export default function Transaction({ selectedCountry, setActiveTab, onGenerateInvoice }: TransactionProps) {
  const [buyerType, setBuyerType] = useState<'B2B' | 'B2C'>('B2B');
  const [buyerCountry, setBuyerCountry] = useState<CountryCode>((selectedCountry as CountryCode) || 'DE');
  const [category, setCategory] = useState<string>('Others');
  const [netAmount, setNetAmount] = useState<number>(1000);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vatId, setVatId] = useState('');
  const [reverseChargeNote, setReverseChargeNote] = useState(false);
  const [calculationResult, setCalculationResult] = useState<ReturnType<typeof calculateVAT> | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [isPublicTransport, setIsPublicTransport] = useState(false);

  const supplierCountry = (selectedCountry as CountryCode) || 'DE';
  const countryRule = VAT_RULES[supplierCountry];
  const countryName = countryRule?.name || selectedCountry;

  // Show Transport modal when UK + Transport is selected
  useEffect(() => {
    if (supplierCountry === 'GB' && category === 'Transport') {
      setShowTransportModal(true);
    }
  }, [category, supplierCountry]);

  // Reset public transport flag when category changes away from Transport
  useEffect(() => {
    if (category !== 'Transport') {
      setIsPublicTransport(false);
    }
  }, [category]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    // Reset calculation when category changes
    setCalculationResult(null);
    setHasCalculated(false);
  };

  const handleCalculate = () => {
    try {
      const result = calculateVAT(
        supplierCountry,
        category,
        netAmount,
        supplierCountry,
        buyerCountry,
        buyerType === 'B2B',
        isPublicTransport
      );
      setCalculationResult(result);
      setHasCalculated(true);
    } catch {
      // ignore calculation errors
    }
  };

  // Compliance score
  const complianceResult = calculateComplianceScore({
    vatId,
    buyerType,
    invoiceNumber,
    category,
    crossBorder: supplierCountry !== buyerCountry,
    reverseChargeNote,
  });

  // Risk detection
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

  // VAT decision explanation
  const vatExplanation: string | null =
    calculationResult && hasCalculated
      ? explainVATDecision({
          sellerCountry: supplierCountry,
          buyerCountry,
          buyerType,
          category,
          rate: calculationResult.vatRate,
          vatType: calculationResult.vatType,
          isOSS: calculationResult.isOSS,
          complianceScore: complianceResult.score,
          risks,
          note: calculationResult.note,
        })
      : null;

  const handleGenerateInvoice = () => {
    if (!calculationResult) return;
    onGenerateInvoice({
      country: supplierCountry,
      vatRate: calculationResult.vatRate,
      vatType: calculationResult.vatType,
      netAmount,
      grossAmount: calculationResult.total,
      vatAmount: calculationResult.vatAmount,
      buyerType,
      category,
      isOSS: calculationResult.isOSS,
    });
  };

  const severityStyles = {
    critical: 'border-destructive/40 bg-destructive/5',
    warning: 'border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20',
    info: 'border-primary/20 bg-primary/5',
  };

  const severityIconStyles = {
    critical: 'text-destructive',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-primary',
  };

  // Important notices
  const importantNotices: { title: string; body: string; severity: 'info' | 'warning' | 'critical' }[] = [];
  if (calculationResult) {
    const isCrossBorder = supplierCountry !== buyerCountry;
    if (calculationResult.isOSS) {
      importantNotices.push({
        title: 'EU OSS Registration Required',
        body: `Cross-border B2C sales to EU consumers require VAT registration under the EU One Stop Shop (OSS) scheme once annual cross-border B2C sales exceed €10,000. The buyer country's VAT rate (${calculationResult.vatRate}%) applies.`,
        severity: 'critical',
      });
    }
    if (calculationResult.vatType === 'Reverse Charge') {
      importantNotices.push({
        title: 'Reverse Charge Applies',
        body: "The invoice must include the statement: 'Reverse Charge — VAT to be accounted for by the customer.' The buyer is responsible for self-assessing VAT in their country under EU VAT Directive Article 196.",
        severity: 'warning',
      });
    }
    if (buyerType === 'B2B' && isCrossBorder) {
      importantNotices.push({
        title: 'Buyer VAT ID Verification',
        body: 'For cross-border B2B transactions, you must verify the buyer\'s VAT ID using the EU VIES system before issuing the invoice.',
        severity: 'warning',
      });
    }
    if (calculationResult.vatType === 'Standard' && !isCrossBorder) {
      importantNotices.push({
        title: 'Standard Rate Domestic Transaction',
        body: 'Standard VAT rate applies. Ensure the invoice includes all mandatory fields: invoice number, date, supplier and buyer details, VAT number, description of goods/services, net amount, VAT rate, VAT amount, and gross total.',
        severity: 'info',
      });
    }
    // UK-specific notices
    if (supplierCountry === 'GB') {
      if (category === 'Financial Services') {
        importantNotices.push({
          title: 'No Input VAT Reclaim',
          body: 'Financial services are VAT-exempt in the UK. No input VAT reclaim is available on costs directly attributable to exempt financial services supplies.',
          severity: 'warning',
        });
      }
      if (category === 'Insurance') {
        importantNotices.push({
          title: 'Insurance Premium Tax Applies Separately',
          body: 'Insurance is VAT-exempt in the UK. Insurance Premium Tax (IPT) applies separately at either the standard rate (12%) or higher rate (20%) depending on the type of insurance.',
          severity: 'info',
        });
      }
      if (category === 'Education') {
        importantNotices.push({
          title: 'Eligible Institutions Only',
          body: 'Education is zero-rated for VAT in the UK when provided by eligible institutions: schools, universities, and approved training providers. Verify HMRC eligibility before applying 0%.',
          severity: 'info',
        });
      }
      if (category === 'Exports') {
        importantNotices.push({
          title: 'Proof of Export Required',
          body: 'Exports outside the UK are zero-rated. You must retain proof of export (customs documentation, shipping records) to support the 0% zero-rating claim.',
          severity: 'warning',
        });
      }
      if (category === 'Intra-EU B2B') {
        importantNotices.push({
          title: 'Valid EU VAT ID Required',
          body: 'Intra-EU B2B supplies from the UK are subject to 0% VAT under the reverse charge mechanism. A valid EU VAT ID from the buyer must be obtained and verified before applying this treatment.',
          severity: 'warning',
        });
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Transport VAT Modal (UK only) */}
      <TransportVatModal
        open={showTransportModal}
        onClose={() => setShowTransportModal(false)}
      />

      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('country')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Region Select
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Transaction Details — {countryName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your transaction parameters to calculate the applicable VAT rate.
        </p>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Transaction Details */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
            Transaction Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Seller Country</label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground font-medium">
              {countryName} ({supplierCountry})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Buyer Type</label>
            <div className="flex gap-2">
              {(['B2B', 'B2C'] as const).map((bt) => (
                <button
                  key={bt}
                  onClick={() => setBuyerType(bt)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    buyerType === bt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-foreground'
                  }`}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Buyer Country</label>
            <select
              value={buyerCountry}
              onChange={(e) => setBuyerCountry(e.target.value as CountryCode)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {COUNTRIES.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Net Amount (€)</label>
            <input
              type="number"
              value={netAmount}
              onChange={(e) => setNetAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="1000"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. INV-2024-001"
            />
          </div>

          {buyerType === 'B2B' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Buyer VAT ID</label>
              <input
                type="text"
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. DE123456789"
              />
            </div>
          )}

          {supplierCountry !== buyerCountry && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="reverseChargeNote"
                checked={reverseChargeNote}
                onChange={(e) => setReverseChargeNote(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="reverseChargeNote" className="text-sm cursor-pointer text-foreground">
                Invoice includes reverse charge note
              </label>
            </div>
          )}

          {/* UK Transport: public transport toggle */}
          {supplierCountry === 'GB' && category === 'Transport' && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <input
                type="checkbox"
                id="publicTransport"
                checked={isPublicTransport}
                onChange={(e) => setIsPublicTransport(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="publicTransport" className="text-sm cursor-pointer text-foreground">
                This is public transport (bus/train) — 0% VAT
              </label>
            </div>
          )}

          <Button onClick={handleCalculate} className="w-full">
            Calculate VAT
          </Button>
        </div>

        {/* Column 2: VAT Category */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">VAT Category</h2>
          </div>
          <div className="flex flex-col">
            {VAT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors border-b last:border-b-0 border-border/50 ${
                  category === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span>{cat}</span>
                  <span className="flex items-center gap-2">
                    {/* UK rate hint badges */}
                    {supplierCountry === 'GB' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-normal ${
                        category === cat
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {cat === 'Basic Food' && '0%'}
                        {cat === 'Medical' && '0%'}
                        {cat === 'Transport' && '0%/20%'}
                        {cat === 'Hotel' && '20%'}
                        {cat === 'Financial Services' && 'Exempt'}
                        {cat === 'Insurance' && 'Exempt'}
                        {cat === 'Education' && '0%'}
                        {cat === 'Exports' && '0%'}
                        {cat === 'Intra-EU B2B' && 'RC'}
                        {cat === 'Books' && '0%'}
                        {cat === 'Others' && '20%'}
                      </span>
                    )}
                    {category === cat && (
                      <span className="text-xs opacity-75 font-normal">Selected</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: VAT Calculation Summary / Compliance Panel */}
        <div className="space-y-4">
          {calculationResult && hasCalculated ? (
            <>
              <CompliancePanel
                vatRate={calculationResult.vatRate}
                vatType={calculationResult.vatType}
                complianceScore={complianceResult.score}
                warnings={allWarnings}
                isOSS={calculationResult.isOSS}
              />

              {/* VAT Calculation Summary */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  VAT Calculation Summary
                </h3>
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
                    <p className="font-semibold">€{calculationResult.vatAmount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Gross Amount</p>
                    <p className="font-semibold text-primary">€{calculationResult.total.toFixed(2)}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction</span>
                    <span className="font-medium">{buyerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium">{supplierCountry} → {buyerCountry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT Type</span>
                    <span className="font-medium">{calculationResult.vatType}</span>
                  </div>
                </div>
                {/* UK-specific note */}
                {calculationResult.note && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                      {calculationResult.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Generate Invoice Button */}
              <Button
                onClick={handleGenerateInvoice}
                className="w-full flex items-center justify-center gap-2 font-semibold"
                size="lg"
              >
                <FileText className="w-5 h-5" />
                Generate Invoice
              </Button>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px] gap-3">
              <Info className="w-10 h-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select a VAT category and click <strong>Calculate VAT</strong> to see the compliance summary.
              </p>
              <Button
                disabled
                variant="outline"
                className="w-full flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                size="lg"
              >
                <FileText className="w-5 h-5" />
                Generate Invoice
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Important Notices + VAT Explanation */}
      {calculationResult && hasCalculated && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Important Notices */}
          {importantNotices.length > 0 && (
            <div className="space-y-3">
              {importantNotices.map((notice, i) => (
                <div
                  key={i}
                  className={`border rounded-xl p-4 ${severityStyles[notice.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${severityIconStyles[notice.severity]}`} />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{notice.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{notice.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VAT Explanation */}
          {vatExplanation && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                VAT Decision Explanation
              </h3>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {vatExplanation}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
