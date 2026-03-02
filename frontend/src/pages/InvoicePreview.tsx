import { CheckCircle, Download, FileCode, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabName } from '../App';

interface InvoicePreviewProps {
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  setActiveTab: (tab: TabName) => void;
}

export default function InvoicePreview({
  invoiceNumber,
  totalAmount,
  currency,
  setActiveTab,
}: InvoicePreviewProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Back */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('invoice')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoice
        </Button>
      </div>

      {/* Success banner */}
      <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Invoice Created!</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your invoice has been successfully generated and is ready to download.
        </p>

        {/* Invoice summary */}
        <div className="bg-muted/40 rounded-xl p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Invoice Number</span>
            <span className="text-sm font-semibold text-foreground font-mono">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="text-sm font-semibold text-foreground">
              {currency} {totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Generated
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => setActiveTab('invoice')} className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Edit Invoice
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('country')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Tip */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        Use the PDF or XML export buttons on the Invoice page to download your invoice.
      </p>
    </div>
  );
}
