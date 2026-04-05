// VAT ID validation utility for all EU countries + UK
// Validates format only (not VIES live check)

export interface VatIdValidationResult {
  valid: boolean;
  country: string;
  format: string;
  message: string;
}

interface CountryPattern {
  name: string;
  pattern: RegExp;
  format: string;
}

const VAT_PATTERNS: Record<string, CountryPattern> = {
  AT: {
    name: "Austria",
    pattern: /^ATU\d{8}$/,
    format: "ATU + 8 digits (e.g. ATU12345678)",
  },
  BE: {
    name: "Belgium",
    pattern: /^BE\d{10}$/,
    format: "BE + 10 digits (e.g. BE0123456789)",
  },
  BG: {
    name: "Bulgaria",
    pattern: /^BG\d{9,10}$/,
    format: "BG + 9–10 digits (e.g. BG123456789)",
  },
  CY: {
    name: "Cyprus",
    pattern: /^CY\d{8}[A-Z]$/,
    format: "CY + 8 digits + letter (e.g. CY12345678L)",
  },
  CZ: {
    name: "Czech Republic",
    pattern: /^CZ\d{8,10}$/,
    format: "CZ + 8–10 digits (e.g. CZ12345678)",
  },
  DE: {
    name: "Germany",
    pattern: /^DE\d{9}$/,
    format: "DE + 9 digits (e.g. DE123456789)",
  },
  DK: {
    name: "Denmark",
    pattern: /^DK\d{8}$/,
    format: "DK + 8 digits (e.g. DK12345678)",
  },
  EE: {
    name: "Estonia",
    pattern: /^EE\d{9}$/,
    format: "EE + 9 digits (e.g. EE123456789)",
  },
  EL: {
    name: "Greece",
    pattern: /^EL\d{9}$/,
    format: "EL + 9 digits (e.g. EL123456789)",
  },
  GR: {
    name: "Greece",
    pattern: /^GR\d{9}$/,
    format: "GR + 9 digits (e.g. GR123456789)",
  },
  ES: {
    name: "Spain",
    pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    format: "ES + letter/digit + 7 digits + letter/digit (e.g. ESA12345678)",
  },
  FI: {
    name: "Finland",
    pattern: /^FI\d{8}$/,
    format: "FI + 8 digits (e.g. FI12345678)",
  },
  FR: {
    name: "France",
    pattern: /^FR[A-Z0-9]{2}\d{9}$/,
    format: "FR + 2 chars + 9 digits (e.g. FRXX123456789)",
  },
  HR: {
    name: "Croatia",
    pattern: /^HR\d{11}$/,
    format: "HR + 11 digits (e.g. HR12345678901)",
  },
  HU: {
    name: "Hungary",
    pattern: /^HU\d{8}$/,
    format: "HU + 8 digits (e.g. HU12345678)",
  },
  IE: {
    name: "Ireland",
    pattern: /^IE\d{7}[A-Z]{1,2}$/,
    format: "IE + 7 digits + 1–2 letters (e.g. IE1234567A)",
  },
  IT: {
    name: "Italy",
    pattern: /^IT\d{11}$/,
    format: "IT + 11 digits (e.g. IT12345678901)",
  },
  LT: {
    name: "Lithuania",
    pattern: /^LT(\d{9}|\d{12})$/,
    format: "LT + 9 or 12 digits (e.g. LT123456789)",
  },
  LU: {
    name: "Luxembourg",
    pattern: /^LU\d{8}$/,
    format: "LU + 8 digits (e.g. LU12345678)",
  },
  LV: {
    name: "Latvia",
    pattern: /^LV\d{11}$/,
    format: "LV + 11 digits (e.g. LV12345678901)",
  },
  MT: {
    name: "Malta",
    pattern: /^MT\d{8}$/,
    format: "MT + 8 digits (e.g. MT12345678)",
  },
  NL: {
    name: "Netherlands",
    pattern: /^NL\d{9}B\d{2}$/,
    format: "NL + 9 digits + B + 2 digits (e.g. NL123456789B01)",
  },
  PL: {
    name: "Poland",
    pattern: /^PL\d{10}$/,
    format: "PL + 10 digits (e.g. PL1234567890)",
  },
  PT: {
    name: "Portugal",
    pattern: /^PT\d{9}$/,
    format: "PT + 9 digits (e.g. PT123456789)",
  },
  RO: {
    name: "Romania",
    pattern: /^RO\d{2,10}$/,
    format: "RO + 2–10 digits (e.g. RO1234567890)",
  },
  SE: {
    name: "Sweden",
    pattern: /^SE\d{12}$/,
    format: "SE + 12 digits (e.g. SE123456789012)",
  },
  SI: {
    name: "Slovenia",
    pattern: /^SI\d{8}$/,
    format: "SI + 8 digits (e.g. SI12345678)",
  },
  SK: {
    name: "Slovakia",
    pattern: /^SK\d{10}$/,
    format: "SK + 10 digits (e.g. SK1234567890)",
  },
  GB: {
    name: "United Kingdom",
    pattern: /^(GB(\d{9}|\d{12})|(GBGD|GBHA)\d{3})$/,
    format: "GB + 9/12 digits or GBGD/GBHA + 3 digits (e.g. GB123456789)",
  },
};

export function validateVatId(vatId: string): VatIdValidationResult {
  const trimmed = vatId.trim().toUpperCase().replace(/\s+/g, "");

  // Empty is valid (VAT ID is optional)
  if (!trimmed) {
    return {
      valid: true,
      country: "",
      format: "",
      message: "",
    };
  }

  // Determine country prefix (2 chars)
  const prefix = trimmed.substring(0, 2);
  const countryEntry = VAT_PATTERNS[prefix];

  if (!countryEntry) {
    return {
      valid: false,
      country: "",
      format: "",
      message: `Unknown country prefix "${prefix}". VAT IDs must start with a valid EU/UK country code.`,
    };
  }

  if (!countryEntry.pattern.test(trimmed)) {
    return {
      valid: false,
      country: countryEntry.name,
      format: countryEntry.format,
      message: `Invalid ${countryEntry.name} VAT ID format. Expected: ${countryEntry.format}`,
    };
  }

  return {
    valid: true,
    country: countryEntry.name,
    format: countryEntry.format,
    message: `Valid ${countryEntry.name} VAT ID format`,
  };
}
