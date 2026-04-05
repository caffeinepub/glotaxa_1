// VAT summary export utility — reads transaction history from localStorage
// and generates monthly/quarterly summaries with CSV and PDF export

export interface TransactionRecord {
  date: string;
  country: string;
  category: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  isOSS: boolean;
  currency: string;
  buyerType: string;
}

export interface MonthlySummary {
  month: string; // e.g. "January"
  year: number;
  monthIndex: number; // 0-based
  transactions: TransactionRecord[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  byCountry: Record<string, { net: number; vat: number; gross: number }>;
}

export interface OSSCountrySummary {
  country: string;
  netSales: number;
  vatAmount: number;
  vatRate: number;
}

export interface QuarterlyOSSReport {
  quarter: number; // 1-4
  year: number;
  transactions: TransactionRecord[];
  byCountry: OSSCountrySummary[];
  totalNet: number;
  totalVat: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getTransactionHistory(): TransactionRecord[] {
  try {
    const raw = localStorage.getItem("glotaxa_transactions");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TransactionRecord[];
  } catch {
    return [];
  }
}

export function getMonthlySummaries(): MonthlySummary[] {
  const transactions = getTransactionHistory();
  const map = new Map<string, MonthlySummary>();

  for (const tx of transactions) {
    const date = new Date(tx.date);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const key = `${year}-${monthIndex}`;

    if (!map.has(key)) {
      map.set(key, {
        month: MONTH_NAMES[monthIndex],
        year,
        monthIndex,
        transactions: [],
        totalNet: 0,
        totalVat: 0,
        totalGross: 0,
        byCountry: {},
      });
    }

    const summary = map.get(key)!;
    summary.transactions.push(tx);
    summary.totalNet += tx.netAmount;
    summary.totalVat += tx.vatAmount;
    summary.totalGross += tx.grossAmount;

    if (!summary.byCountry[tx.country]) {
      summary.byCountry[tx.country] = { net: 0, vat: 0, gross: 0 };
    }
    summary.byCountry[tx.country].net += tx.netAmount;
    summary.byCountry[tx.country].vat += tx.vatAmount;
    summary.byCountry[tx.country].gross += tx.grossAmount;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.monthIndex - a.monthIndex;
  });
}

export function getSummaryForMonth(
  year: number,
  monthIndex: number,
): MonthlySummary | null {
  const transactions = getTransactionHistory();
  const filtered = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });

  if (filtered.length === 0) return null;

  const byCountry: Record<string, { net: number; vat: number; gross: number }> =
    {};
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  for (const tx of filtered) {
    totalNet += tx.netAmount;
    totalVat += tx.vatAmount;
    totalGross += tx.grossAmount;
    if (!byCountry[tx.country]) {
      byCountry[tx.country] = { net: 0, vat: 0, gross: 0 };
    }
    byCountry[tx.country].net += tx.netAmount;
    byCountry[tx.country].vat += tx.vatAmount;
    byCountry[tx.country].gross += tx.grossAmount;
  }

  return {
    month: MONTH_NAMES[monthIndex],
    year,
    monthIndex,
    transactions: filtered,
    totalNet,
    totalVat,
    totalGross,
    byCountry,
  };
}

export function getQuarterlyOSSSummary(
  year: number,
  quarter: number,
): QuarterlyOSSReport {
  const transactions = getTransactionHistory();
  const quarterMonthStart = (quarter - 1) * 3;
  const quarterMonths = [
    quarterMonthStart,
    quarterMonthStart + 1,
    quarterMonthStart + 2,
  ];

  const filtered = transactions.filter((tx) => {
    if (!tx.isOSS) return false;
    const d = new Date(tx.date);
    return d.getFullYear() === year && quarterMonths.includes(d.getMonth());
  });

  const countryMap = new Map<string, OSSCountrySummary>();
  let totalNet = 0;
  let totalVat = 0;

  for (const tx of filtered) {
    totalNet += tx.netAmount;
    totalVat += tx.vatAmount;
    if (!countryMap.has(tx.country)) {
      countryMap.set(tx.country, {
        country: tx.country,
        netSales: 0,
        vatAmount: 0,
        vatRate: tx.vatRate,
      });
    }
    const entry = countryMap.get(tx.country)!;
    entry.netSales += tx.netAmount;
    entry.vatAmount += tx.vatAmount;
  }

  return {
    quarter,
    year,
    transactions: filtered,
    byCountry: Array.from(countryMap.values()),
    totalNet,
    totalVat,
  };
}

export function exportMonthlyCSV(summary: MonthlySummary): void {
  const lines = [
    `VAT Summary Report — ${summary.month} ${summary.year}`,
    "",
    `Total Net,${summary.totalNet.toFixed(2)}`,
    `Total VAT,${summary.totalVat.toFixed(2)}`,
    `Total Gross,${summary.totalGross.toFixed(2)}`,
    `Transactions,${summary.transactions.length}`,
    "",
    "By Country:",
    "Country,Net (EUR),VAT (EUR),Gross (EUR)",
    ...Object.entries(summary.byCountry).map(
      ([country, v]) =>
        `${country},${v.net.toFixed(2)},${v.vat.toFixed(2)},${v.gross.toFixed(2)}`,
    ),
    "",
    "Transaction Detail:",
    "Date,Country,Category,Buyer Type,Net Amount,VAT Rate,VAT Amount,Gross Amount,Currency,OSS",
    ...summary.transactions.map(
      (tx) =>
        `${new Date(tx.date).toLocaleDateString()},${tx.country},${tx.category},${tx.buyerType},${tx.netAmount.toFixed(2)},${tx.vatRate}%,${tx.vatAmount.toFixed(2)},${tx.grossAmount.toFixed(2)},${tx.currency},${tx.isOSS ? "Yes" : "No"}`,
    ),
  ];

  const csvString = lines.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vat-summary-${summary.year}-${String(summary.monthIndex + 1).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMonthlyPDF(summary: MonthlySummary): void {
  const byCountryRows = Object.entries(summary.byCountry)
    .map(
      ([country, v]) =>
        `<tr><td>${country}</td><td style="text-align:right">€${v.net.toFixed(2)}</td><td style="text-align:right">€${v.vat.toFixed(2)}</td><td style="text-align:right">€${v.gross.toFixed(2)}</td></tr>`,
    )
    .join("");

  const txRows = summary.transactions
    .map(
      (tx) =>
        `<tr><td>${new Date(tx.date).toLocaleDateString()}</td><td>${tx.country}</td><td>${tx.category}</td><td style="text-align:right">€${tx.netAmount.toFixed(2)}</td><td style="text-align:right">${tx.vatRate}%</td><td style="text-align:right">€${tx.vatAmount.toFixed(2)}</td><td style="text-align:right">€${tx.grossAmount.toFixed(2)}</td><td>${tx.isOSS ? "OSS" : ""}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VAT Summary — ${summary.month} ${summary.year}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:20px;color:#333}h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;color:#555;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f0f0f0;padding:8px;text-align:left;font-size:12px;border-bottom:2px solid #ccc}td{padding:8px;font-size:12px;border-bottom:1px solid #eee}.totals-box{background:#f9f9f9;padding:16px;border-radius:6px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.total-item{font-size:14px}.total-label{color:#666;font-size:11px;text-transform:uppercase}.grand{font-weight:bold;font-size:16px;color:#333}@media print{body{margin:0;padding:20px}}</style></head><body><h1>VAT Summary Report</h1><p style="color:#666">${summary.month} ${summary.year}</p><div class="totals-box"><div><div class="total-label">Total Net</div><div class="total-item">€${summary.totalNet.toFixed(2)}</div></div><div><div class="total-label">Total VAT</div><div class="total-item">€${summary.totalVat.toFixed(2)}</div></div><div><div class="total-label">Total Gross</div><div class="total-item grand">€${summary.totalGross.toFixed(2)}</div></div><div><div class="total-label">Transactions</div><div class="total-item">${summary.transactions.length}</div></div></div><h2>By Country</h2><table><thead><tr><th>Country</th><th style="text-align:right">Net (EUR)</th><th style="text-align:right">VAT (EUR)</th><th style="text-align:right">Gross (EUR)</th></tr></thead><tbody>${byCountryRows}</tbody></table><h2>Transaction Detail</h2><table><thead><tr><th>Date</th><th>Country</th><th>Category</th><th style="text-align:right">Net</th><th style="text-align:right">VAT%</th><th style="text-align:right">VAT Amt</th><th style="text-align:right">Gross</th><th>OSS</th></tr></thead><tbody>${txRows}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export function exportQuarterlyOSSCSV(report: QuarterlyOSSReport): void {
  const lines = [
    `Quarterly OSS VAT Report — Q${report.quarter} ${report.year}`,
    "",
    "Country,Net Sales (EUR),VAT Rate,VAT Amount (EUR)",
    ...report.byCountry.map(
      (c) =>
        `${c.country},${c.netSales.toFixed(2)},${c.vatRate}%,${c.vatAmount.toFixed(2)}`,
    ),
    "",
    `Total Net,${report.totalNet.toFixed(2)}`,
    `Total VAT,${report.totalVat.toFixed(2)}`,
    `OSS Transactions,${report.transactions.length}`,
  ];

  const csvString = lines.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oss-report-${report.year}-Q${report.quarter}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
