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
  note?: string;
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
    note,
  } = input;

  const sellerName = VAT_RULES[sellerCountry]?.name ?? sellerCountry;
  const buyerName = VAT_RULES[buyerCountry]?.name ?? buyerCountry;
  const isCrossBorder = sellerCountry !== buyerCountry;
  const isUK = sellerCountry === "GB";

  const lines: string[] = [];

  // Section 1: Why this VAT rule applies
  lines.push("📋 WHY THIS VAT RULE APPLIES");

  if (vatType === "OSS VAT") {
    lines.push(
      `This transaction is subject to EU One Stop Shop (OSS) VAT rules. Because the seller is based in ${sellerName} and the buyer is a consumer (B2C) in ${buyerName}, the VAT rate of the buyer's country (${rate}%) applies. Under EU OSS rules, cross-border B2C digital and goods sales must charge VAT at the destination country's rate.`
    );
  } else if (vatType === "Reverse Charge") {
    if (isUK && category === "Intra-EU B2B") {
      lines.push(
        `Reverse Charge applies to this Intra-EU B2B transaction from the United Kingdom. The buyer (EU business) is responsible for accounting for VAT in their own country. The seller issues a zero-rated invoice with a "Reverse Charge" note. A valid EU VAT ID from the buyer is required to apply this treatment.`
      );
    } else {
      lines.push(
        `Reverse Charge applies because this is a B2B transaction between ${sellerName} and ${buyerName} — two different EU countries. Under EU VAT Directive Article 196, the buyer (business) is responsible for accounting for VAT in their own country. The seller issues a zero-rated invoice with a "Reverse Charge" note.`
      );
    }
  } else if (vatType === "Exempt") {
    if (isUK && category === "Financial Services") {
      lines.push(
        `Financial Services are VAT-exempt in the United Kingdom under VATA 1994 Schedule 9. No VAT is charged on these services. Importantly, no input VAT reclaim is available on costs directly attributable to exempt financial services supplies.`
      );
    } else if (isUK && category === "Insurance") {
      lines.push(
        `Insurance is VAT-exempt in the United Kingdom under VATA 1994 Schedule 9. No VAT is charged on insurance premiums. Note: Insurance Premium Tax (IPT) applies separately at either the standard rate (12%) or higher rate (20%) depending on the type of insurance — this is distinct from VAT and must be accounted for separately.`
      );
    } else {
      lines.push(
        `The category "${category}" is VAT-exempt under EU and UK VAT legislation. Services such as financial services, insurance, and education are specifically excluded from VAT. No VAT is charged and no input VAT can be reclaimed on related costs.`
      );
    }
  } else if (vatType === "Zero Rated") {
    if (isUK) {
      if (category === "Basic Food") {
        lines.push(
          `Basic food items are zero-rated for VAT in the United Kingdom under VATA 1994 Schedule 8. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs. This applies to most food for human consumption, excluding items such as confectionery, crisps, and alcoholic drinks.`
        );
      } else if (category === "Medical") {
        lines.push(
          `Medical goods and services are zero-rated for VAT in the United Kingdom. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs. This applies to qualifying medical equipment, drugs, and healthcare services.`
        );
      } else if (category === "Education") {
        lines.push(
          `Education is zero-rated for VAT in the United Kingdom when provided by eligible institutions. This applies to schools, universities, and approved training providers. Private tuition by individuals may also qualify. Always verify that your institution or training programme meets HMRC's eligibility criteria.`
        );
      } else if (category === "Exports") {
        lines.push(
          `Exports of goods outside the United Kingdom are zero-rated for VAT under VATA 1994. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs. Proof of export (e.g. customs documentation, shipping records) must be retained to support the zero-rating claim.`
        );
      } else if (category === "Transport") {
        lines.push(
          `Public transport services (bus and train) are zero-rated for VAT in the United Kingdom. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs. Note: taxis and car hire are subject to the standard 20% VAT rate.`
        );
      } else {
        lines.push(
          `The category "${category}" is zero-rated for VAT in the United Kingdom. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs.`
        );
      }
    } else {
      lines.push(
        `The category "${category}" is zero-rated for VAT in the United Kingdom. Zero-rated means VAT is technically charged at 0%, allowing the seller to reclaim input VAT on related business costs. This applies to essential goods such as food, books, and exports.`
      );
    }
  } else if (vatType === "Reduced") {
    lines.push(
      `A reduced VAT rate of ${rate}% applies to "${category}" in ${sellerName}. EU member states are permitted to apply reduced rates to specific categories of goods and services deemed socially or economically important. Always verify that your specific goods or services qualify for the reduced rate under national legislation.`
    );
  } else {
    if (isUK && category === "Hotel") {
      lines.push(
        `Hotel accommodation in the United Kingdom is subject to the standard VAT rate of 20%. This applies to all hotel stays, serviced apartments, and similar accommodation. The standard rate has applied since the temporary reduced rate (5%) introduced during COVID-19 ended in April 2022.`
      );
    } else if (isUK && category === "Transport") {
      lines.push(
        `The standard VAT rate of 20% applies to this transport transaction in the United Kingdom. Taxis, private hire vehicles, and car hire are subject to the standard 20% VAT rate. Only public transport services (bus and train) qualify for the 0% zero rate.`
      );
    } else {
      lines.push(
        `The standard VAT rate of ${rate}% applies in ${sellerName} for the category "${category}". This is the default rate applied to most goods and services where no special exemption, zero-rating, or reduced rate applies.`
      );
    }
  }

  // UK-specific compliance notes
  if (isUK && note) {
    lines.push("");
    lines.push("📌 UK-SPECIFIC NOTE");
    lines.push(note);
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

  const allRisks = [...risks];

  // UK-specific compliance risk additions
  if (isUK) {
    if (category === "Financial Services") {
      allRisks.push("No input VAT reclaim is available on costs directly attributable to exempt financial services supplies.");
    }
    if (category === "Insurance") {
      allRisks.push("Insurance Premium Tax (IPT) applies separately — ensure IPT is correctly calculated and reported.");
    }
    if (category === "Education") {
      allRisks.push("Verify that the education provider meets HMRC eligibility criteria (schools, universities, approved training providers).");
    }
    if (category === "Exports") {
      allRisks.push("Retain proof of export documentation (customs records, shipping evidence) to support the 0% zero-rating claim.");
    }
    if (category === "Intra-EU B2B") {
      allRisks.push("Obtain and verify a valid EU VAT ID from the buyer before applying the reverse charge mechanism.");
    }
  }

  if (allRisks.length === 0) {
    lines.push("No significant compliance risks detected for this transaction.");
  } else {
    allRisks.forEach((risk) => {
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
