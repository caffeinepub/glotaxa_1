import { VAT_RULES, type CountryCode } from "../data/vatRules";

export const VAT_CATEGORIES = [
  "Basic Food",
  "Books",
  "Medical",
  "Transport",
  "Hotel",
  "Financial Services",
  "Insurance",
  "Education",
  "Exports",
  "Intra-EU B2B",
  "Others"
];

export interface VATCalculationResult {
  vatRate: number;
  vatType: string;
  vatAmount: number;
  total: number;
  isOSS: boolean;
  vatCategory: "standard" | "reduced" | "zero" | "exempt" | "reverse_charge" | "oss";
}

// EU country codes (excluding GB)
const EU_COUNTRIES: CountryCode[] = ["DE", "FR", "NL", "PL", "SE", "IT", "BE", "AT", "HU", "ES"];

export function detectOSS({
  sellerCountry,
  buyerCountry,
  buyerType,
}: {
  sellerCountry: CountryCode;
  buyerCountry: CountryCode;
  buyerType: "B2B" | "B2C";
}): boolean {
  // OSS applies when seller and buyer are in different EU countries and buyer is a consumer (B2C)
  if (
    sellerCountry !== buyerCountry &&
    buyerType === "B2C" &&
    EU_COUNTRIES.includes(sellerCountry) &&
    EU_COUNTRIES.includes(buyerCountry)
  ) {
    return true;
  }
  return false;
}

export function calculateVAT(
  country: CountryCode,
  category: string,
  netAmount: number,
  sellerCountry: CountryCode,
  buyerCountry: CountryCode,
  isB2B: boolean
): VATCalculationResult {
  const buyerType: "B2B" | "B2C" = isB2B ? "B2B" : "B2C";

  // Check OSS first
  const isOSS = detectOSS({ sellerCountry, buyerCountry, buyerType });

  // If OSS applies, use buyer country's standard VAT rate
  if (isOSS) {
    const buyerRules = VAT_RULES[buyerCountry];
    const rate = buyerRules ? buyerRules.standard : 0;
    const vatAmount = (netAmount * rate) / 100;
    return {
      vatRate: rate,
      vatType: "OSS VAT",
      vatAmount,
      total: netAmount + vatAmount,
      isOSS: true,
      vatCategory: "oss",
    };
  }

  const rules = VAT_RULES[country];

  if (!rules) {
    return {
      vatRate: 0,
      vatType: "UNKNOWN",
      vatAmount: 0,
      total: netAmount,
      isOSS: false,
      vatCategory: "standard",
    };
  }

  // Reverse Charge EU (B2B transactions between different EU countries)
  if (isB2B && sellerCountry !== buyerCountry && country !== "GB") {
    return {
      vatRate: 0,
      vatType: "Reverse Charge",
      vatAmount: 0,
      total: netAmount,
      isOSS: false,
      vatCategory: "reverse_charge",
    };
  }

  // Exempt categories
  if (
    category === "Financial Services" ||
    category === "Insurance" ||
    category === "Education"
  ) {
    return {
      vatRate: 0,
      vatType: "Exempt",
      vatAmount: 0,
      total: netAmount,
      isOSS: false,
      vatCategory: "exempt",
    };
  }

  // Zero rated UK
  if (
    country === "GB" &&
    (category === "Basic Food" || category === "Books" || category === "Exports")
  ) {
    return {
      vatRate: 0,
      vatType: "Zero Rated",
      vatAmount: 0,
      total: netAmount,
      isOSS: false,
      vatCategory: "zero",
    };
  }

  // Reduced rate categories
  if (
    ["Basic Food", "Books", "Medical", "Transport", "Hotel"].includes(category)
  ) {
    const rate = rules.reduced ?? rules.standard;
    const vatAmount = (netAmount * rate) / 100;

    return {
      vatRate: rate,
      vatType: "Reduced",
      vatAmount,
      total: netAmount + vatAmount,
      isOSS: false,
      vatCategory: "reduced",
    };
  }

  // Standard rate (default)
  const vatAmount = (netAmount * rules.standard) / 100;

  return {
    vatRate: rules.standard,
    vatType: "Standard",
    vatAmount,
    total: netAmount + vatAmount,
    isOSS: false,
    vatCategory: "standard",
  };
}
