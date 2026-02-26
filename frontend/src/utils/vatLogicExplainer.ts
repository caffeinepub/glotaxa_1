import type { CountryCode } from "../data/vatRules";
import { VAT_RULES } from "../data/vatRules";

export interface VATExplanationInput {
  sellerCountry: CountryCode;
  buyerCountry: CountryCode;
  buyerType: "B2B" | "B2C";
  category: string;
  rate: number;
  vatType: string;
  isOSS: boolean;
  complianceScore: number;
  risks: string[];
}

export function explainVATDecision(input: VATExplanationInput): string {
  const {
    sellerCountry,
    buyerCountry,
    buyerType,
    category,
    rate,
    vatType,
    isOSS,
    complianceScore,
    risks,
  } = input;

  const sellerName = VAT_RULES[sellerCountry]?.name ?? sellerCountry;
  const buyerName = VAT_RULES[buyerCountry]?.name ?? buyerCountry;
  const isCrossBorder = sellerCountry !== buyerCountry;

  const lines: string[] = [];

  // Section 1: Why this VAT rule applies
  lines.push("📋 WHY THIS VAT RULE APPLIES");

  if (vatType === "OSS VAT") {
    lines.push(
      `This transaction is subject to EU One Stop Shop (OSS) VAT rules. Because the seller is based in ${sellerName} and the buyer is a consumer (B2C) in ${buyerName}, the VAT rate of the buyer's country (${rate}%) applies. Under EU OSS rules, cross-border B2C digital and goods sales must charge VAT at the destination country's rate.`
    );
  } else if (vatType === "Reverse Charge") {
    lines.push(
      `Reverse Charge applies because this is a B2B transaction between ${sellerName} and ${buyerName} — two different EU countries. Under EU VAT Directive Article 196, the buyer (business) is responsible for accounting for VAT in their own country. The seller issues a zero-rated invoice with a "Reverse Charge" note.`
    );
  } else if (vatType === "Exempt") {
    lines.push(
      `The category "${category}" is VAT-exempt under EU and UK VAT legislation. Services such as financial services, insurance, and education are specifically excluded from VAT. No VAT is charged and no input VAT can be reclaimed on related costs.`
    );
  } else if (vatType === "Zero Rated") {
    lines.push(
      `The category "${category}" is zero-rated for VAT in the United Kingdom. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs. This applies to essential goods such as food, books, and exports.`
    );
  } else if (vatType === "Reduced") {
    lines.push(
      `A reduced VAT rate of ${rate}% applies to "${category}" in ${sellerName}. EU member states are permitted to apply reduced rates to specific categories of goods and services deemed socially or economically important. Always verify that your specific goods or services qualify for the reduced rate under national legislation.`
    );
  } else {
    lines.push(
      `The standard VAT rate of ${rate}% applies in ${sellerName} for the category "${category}". This is the default rate applied to most goods and services where no special exemption, zero-rating, or reduced rate applies.`
    );
  }

  lines.push("");

  // Section 2: Invoice compliance
  lines.push("✅ INVOICE COMPLIANCE");

  if (complianceScore >= 90) {
    lines.push(
      `Your invoice compliance score is ${complianceScore}/100 — Excellent. The invoice appears to meet the key requirements for a compliant VAT invoice under EU Directive 2006/112/EC and UK VAT regulations.`
    );
  } else if (complianceScore >= 70) {
    lines.push(
      `Your invoice compliance score is ${complianceScore}/100 — Good, but with some gaps. Review the warnings below to ensure full compliance before issuing the invoice.`
    );
  } else {
    lines.push(
      `Your invoice compliance score is ${complianceScore}/100 — Attention required. Several compliance issues have been detected. Address the warnings below before issuing this invoice to avoid penalties.`
    );
  }

  lines.push("");

  // Section 3: OSS registration
  lines.push("🌍 OSS REGISTRATION");

  if (isOSS) {
    lines.push(
      `This transaction triggers EU OSS VAT obligations. If your total cross-border B2C sales within the EU exceed €10,000 per year, you must register for the EU One Stop Shop (OSS) scheme. OSS allows you to report and pay VAT for all EU countries through a single registration in your home country. Failure to register may result in penalties and back-taxes.`
    );
  } else if (isCrossBorder && buyerType === "B2C") {
    lines.push(
      `This cross-border B2C transaction may approach OSS thresholds. Monitor your total EU cross-border B2C sales. Once they exceed €10,000 annually, OSS registration becomes mandatory.`
    );
  } else {
    lines.push(
      `OSS registration is not required for this transaction. This is either a domestic transaction, a B2B transaction, or a transaction outside the EU OSS scope.`
    );
  }

  lines.push("");

  // Section 4: Compliance risks
  lines.push("⚠️ COMPLIANCE RISKS");

  if (risks.length === 0) {
    lines.push("No significant compliance risks detected for this transaction.");
  } else {
    risks.forEach((risk) => {
      lines.push(`• ${risk}`);
    });
    if (vatType === "Reverse Charge") {
      lines.push(
        `• Ensure the invoice clearly states "Reverse Charge — VAT to be accounted for by the customer" as required by EU VAT Directive.`
      );
    }
    if (buyerType === "B2B" && isCrossBorder) {
      lines.push(
        `• Verify the buyer's VAT ID is valid using the EU VIES system before issuing the invoice.`
      );
    }
  }

  return lines.join("\n");
}
