const SUPABASE_URL = "https://cvelhiuefcykduwgnjjs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM";

const AI_VAT_URL = `${SUPABASE_URL}/functions/v1/ai-vat`;

export interface AIVatInput {
  sellerCountry: string;
  buyerCountry: string;
  buyerType: "B2B" | "B2C";
  category: string;
  vatRate: number;
  vatType: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  isOSS: boolean;
}

export async function askAIVatExplainer(input: AIVatInput): Promise<string> {
  const question = `
I have a VAT transaction with the following details:
- Seller Country: ${input.sellerCountry}
- Buyer Country: ${input.buyerCountry}
- Buyer Type: ${input.buyerType}
- VAT Category: ${input.category}
- VAT Type Applied: ${input.vatType}
- VAT Rate: ${input.vatRate}%
- Net Amount: €${input.netAmount.toFixed(2)}
- VAT Amount: €${input.vatAmount.toFixed(2)}
- Gross Amount: €${input.grossAmount.toFixed(2)}
- OSS Applicable: ${input.isOSS ? "Yes" : "No"}

Please explain:
1. Why this VAT rule applies
2. What invoice compliance requirements I need to meet
3. Any OSS registration obligations
4. Key compliance risks to be aware of
`.trim();

  const response = await fetch(AI_VAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI service error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.answer ?? data.message ?? JSON.stringify(data);
}

export async function askFreeformQuestion(question: string): Promise<string> {
  const response = await fetch(AI_VAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI service error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.answer ?? data.message ?? JSON.stringify(data);
}
