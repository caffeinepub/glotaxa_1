import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { RegionSelect } from './pages/RegionSelect';
import { Transaction } from './pages/Transaction';
import { Invoice } from './pages/Invoice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CountryCode } from './data/vatRules';
import type { InvoiceLineItem } from './types/invoice';

interface CalculationResult {
  vatRate: number;
  vatType: string;
  vatAmount: number;
  total: number;
}

interface InvoiceData {
  country: CountryCode;
  category: string;
  amount: number;
  result: CalculationResult;
  initialLineItem?: InvoiceLineItem;
}

function App() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [activeTab, setActiveTab] = useState<string>('country');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const handleStartApp = () => {
    setShowCalculator(true);
  };

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    setActiveTab('transaction');
  };

  const handleGoToInvoice = (result: CalculationResult, amount: number, category: string, initialLineItem: InvoiceLineItem) => {
    if (selectedCountry) {
      setInvoiceData({
        country: selectedCountry,
        category,
        amount,
        result,
        initialLineItem,
      });
      setActiveTab('invoice');
    }
  };

  if (!showCalculator) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <LandingPage startApp={handleStartApp} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="country">Country Selection</TabsTrigger>
            <TabsTrigger value="transaction" disabled={!selectedCountry}>
              Transaction
            </TabsTrigger>
            <TabsTrigger value="invoice" disabled={!invoiceData}>
              Invoice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="country">
            <RegionSelect selectCountry={handleSelectCountry} />
          </TabsContent>

          <TabsContent value="transaction">
            {selectedCountry && (
              <Transaction country={selectedCountry} goToInvoice={handleGoToInvoice} />
            )}
          </TabsContent>

          <TabsContent value="invoice">
            {invoiceData && <Invoice data={invoiceData} initialLineItem={invoiceData.initialLineItem} />}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

export default App;
