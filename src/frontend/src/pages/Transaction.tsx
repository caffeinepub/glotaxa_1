import { useState, useEffect } from 'react';
import { VAT_CATEGORIES, calculateVAT, type VATCalculationResult } from '../engine/vatEngine';
import type { CountryCode } from '../data/vatRules';
import { VAT_RULES } from '../data/vatRules';
import type { InvoiceLineItem } from '../types/invoice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface TransactionProps {
  country: CountryCode;
  goToInvoice: (result: VATCalculationResult, amount: number, category: string, initialLineItem: InvoiceLineItem) => void;
}

export function Transaction({ country, goToInvoice }: TransactionProps) {
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>("Others");
  const [result, setResult] = useState<VATCalculationResult | null>(null);

  useEffect(() => {
    if (amount > 0) {
      const calculationResult = calculateVAT(country, category, amount, country, country, false);
      setResult(calculationResult);
    } else {
      setResult(null);
    }
  }, [amount, category, country]);

  const handleGenerateInvoice = () => {
    if (result && amount > 0) {
      // Create initial line item from transaction data
      const initialLineItem: InvoiceLineItem = {
        itemType: category,
        description: `${category} service`,
        quantity: 1,
        unitPrice: amount,
        amount: amount,
        vatRate: result.vatRate,
      };
      
      goToInvoice(result, amount, category, initialLineItem);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">VAT Calculator</h2>
        <p className="text-muted-foreground">
          Calculating for {VAT_RULES[country].name}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Enter the net amount and select category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 overflow-visible">
            <div className="space-y-2">
              <Label htmlFor="amount">Net Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Net Amount"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">VAT Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-[calc(3*2.5rem)] overflow-y-auto">
                  {VAT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Important Notice:</strong> Select the category that best matches your goods or services for VAT calculation. 
                Reduced VAT rates apply only to specific goods and services as defined under national VAT legislation. 
                Users are responsible for verifying eligibility before applying reduced rates. 
                If unsure, select "Others" to apply the standard VAT rate.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Calculation Results</CardTitle>
            <CardDescription>VAT breakdown and total</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">VAT Type:</span>
                  <span className="font-semibold">{result.vatType}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">VAT Rate:</span>
                  <span className="font-semibold">{result.vatRate}%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Net Amount:</span>
                  <span className="font-semibold">€{amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">VAT Amount:</span>
                  <span className="font-semibold">€{result.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-bold bg-muted/50 px-4 rounded-lg">
                  <span>Total:</span>
                  <span>€{result.total.toFixed(2)}</span>
                </div>

                <Button 
                  onClick={handleGenerateInvoice} 
                  className="w-full mt-6"
                  disabled={amount <= 0}
                >
                  Generate Invoice
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Enter a net amount to see VAT calculation
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
