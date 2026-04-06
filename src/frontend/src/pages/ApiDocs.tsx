import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Code,
  Copy,
  Globe,
  Key,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { TabName } from "../App";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../contexts/AuthContext";

interface ApiDocsProps {
  setActiveTab: (tab: TabName) => void;
}

export default function ApiDocs({ setActiveTab }: ApiDocsProps) {
  const { currentPlan } = useAuth();
  const planKey = (currentPlan ?? "free").toLowerCase();
  const isStarter =
    planKey === "starter" || planKey === "pro" || planKey === "business";

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeyFromSupabase = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setError("You must be signed in to generate an API key.");
        return;
      }

      const res = await fetch(
        "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/generate-api-key",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data?.error ?? "Failed to generate API key. Please try again.",
        );
        return;
      }

      setApiKey(data.api_key);
    } catch (_err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = () => fetchApiKeyFromSupabase();
  const handleRegenerate = () => fetchApiKeyFromSupabase();

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("invoice")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoice
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          VAT Calculation API
        </h1>
        <p className="text-muted-foreground">
          Public REST API for programmatic VAT rate lookup and compliance
          checking.
        </p>
      </div>

      {/* ── API KEY SECTION ── */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Your API Key
            </h2>
          </div>

          {!isStarter ? (
            <div className="bg-muted/60 rounded-xl p-5 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                API access requires <strong>Starter plan or above</strong>.
                Upgrade to generate your API key and start using the VAT
                Calculation API programmatically.
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab("pricing")}
                className="self-start"
                data-ocid="apidocs.upgrade.button"
              >
                Upgrade →
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {apiKey ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Include this key as{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                      x-api-key: YOUR_KEY
                    </code>{" "}
                    in your API requests.
                  </p>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 font-mono text-sm bg-muted px-4 py-2.5 rounded-lg text-foreground break-all select-all"
                      data-ocid="apidocs.api_key.panel"
                    >
                      {apiKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="shrink-0 flex items-center gap-1.5"
                      data-ocid="apidocs.api_key.copy_button"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />{" "}
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={loading}
                      className="shrink-0 flex items-center gap-1.5 text-muted-foreground"
                      data-ocid="apidocs.api_key.regenerate_button"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Regenerating your key will invalidate the existing one
                    immediately.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    You don't have an API key yet. Generate one to start using
                    the VAT Calculation API.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerateKey}
                    disabled={loading}
                    className="flex items-center gap-1.5"
                    data-ocid="apidocs.api_key.generate_button"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                    {loading ? "Generating..." : "Generate API Key"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Endpoint */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Endpoint</h2>
          </div>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <span className="text-green-600 dark:text-green-400 font-bold">
              POST
            </span>
            <span className="ml-3 text-foreground">/api/v1/vat/calculate</span>
          </div>
        </div>
      </section>

      {/* Request Parameters */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Request Parameters
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">
                    Parameter
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">
                    Required
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  {
                    param: "sellerCountry",
                    type: "string",
                    req: "Yes",
                    desc: "ISO 3166-1 alpha-2 country code of the seller (e.g. DE, FR, GB)",
                  },
                  {
                    param: "buyerCountry",
                    type: "string",
                    req: "Yes",
                    desc: "ISO 3166-1 alpha-2 country code of the buyer",
                  },
                  {
                    param: "buyerType",
                    type: "string",
                    req: "Yes",
                    desc: '"B2B" or "B2C"',
                  },
                  {
                    param: "productCategory",
                    type: "string",
                    req: "Yes",
                    desc: "Product/service category (see categories list below)",
                  },
                  {
                    param: "vatType",
                    type: "string",
                    req: "No",
                    desc: "Preferred VAT type: STANDARD, REDUCED, ZERO, EXEMPT, REVERSE_CHARGE",
                  },
                  {
                    param: "netAmount",
                    type: "number",
                    req: "Yes",
                    desc: "Net transaction amount in the specified currency",
                  },
                  {
                    param: "currency",
                    type: "string",
                    req: "No",
                    desc: "ISO 4217 currency code (default: EUR)",
                  },
                ].map((row) => (
                  <tr key={row.param}>
                    <td className="py-2 pr-4 font-mono text-xs text-primary">
                      {row.param}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {row.type}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.req === "Yes"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.req}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-foreground">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Response Parameters */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Response</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">
                    Field
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  {
                    field: "vatRate",
                    type: "number",
                    desc: "Applicable VAT rate as a percentage (e.g. 20)",
                  },
                  {
                    field: "vatAmount",
                    type: "number",
                    desc: "Calculated VAT amount",
                  },
                  {
                    field: "grossAmount",
                    type: "number",
                    desc: "Total gross amount (net + VAT)",
                  },
                  {
                    field: "vatCategory",
                    type: "string",
                    desc: "Applied VAT category (STANDARD, REDUCED, etc.)",
                  },
                  {
                    field: "isOSS",
                    type: "boolean",
                    desc: "Whether OSS (One Stop Shop) registration is required",
                  },
                  {
                    field: "effectiveVatType",
                    type: "string",
                    desc: "The effective VAT type applied after rule evaluation",
                  },
                  {
                    field: "complianceNotes",
                    type: "string[]",
                    desc: "Array of compliance warnings or notes",
                  },
                ].map((row) => (
                  <tr key={row.field}>
                    <td className="py-2 pr-4 font-mono text-xs text-primary">
                      {row.field}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {row.type}
                    </td>
                    <td className="py-2 text-xs text-foreground">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Examples</h2>
          </div>

          <div className="space-y-6">
            {/* Example 1 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Example 1: OSS B2C Cross-border
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Request</p>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">{`{
  "sellerCountry": "DE",
  "buyerCountry": "FR",
  "buyerType": "B2C",
  "productCategory": "Digital Services",
  "vatType": "STANDARD",
  "netAmount": 100,
  "currency": "EUR"
}`}</pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Response</p>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">{`{
  "vatRate": 20,
  "vatAmount": 20.00,
  "grossAmount": 120.00,
  "vatCategory": "STANDARD",
  "isOSS": true,
  "effectiveVatType": "STANDARD",
  "complianceNotes": [
    "OSS registration required"
  ]
}`}</pre>
                </div>
              </div>
            </div>

            {/* Example 2 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Example 2: Reverse Charge B2B
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Request</p>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">{`{
  "sellerCountry": "GB",
  "buyerCountry": "DE",
  "buyerType": "B2B",
  "productCategory": "Financial Services",
  "vatType": "REVERSE_CHARGE",
  "netAmount": 5000,
  "currency": "GBP"
}`}</pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Response</p>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground">{`{
  "vatRate": 0,
  "vatAmount": 0.00,
  "grossAmount": 5000.00,
  "vatCategory": "REVERSE_CHARGE",
  "isOSS": false,
  "effectiveVatType": "REVERSE_CHARGE",
  "complianceNotes": [
    "Reverse charge applies",
    "Include Article 196 reference"
  ]
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error Responses */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">
              Error Responses
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">
                    Code
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  {
                    code: "400",
                    desc: "Bad Request — missing or invalid parameters",
                  },
                  {
                    code: "401",
                    desc: "Unauthorized — invalid or missing API key",
                  },
                  { code: "404", desc: "Not Found — unsupported country code" },
                  {
                    code: "429",
                    desc: "Too Many Requests — rate limit exceeded",
                  },
                  { code: "500", desc: "Internal Server Error" },
                ].map((row) => (
                  <tr key={row.code}>
                    <td className="py-2 pr-4 font-mono text-xs text-destructive font-semibold">
                      {row.code}
                    </td>
                    <td className="py-2 text-xs text-foreground">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Supported Countries */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Supported Countries
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[
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
            ].map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
              >
                <span className="font-mono text-xs font-bold text-primary">
                  {c.code}
                </span>
                <span className="text-xs text-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
