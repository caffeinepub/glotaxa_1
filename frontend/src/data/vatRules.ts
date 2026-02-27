export type CountryCode =
  | "DE"
  | "FR"
  | "NL"
  | "PL"
  | "SE"
  | "IT"
  | "BE"
  | "AT"
  | "HU"
  | "ES"
  | "GB";

interface VATRuleConfig {
  name: string;
  standard: number;
  reduced: number;
  superReduced?: number;
  // Optional category-level overrides for special countries (e.g. GB)
  categoryRates?: Record<string, { rate: number; vatType: string; vatCategory: "standard" | "reduced" | "zero" | "exempt" | "reverse_charge"; note?: string }>;
}

export const VAT_RULES: Record<CountryCode, VATRuleConfig> = {
  DE: { name: "Germany", standard: 19, reduced: 7 },
  FR: { name: "France", standard: 20, reduced: 10, superReduced: 5.5 },
  NL: { name: "Netherlands", standard: 21, reduced: 9 },
  PL: { name: "Poland", standard: 23, reduced: 8, superReduced: 5 },
  SE: { name: "Sweden", standard: 25, reduced: 12, superReduced: 6 },
  IT: { name: "Italy", standard: 22, reduced: 10, superReduced: 4 },
  BE: { name: "Belgium", standard: 21, reduced: 12, superReduced: 6 },
  AT: { name: "Austria", standard: 20, reduced: 10, superReduced: 5 },
  HU: { name: "Hungary", standard: 27, reduced: 18, superReduced: 5 },
  ES: { name: "Spain", standard: 21, reduced: 10, superReduced: 4 },
  GB: {
    name: "United Kingdom",
    standard: 20,
    reduced: 5,
    categoryRates: {
      "Basic Food": {
        rate: 0,
        vatType: "Zero Rated",
        vatCategory: "zero",
        note: "Basic food items are zero-rated for VAT in the UK.",
      },
      "Medical": {
        rate: 0,
        vatType: "Zero Rated",
        vatCategory: "zero",
        note: "Medical goods and services are zero-rated for VAT in the UK.",
      },
      "Transport": {
        // Default 20% — public transport override handled in engine
        rate: 20,
        vatType: "Standard",
        vatCategory: "standard",
        note: "Public transport (bus/train) = 0%. Taxis and car hire = 20%. Default is 20% unless confirmed as public transport.",
      },
      "Hotel": {
        rate: 20,
        vatType: "Standard",
        vatCategory: "standard",
        note: "Hotel accommodation is subject to the standard 20% VAT rate in the UK.",
      },
      "Financial Services": {
        rate: 0,
        vatType: "Exempt",
        vatCategory: "exempt",
        note: "Financial services are VAT-exempt in the UK. No input VAT reclaim is available on related costs.",
      },
      "Insurance": {
        rate: 0,
        vatType: "Exempt",
        vatCategory: "exempt",
        note: "Insurance is VAT-exempt in the UK. Insurance Premium Tax (IPT) applies separately.",
      },
      "Education": {
        rate: 0,
        vatType: "Zero Rated",
        vatCategory: "zero",
        note: "Education is zero-rated for VAT in the UK when provided by eligible institutions: schools, universities, and approved training providers.",
      },
      "Exports": {
        rate: 0,
        vatType: "Zero Rated",
        vatCategory: "zero",
        note: "Exports outside the UK are zero-rated. Proof of export is required to apply the 0% rate.",
      },
      "Intra-EU B2B": {
        rate: 0,
        vatType: "Reverse Charge",
        vatCategory: "reverse_charge",
        note: "Intra-EU B2B supplies from the UK are subject to 0% VAT under the reverse charge mechanism. A valid EU VAT ID from the buyer is required.",
      },
    },
  },
};

export type { VATRuleConfig };
