import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code, Globe, Key, ShieldCheck, Zap } from 'lucide-react';

const REQUEST_EXAMPLE = `{
  "sellerCountry": "DE",
  "buyerCountry": "FR",
  "buyerType": "B2C",
  "category": "Digital Services",
  "amount": 100,
  "apiKey": "your-api-key-here"
}`;

const RESPONSE_EXAMPLE = `{
  "vatType": "OSS VAT",
  "vatRate": 20,
  "vatAmount": 20,
  "total": 120
}`;

const REVERSE_CHARGE_EXAMPLE = `{
  "sellerCountry": "DE",
  "buyerCountry": "FR",
  "buyerType": "B2B",
  "category": "Others",
  "amount": 500,
  "apiKey": "your-api-key-here"
}`;

const REVERSE_CHARGE_RESPONSE = `{
  "vatType": "Reverse Charge",
  "vatRate": 0,
  "vatAmount": 0,
  "total": 500
}`;

const ERROR_RESPONSE = `{
  "error": "Invalid API key"
}`;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-muted/60 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre text-foreground">
      {code}
    </pre>
  );
}

export function ApiDocs() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-chart-2 mb-4">
          <Code className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">VAT Calculation API</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Integrate EU & UK VAT calculations directly into your website or application.
          Supports OSS, Reverse Charge, and all major VAT categories.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Globe, title: "EU & UK Coverage", desc: "11 countries with accurate VAT rates" },
          { icon: Zap, title: "OSS Support", desc: "Automatic cross-border B2C detection" },
          { icon: ShieldCheck, title: "Reverse Charge", desc: "B2B cross-border zero-rating" },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="text-center">
            <CardContent className="pt-6">
              <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="text-xs px-2 py-0.5 bg-emerald-600 text-white">POST</Badge>
            <code className="text-sm font-mono">/api/vat-calculate</code>
          </CardTitle>
          <CardDescription>
            Calculate VAT for a transaction. Returns VAT type, rate, amount, and total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request Parameters */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Request Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Parameter</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Type</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Required</th>
                    <th className="text-left py-2 font-semibold text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    { param: "sellerCountry", type: "string", req: "Yes", desc: "ISO country code of seller (DE, FR, GB, etc.)" },
                    { param: "buyerCountry", type: "string", req: "Yes", desc: "ISO country code of buyer" },
                    { param: "buyerType", type: "string", req: "Yes", desc: '"B2B" or "B2C"' },
                    { param: "category", type: "string", req: "Yes", desc: "VAT category (e.g. Digital Services, Basic Food)" },
                    { param: "amount", type: "number", req: "Yes", desc: "Net amount before VAT" },
                    { param: "apiKey", type: "string", req: "Yes", desc: "Your API key for authentication" },
                  ].map(({ param, type, req, desc }) => (
                    <tr key={param}>
                      <td className="py-2 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{param}</code></td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{type}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={req === "Yes" ? "default" : "secondary"} className="text-xs">{req}</Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Example 1: OSS */}
          <div>
            <h4 className="font-semibold text-sm mb-1">Example 1 — OSS B2C Transaction</h4>
            <p className="text-xs text-muted-foreground mb-3">
              German seller → French consumer. OSS applies; buyer country rate (20%) is used.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Request</p>
                <CodeBlock code={REQUEST_EXAMPLE} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Response</p>
                <CodeBlock code={RESPONSE_EXAMPLE} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Example 2: Reverse Charge */}
          <div>
            <h4 className="font-semibold text-sm mb-1">Example 2 — Reverse Charge B2B</h4>
            <p className="text-xs text-muted-foreground mb-3">
              German seller → French business. Reverse charge applies; 0% VAT on invoice.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Request</p>
                <CodeBlock code={REVERSE_CHARGE_EXAMPLE} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Response</p>
                <CodeBlock code={REVERSE_CHARGE_RESPONSE} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Error Response */}
          <div>
            <h4 className="font-semibold text-sm mb-1">Error Response — Invalid API Key</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Returned with HTTP 403 when the API key is missing or invalid.
            </p>
            <CodeBlock code={ERROR_RESPONSE} />
          </div>
        </CardContent>
      </Card>

      {/* Supported Countries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Countries</CardTitle>
          <CardDescription>ISO codes accepted for sellerCountry and buyerCountry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { code: "DE", name: "Germany", rate: "19%" },
              { code: "FR", name: "France", rate: "20%" },
              { code: "NL", name: "Netherlands", rate: "21%" },
              { code: "PL", name: "Poland", rate: "23%" },
              { code: "SE", name: "Sweden", rate: "25%" },
              { code: "IT", name: "Italy", rate: "22%" },
              { code: "BE", name: "Belgium", rate: "21%" },
              { code: "AT", name: "Austria", rate: "20%" },
              { code: "HU", name: "Hungary", rate: "27%" },
              { code: "ES", name: "Spain", rate: "21%" },
              { code: "GB", name: "United Kingdom", rate: "20%" },
            ].map(({ code, name, rate }) => (
              <div key={code} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-md px-3 py-1.5">
                <code className="text-xs font-mono font-bold text-primary">{code}</code>
                <span className="text-xs text-muted-foreground">{name}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0">{rate}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* VAT Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported VAT Categories</CardTitle>
          <CardDescription>Valid values for the category parameter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "Basic Food", "Books", "Medical", "Transport", "Hotel",
              "Financial Services", "Insurance", "Education",
              "Exports", "Intra-EU B2B", "Others"
            ].map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Access */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4 text-primary" />
            Get API Access
          </CardTitle>
          <CardDescription>
            API keys are managed by the platform administrator via the Glotaxa backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To request API access, contact the Glotaxa administrator. API keys are validated
            on-chain via the Internet Computer canister, ensuring tamper-proof key management.
          </p>
          <div className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">OSS Logic</p>
            <p>When sellerCountry ≠ buyerCountry AND buyerType = "B2C" AND both are EU countries → OSS VAT applies using buyer country rate.</p>
          </div>
          <div className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Reverse Charge Logic</p>
            <p>When sellerCountry ≠ buyerCountry AND buyerType = "B2B" AND both are EU countries → Reverse Charge applies, vatRate = 0%.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
