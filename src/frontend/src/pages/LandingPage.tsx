import { Button } from "@/components/ui/button";
import {
  Bot,
  Calculator,
  CheckCircle,
  FileText,
  Globe,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";

interface LandingPageProps {
  startApp: () => void;
}

export function LandingPage({ startApp }: LandingPageProps) {
  return (
    <div className="relative">
      {/* Login button positioned at top-right */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" style={{ float: "right" }}>
          Login
        </Button>
      </div>

      {/* Original Hero Section */}
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

      {/* AI-Powered Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-chart-1/10 via-chart-2/5 to-transparent border-y border-border">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Glotaxa &ndash; AI Powered Invoicing &amp; VAT Automation
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Create invoices, calculate VAT automatically, and manage tax
            compliance with an AI powered assistant designed for freelancers,
            startups, and small businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/pricing" data-ocid="hero.pricing.link">
              <Button
                size="lg"
                className="text-base px-8 py-5 w-full sm:w-auto"
              >
                View Pricing
              </Button>
            </a>
            <a href="/login" data-ocid="hero.start_free.link">
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-5 w-full sm:w-auto"
              >
                Start Free
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div
              className="bg-card p-6 rounded-xl border border-border text-center"
              data-ocid="feature.vat.card"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-1/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-chart-1" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI VAT Calculation</h3>
              <p className="text-muted-foreground">
                Automatically apply VAT rates based on product category and
                region.
              </p>
            </div>

            <div
              className="bg-card p-6 rounded-xl border border-border text-center"
              data-ocid="feature.invoicing.card"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-chart-2" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Invoicing</h3>
              <p className="text-muted-foreground">
                Create professional invoices with automated tax calculations.
              </p>
            </div>

            <div
              className="bg-card p-6 rounded-xl border border-border text-center"
              data-ocid="feature.compliance.card"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-chart-3" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Tax Compliance Score
              </h3>
              <p className="text-muted-foreground">
                Monitor VAT compliance and reduce tax errors using AI insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Glotaxa?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border">
              <Globe className="w-10 h-10 text-chart-1 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Multi-Country Support
              </h3>
              <p className="text-muted-foreground">
                Calculate VAT for 11 countries including EU nations and the UK
                with accurate, up-to-date rates.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <Shield className="w-10 h-10 text-chart-2 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Compliant Invoices</h3>
              <p className="text-muted-foreground">
                Generate EU and UK standard compliant invoices with all required
                fields and formatting.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <Zap className="w-10 h-10 text-chart-3 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Instant Calculations
              </h3>
              <p className="text-muted-foreground">
                Real-time VAT calculations with automatic rate selection based
                on product category.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <CheckCircle className="w-10 h-10 text-chart-4 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Category-Based Rates
              </h3>
              <p className="text-muted-foreground">
                Automatically apply standard, reduced, zero, or exempt rates
                based on goods and services.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <FileText className="w-10 h-10 text-chart-5 mb-4" />
              <h3 className="text-xl font-semibold mb-2">PDF Export</h3>
              <p className="text-muted-foreground">
                Download professional invoices as PDF files ready for your
                records and clients.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <Calculator className="w-10 h-10 text-chart-1 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Signup Required</h3>
              <p className="text-muted-foreground">
                Start calculating VAT and generating invoices immediately
                without creating an account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-4 border-t border-border bg-muted/20"
        data-ocid="footer.section"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Glotaxa
            </p>
            <nav
              className="flex flex-wrap gap-4 text-sm"
              data-ocid="footer.panel"
            >
              <a
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="footer.terms.link"
              >
                Terms
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="footer.privacy.link"
              >
                Privacy
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="/refund"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="footer.refund.link"
              >
                Refund Policy
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="/pricing"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="footer.pricing.link"
              >
                Pricing
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
