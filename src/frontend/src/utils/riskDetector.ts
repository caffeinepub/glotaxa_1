import type { CountryCode } from "../data/vatRules";

export interface RiskDetectorInput {
  sellerCountry: CountryCode;
  buyerCountry: CountryCode;
  buyerType: "B2B" | "B2C";
  vatCategory: string;
}

export function riskDetector(data: RiskDetectorInput): string[] {
  const risks: string[] = [];

  if (data.sellerCountry !== data.buyerCountry && data.buyerType === "B2C") {
    risks.push("Possible OSS VAT registration required");
  }

  if (data.vatCategory === "reduced" || data.vatCategory === "Reduced") {
    risks.push("Verify eligibility for reduced VAT");
  }

  return risks;
}
