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
  GB: { name: "United Kingdom", standard: 20, reduced: 5 }
};
