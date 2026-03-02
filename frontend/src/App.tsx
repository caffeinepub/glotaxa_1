import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import RegionSelect from './pages/RegionSelect';
import Transaction from './pages/Transaction';
import Invoice from './pages/Invoice';
import ApiDocs from './pages/ApiDocs';
import Pricing from './pages/Pricing';

export type TabName = 'country' | 'transaction' | 'invoice' | 'apidocs' | 'pricing';

export interface InvoicePrePopData {
  country: string;
  vatRate: number;
  vatType: string;
  netAmount: number;
  grossAmount: number;
  vatAmount: number;
  buyerType: string;
  category: string;
  isOSS: boolean;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('country');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [invoicePrePopData, setInvoicePrePopData] = useState<InvoicePrePopData | null>(null);

  const selectCountry = (country: string) => {
    setSelectedCountry(country);
    setActiveTab('transaction');
  };

  const handleGenerateInvoice = (data: InvoicePrePopData) => {
    setInvoicePrePopData(data);
    setActiveTab('invoice');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 py-2 overflow-x-auto" aria-label="Main navigation">
            {[
              { id: 'country', label: '1. Select Region' },
              { id: 'transaction', label: '2. Transaction' },
              { id: 'invoice', label: '3. Invoice' },
              { id: 'apidocs', label: '4. API Docs' },
              { id: 'pricing', label: '5. Pricing' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabName)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1">
        {activeTab === 'country' && (
          <RegionSelect
            selectCountry={selectCountry}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'transaction' && (
          <Transaction
            selectedCountry={selectedCountry}
            setActiveTab={setActiveTab}
            onGenerateInvoice={handleGenerateInvoice}
          />
        )}
        {activeTab === 'invoice' && (
          <Invoice
            setActiveTab={setActiveTab}
            prePopData={invoicePrePopData}
          />
        )}
        {activeTab === 'apidocs' && (
          <ApiDocs setActiveTab={setActiveTab} />
        )}
        {activeTab === 'pricing' && (
          <Pricing />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
