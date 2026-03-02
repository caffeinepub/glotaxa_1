import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import RegionSelect from './pages/RegionSelect';
import Transaction from './pages/Transaction';
import Invoice from './pages/Invoice';
import ApiDocs from './pages/ApiDocs';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import OtpVerification from './pages/OtpVerification';
import Dashboard from './pages/Dashboard';
import InvoicePreview from './pages/InvoicePreview';
import { AuthProvider, useAuth } from './contexts/AuthContext';

export type TabName = 'country' | 'transaction' | 'invoice' | 'apidocs' | 'pricing';

export type AppScreen =
  | 'login'
  | 'otp'
  | 'dashboard'
  | 'main'
  | 'invoice-preview';

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

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  const [screen, setScreen] = useState<AppScreen>('login');
  const [otpEmail, setOtpEmail] = useState('');
  const [activeTab, setActiveTab] = useState<TabName>('country');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [invoicePrePopData, setInvoicePrePopData] = useState<InvoicePrePopData | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    invoiceNumber: string;
    totalAmount: number;
    currency: string;
  } | null>(null);

  // On mount: if already authenticated, go to main app
  useEffect(() => {
    const token = localStorage.getItem('supabase_access_token');
    const uid = localStorage.getItem('supabase_user_id');
    if (token && uid) {
      setScreen('main');
    }
  }, []);

  const handleOtpSent = (email: string) => {
    setOtpEmail(email);
    setScreen('otp');
  };

  const handleOtpVerified = () => {
    setScreen('dashboard');
  };

  const handleSkipLogin = () => {
    setScreen('main');
  };

  const handleLogout = () => {
    logout();
    setScreen('login');
    setActiveTab('country');
  };

  const selectCountry = (country: string) => {
    setSelectedCountry(country);
    setActiveTab('transaction');
  };

  const handleGenerateInvoice = (data: InvoicePrePopData) => {
    setInvoicePrePopData(data);
    setActiveTab('invoice');
  };

  const handleInvoiceGenerated = (invoiceNumber: string, totalAmount: number, currency: string) => {
    setGeneratedInvoice({ invoiceNumber, totalAmount, currency });
    setScreen('invoice-preview');
  };

  const handleNavigateFromDashboard = (tab: string) => {
    if (tab === 'pricing') {
      setActiveTab('pricing');
      setScreen('main');
    } else if (tab === 'invoice') {
      setActiveTab('invoice');
      setScreen('main');
    } else if (tab === 'country') {
      setActiveTab('country');
      setScreen('main');
    } else {
      setScreen('main');
    }
  };

  // ── Auth screens (no header/footer tabs) ──
  if (screen === 'login') {
    return <Login onOtpSent={handleOtpSent} onSkip={handleSkipLogin} />;
  }

  if (screen === 'otp') {
    return (
      <OtpVerification
        email={otpEmail}
        onVerified={handleOtpVerified}
        onBack={() => setScreen('login')}
      />
    );
  }

  // ── Dashboard screen ──
  if (screen === 'dashboard') {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header
          onNavigateDashboard={() => setScreen('dashboard')}
          onLogout={handleLogout}
        />
        <main className="flex-1">
          <Dashboard
            onNavigate={handleNavigateFromDashboard}
            onLogout={handleLogout}
          />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Invoice Preview screen ──
  if (screen === 'invoice-preview' && generatedInvoice) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header
          onNavigateDashboard={isAuthenticated ? () => setScreen('dashboard') : undefined}
          onLogout={handleLogout}
        />
        <main className="flex-1">
          <InvoicePreview
            invoiceNumber={generatedInvoice.invoiceNumber}
            totalAmount={generatedInvoice.totalAmount}
            currency={generatedInvoice.currency}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setScreen('main');
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Main app (tabbed interface) ──
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header
        onNavigateDashboard={isAuthenticated ? () => setScreen('dashboard') : undefined}
        onLogout={handleLogout}
      />

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
            onInvoiceGenerated={handleInvoiceGenerated}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
