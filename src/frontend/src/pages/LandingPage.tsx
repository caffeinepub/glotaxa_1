import { Button } from '@/components/ui/button';
import { Calculator, Globe, FileText, Shield, Zap, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  startApp: () => void;
}

export function LandingPage({ startApp }: LandingPageProps) {
  return (
    <div className="relative">
      {/* Login button positioned at top-right */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" style={{ float: 'right' }}>
          Login
        </Button>
      </div>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-chart-1 to-chart-2">
              <Calculator className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
            Glotaxa
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            Calculate Tax correctly for multiple countries
          </p>
          
          <p className="text-lg text-muted-foreground mb-8">
            Generate compliant invoices. No signup required.
          </p>
          
          <Button onClick={startApp} size="lg" className="text-lg px-8 py-6">
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Glotaxa?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border">
              <Globe className="w-10 h-10 text-chart-1 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-Country Support</h3>
              <p className="text-muted-foreground">
                Calculate VAT for 11 countries including EU nations and the UK with accurate, up-to-date rates.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <Shield className="w-10 h-10 text-chart-2 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Compliant Invoices</h3>
              <p className="text-muted-foreground">
                Generate EU and UK standard compliant invoices with all required fields and formatting.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <Zap className="w-10 h-10 text-chart-3 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Instant Calculations</h3>
              <p className="text-muted-foreground">
                Real-time VAT calculations with automatic rate selection based on product category.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <CheckCircle className="w-10 h-10 text-chart-4 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Category-Based Rates</h3>
              <p className="text-muted-foreground">
                Automatically apply standard, reduced, zero, or exempt rates based on goods and services.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <FileText className="w-10 h-10 text-chart-5 mb-4" />
              <h3 className="text-xl font-semibold mb-2">PDF Export</h3>
              <p className="text-muted-foreground">
                Download professional invoices as PDF files ready for your records and clients.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <Calculator className="w-10 h-10 text-chart-1 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Signup Required</h3>
              <p className="text-muted-foreground">
                Start calculating VAT and generating invoices immediately without creating an account.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
