import { useEffect, useState } from "react";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ApiDocs from "./pages/ApiDocs";
import Dashboard from "./pages/Dashboard";
import Invoice from "./pages/Invoice";
import InvoicePreview from "./pages/InvoicePreview";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import RegionSelect from "./pages/RegionSelect";
import Terms from "./pages/Terms";
import Transaction from "./pages/Transaction";

export type TabName =
  | "signin"
  | "country"
  | "transaction"
  | "invoice"
  | "apidocs"
  | "pricing";

export type AppScreen =
  | "login"
  | "magic-link-sent"
  | "dashboard"
  | "main"
  | "invoice-preview";

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

function LegalPageRouter() {
  const path = window.location.pathname;
  if (path === "/terms") return <Terms />;
  if (path === "/privacy") return <Privacy />;
  if (path === "/refund") return <Refund />;
  return null;
}

function AppContent({ sessionSignal }: { sessionSignal: number }) {
  const { isAuthenticated, logout, sessionChecked } = useAuth();

  const [screen, setScreen] = useState<AppScreen>("login");
  const [activeTab, setActiveTab] = useState<TabName>("signin");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [invoicePrePopData, setInvoicePrePopData] =
    useState<InvoicePrePopData | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    invoiceNumber: string;
    totalAmount: number;
    currency: string;
  } | null>(null);

  // When AuthProvider detects a session (magic link redirect / auth-state change),
  // immediately route to dashboard
  useEffect(() => {
    if (sessionSignal > 0) {
      setScreen("dashboard");
    }
  }, [sessionSignal]);

  // Also respond to isAuthenticated becoming true (covers page reload with stored session)
  useEffect(() => {
    if (sessionChecked) {
      if (isAuthenticated) {
        setScreen((prev) =>
          prev === "login" || prev === "magic-link-sent" ? "dashboard" : prev,
        );
      } else {
        // Unauthenticated users land on the main tabbed layout, Sign In tab first
        setScreen((prev) => (prev === "login" ? "main" : prev));
      }
    }
  }, [sessionChecked, isAuthenticated]);

  // Hide everything until the session check completes (prevents flash of login screen)
  if (!sessionChecked) {
    return null;
  }

  const handleMagicLinkSent = () => {
    setScreen("magic-link-sent");
  };

  const handleSkipLogin = () => {
    setScreen("main");
    setActiveTab("country");
  };

  const handleLogout = () => {
    logout();
    setScreen("main");
    setActiveTab("signin");
  };

  const selectCountry = (country: string) => {
    setSelectedCountry(country);
    setActiveTab("transaction");
  };

  const handleGenerateInvoice = (data: InvoicePrePopData) => {
    setInvoicePrePopData(data);
    setActiveTab("invoice");
  };

  const handleInvoiceGenerated = (
    invoiceNumber: string,
    totalAmount: number,
    currency: string,
  ) => {
    setGeneratedInvoice({ invoiceNumber, totalAmount, currency });
    setScreen("invoice-preview");
  };

  const handleNavigateFromDashboard = (tab: string) => {
    if (tab === "pricing") {
      setActiveTab("pricing");
      setScreen("main");
    } else if (tab === "invoice") {
      setActiveTab("invoice");
      setScreen("main");
    } else if (tab === "country") {
      setActiveTab("country");
      setScreen("main");
    } else {
      setScreen("main");
    }
  };

  // ── Dashboard screen ──
  if (screen === "dashboard") {
    return (
      <div className="min-h-screen app-bg-pattern text-foreground flex flex-col">
        <Header
          onNavigateDashboard={() => setScreen("dashboard")}
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
  if (screen === "invoice-preview" && generatedInvoice) {
    return (
      <div className="min-h-screen app-bg-pattern text-foreground flex flex-col">
        <Header
          onNavigateDashboard={
            isAuthenticated ? () => setScreen("dashboard") : undefined
          }
          onLogout={handleLogout}
        />
        <main className="flex-1">
          <InvoicePreview
            invoiceNumber={generatedInvoice.invoiceNumber}
            totalAmount={generatedInvoice.totalAmount}
            currency={generatedInvoice.currency}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setScreen("main");
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const TAB_COLORS = [
    {
      id: "signin",
      label: "Sign In",
      activeColor: "oklch(0.38 0.16 270)",
      hoverClass: "tab-hover-indigo",
    },
    {
      id: "country",
      label: "1. Select Region",
      activeColor: "oklch(0.42 0.14 255)",
      hoverClass: "tab-hover-blue",
    },
    {
      id: "transaction",
      label: "2. Transaction",
      activeColor: "oklch(0.48 0.16 195)",
      hoverClass: "tab-hover-teal",
    },
    {
      id: "invoice",
      label: "3. Invoice",
      activeColor: "oklch(0.44 0.14 160)",
      hoverClass: "tab-hover-green",
    },
    {
      id: "apidocs",
      label: "4. API Docs",
      activeColor: "oklch(0.46 0.15 290)",
      hoverClass: "tab-hover-violet",
    },
    {
      id: "pricing",
      label: "5. Pricing",
      activeColor: "oklch(0.50 0.14 30)",
      hoverClass: "tab-hover-amber",
    },
  ];

  const activeTabColor =
    TAB_COLORS.find((t) => t.id === activeTab)?.activeColor ??
    "oklch(0.38 0.16 270)";

  // ── Main app (tabbed interface) ──
  return (
    <div className="min-h-screen app-bg-pattern text-foreground flex flex-col">
      <Header
        onNavigateDashboard={
          isAuthenticated ? () => setScreen("dashboard") : undefined
        }
        onLogout={handleLogout}
      />

      {/* Tab Navigation */}
      <div
        className="sticky top-16 z-40 backdrop-blur border-b"
        style={{
          background: "oklch(0.995 0.005 240 / 0.97)",
          borderBottomColor: activeTabColor,
          borderBottomWidth: "2px",
          transition: "border-bottom-color 0.3s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <nav
            className="flex gap-1 py-2 overflow-x-auto"
            aria-label="Main navigation"
          >
            {TAB_COLORS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  data-ocid={`nav.${tab.id}.tab`}
                  onClick={() => setActiveTab(tab.id as TabName)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 whitespace-nowrap ${tab.hoverClass} ${isActive ? "tab-active text-white shadow-sm" : "text-muted-foreground"}`}
                  style={
                    isActive
                      ? {
                          backgroundColor: tab.activeColor,
                          boxShadow: "0 2px 8px oklch(0 0 0 / 0.2)",
                        }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1">
        {activeTab === "signin" && screen !== "magic-link-sent" && (
          <Login
            onMagicLinkSent={handleMagicLinkSent}
            onSkip={handleSkipLogin}
            embedded
          />
        )}
        {activeTab === "signin" && screen === "magic-link-sent" && (
          <div
            className="flex flex-col items-center justify-center py-20 px-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.975 0.008 240) 0%, oklch(0.96 0.015 220) 40%, oklch(0.97 0.012 200) 100%)",
            }}
          >
            <div
              className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center space-y-4"
              style={{
                boxShadow:
                  "0 4px 6px -1px oklch(0.38 0.13 255 / 0.06), 0 16px 48px -8px oklch(0.38 0.13 255 / 0.12)",
              }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full mx-auto"
                style={{ background: "oklch(0.38 0.13 255 / 0.1)" }}
              >
                <svg
                  className="w-6 h-6"
                  aria-label="Email icon"
                  role="img"
                  style={{ color: "oklch(0.38 0.13 255)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Email icon</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Check your email
              </h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic login link to your email address. Click the link
                to sign in — no code needed.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder.
              </p>
              <button
                type="button"
                className="mt-4 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => {
                  setScreen("main");
                  setActiveTab("signin");
                }}
              >
                ← Try a different email
              </button>
            </div>
          </div>
        )}
        {activeTab === "country" && (
          <RegionSelect
            selectCountry={selectCountry}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "transaction" && (
          <Transaction
            selectedCountry={selectedCountry}
            setActiveTab={setActiveTab}
            onGenerateInvoice={handleGenerateInvoice}
          />
        )}
        {activeTab === "invoice" && (
          <Invoice
            setActiveTab={setActiveTab}
            prePopData={invoicePrePopData}
            onInvoiceGenerated={handleInvoiceGenerated}
          />
        )}
        {activeTab === "apidocs" && <ApiDocs setActiveTab={setActiveTab} />}
        {activeTab === "pricing" && <Pricing />}
      </main>

      <Footer />
    </div>
  );
}

function AppWithSession() {
  const [sessionSignal, setSessionSignal] = useState(0);
  return (
    <AuthProvider onSessionReady={() => setSessionSignal((n) => n + 1)}>
      <AppContent sessionSignal={sessionSignal} />
    </AuthProvider>
  );
}

function App() {
  const currentPath = window.location.pathname;
  if (
    currentPath === "/terms" ||
    currentPath === "/privacy" ||
    currentPath === "/refund"
  ) {
    return <LegalPageRouter />;
  }
  return <AppWithSession />;
}

export default App;
