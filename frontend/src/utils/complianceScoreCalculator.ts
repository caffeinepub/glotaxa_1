export interface ComplianceData {
  vatId: string;
  buyerType: "B2B" | "B2C";
  invoiceNumber: string;
  category: string;
  crossBorder: boolean;
  reverseChargeNote: boolean;
}

export interface ComplianceResult {
  score: number;
  deductions: { reason: string; points: number }[];
}

export function calculateComplianceScore(data: ComplianceData): ComplianceResult {
  let score = 100;
  const deductions: { reason: string; points: number }[] = [];

  if (!data.vatId && data.buyerType === "B2B") {
    score -= 20;
    deductions.push({ reason: "VAT ID missing for B2B transaction", points: 20 });
  }

  if (!data.invoiceNumber) {
    score -= 10;
    deductions.push({ reason: "Invoice number missing", points: 10 });
  }

  if (!data.category) {
    score -= 10;
    deductions.push({ reason: "VAT category not selected", points: 10 });
  }

  if (data.crossBorder && !data.reverseChargeNote) {
    score -= 20;
    deductions.push({ reason: "Cross-border transaction missing reverse charge note", points: 20 });
  }

  return {
    score: Math.max(0, score),
    deductions,
  };
}
