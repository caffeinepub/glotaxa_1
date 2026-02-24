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
}

export function calculateVAT(
  country: CountryCode,
  category: string,
  netAmount: number,
  sellerCountry: CountryCode,
  buyerCountry: CountryCode,
  isB2B: boolean
): VATCalculationResult {
  const rules = VAT_RULES[country];

  if (!rules) {
    return {
      vatRate: 0,
      vatType: "UNKNOWN",
      vatAmount: 0,
      total: netAmount
    };
  }

  // Reverse Charge EU (B2B transactions between different EU countries)
  if (isB2B && sellerCountry !== buyerCountry && country !== "GB") {
    return {
      vatRate: 0,
      vatType: "Reverse Charge",
      vatAmount: 0,
      total: netAmount
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
      total: netAmount
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
      total: netAmount
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
      total: netAmount + vatAmount
    };
  }

  // Standard rate (default)
  const vatAmount = (netAmount * rules.standard) / 100;

  return {
    vatRate: rules.standard,
    vatType: "Standard",
    vatAmount,
    total: netAmount + vatAmount
  };
}
