import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Building2,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Crown,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  LogOut,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase, useAuth } from "../contexts/AuthContext";
import {
  exportMonthlyCSV,
  exportMonthlyPDF,
  exportQuarterlyOSSCSV,
  getQuarterlyOSSSummary,
  getSummaryForMonth,
} from "../utils/vatSummaryExport";

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-primary/10 text-primary",
  pro: "bg-accent/20 text-accent-foreground",
  business: "bg-chart-2/20 text-chart-2",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

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

interface BusinessProfile {
  id: string;
  name: string;
  address: string;
  vatNumber: string;
  email: string;
  country: string;
}

export default function Dashboard({ onNavigate, onLogout }: DashboardProps) {
  const { userId, accessToken, currentPlan, setCurrentPlan, logout } =
    useAuth();
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Invoice usage state
  const [invoiceUsed, setInvoiceUsed] = useState<number | null>(null);
  const [invoiceLimit, setInvoiceLimit] = useState<number | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  // Section collapse state
  const [showVatSummary, setShowVatSummary] = useState(false);
  const [showBusinessProfiles, setShowBusinessProfiles] = useState(false);
  const [showTeamAccess, setShowTeamAccess] = useState(false);
  const [showOSSReport, setShowOSSReport] = useState(false);
  const [ossExporting, setOssExporting] = useState(false);

  // VAT Summary state
  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth());
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());

  // Quarterly OSS state
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const [ossQuarter, setOssQuarter] = useState(currentQuarter);
  const [ossYear, setOssYear] = useState(now.getFullYear());

  // Business Profiles state
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("glotaxa_businesses") || "[]");
    } catch {
      return [];
    }
  });
  const [newBiz, setNewBiz] = useState({
    name: "",
    address: "",
    vatNumber: "",
    email: "",
    country: "",
  });
  const [bizError, setBizError] = useState<string | null>(null);

  // Team Access state
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("glotaxa_team_members") || "[]");
    } catch {
      return [];
    }
  });
  const [newEmail, setNewEmail] = useState("");
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isExportingBackend, setIsExportingBackend] = useState(false);
  const [backendExportError, setBackendExportError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!userId || !accessToken) return;

    const fetchPlanAndUsage = async () => {
      // Fetch plan using supabase client
      if (!currentPlan) {
        setIsLoadingPlan(true);
        setPlanError(null);
        try {
          const { data, error } = await supabase
            .from("users")
            .select("plan")
            .eq("id", userId)
            .single();

          if (error) {
            setPlanError("Could not load your plan. Please refresh.");
          } else if (data) {
            setCurrentPlan((data.plan as string) ?? "free");
          } else {
            setCurrentPlan("free");
          }
        } catch {
          setPlanError("Network error loading plan.");
        } finally {
          setIsLoadingPlan(false);
        }
      }

      // Fetch invoice usage via RPC
      setIsLoadingUsage(true);
      setUsageError(null);
      try {
        const { data, error } = await supabase.rpc("get_invoice_usage");
        if (error) {
          setUsageError("Could not load invoice usage.");
        } else if (Array.isArray(data) && data.length > 0) {
          setInvoiceUsed(data[0].invoice_used ?? 0);
          setInvoiceLimit(data[0].invoice_limit ?? 5);
        } else {
          setInvoiceUsed(0);
          setInvoiceLimit(5);
        }
      } catch {
        setUsageError("Network error loading usage.");
      } finally {
        setIsLoadingUsage(false);
      }
    };

    fetchPlanAndUsage();
  }, [userId, accessToken, currentPlan, setCurrentPlan]);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const planKey = (currentPlan ?? "free").toLowerCase();
  const planLabel = PLAN_LABELS[planKey] ?? planKey;
  const planColorClass = PLAN_COLORS[planKey] ?? PLAN_COLORS.free;

  const usagePercent =
    invoiceLimit && invoiceLimit > 0
      ? Math.min(100, Math.round(((invoiceUsed ?? 0) / invoiceLimit) * 100))
      : 0;
  const isAtLimit =
    invoiceUsed !== null &&
    invoiceLimit !== null &&
    invoiceUsed >= invoiceLimit;

  const isPaidPlan =
    planKey === "starter" || planKey === "pro" || planKey === "business";
  const isBusinessPlan = planKey === "business";
  const isStarterPlus = isPaidPlan;

  // --- VAT Summary export handlers ---
  const selectedSummary = getSummaryForMonth(summaryYear, summaryMonth);

  const handleExportMonthlyCSV = () => {
    if (!selectedSummary) return;
    exportMonthlyCSV(selectedSummary);
  };

  const handleExportMonthlyPDF = () => {
    if (!selectedSummary) return;
    exportMonthlyPDF(selectedSummary);
  };

  const handleExportVatSummaryBackend = async () => {
    setIsExportingBackend(true);
    setBackendExportError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setBackendExportError("Not signed in. Please log in to export.");
        return;
      }
      const monthStr = `${summaryYear}-${String(summaryMonth + 1).padStart(2, "0")}`;
      const res = await fetch(
        "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/export-vat-summary",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ month: monthStr }),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }
      const data = await res.json();
      // If the function returns a download URL, open it; otherwise show success
      if (data.url) {
        window.open(data.url, "_blank");
      } else if (data.csv) {
        const blob = new Blob([data.csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `vat-summary-${monthStr}.csv`;
        link.click();
      } else {
        console.log("VAT summary export response:", data);
        alert("Export complete. Check your email or downloads.");
      }
    } catch (err) {
      setBackendExportError(
        err instanceof Error ? err.message : "Export failed",
      );
    } finally {
      setIsExportingBackend(false);
    }
  };

  // --- Quarterly OSS ---
  const ossReport = getQuarterlyOSSSummary(ossYear, ossQuarter);

  const handleExportOSSCSV = () => {
    exportQuarterlyOSSCSV(ossReport);
  };

  const handleExportOSSBackend = async () => {
    setOssExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        alert("Not signed in. Please log in to export.");
        return;
      }
      const quarterLabel = `Q${ossQuarter}`;
      const res = await fetch(
        "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/export-oss-quarterly",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ year: ossYear, quarter: quarterLabel }),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.csv) {
        const blob = new Blob([data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `oss-report-${quarterLabel}-${ossYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("Export complete. No CSV data returned.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "OSS export failed.");
    } finally {
      setOssExporting(false);
    }
  };

  // --- Business Profiles ---
  const saveBusinesses = (updated: BusinessProfile[]) => {
    setBusinesses(updated);
    localStorage.setItem("glotaxa_businesses", JSON.stringify(updated));
  };

  const handleAddBusiness = () => {
    if (!newBiz.name.trim()) {
      setBizError("Business name is required.");
      return;
    }
    if (businesses.length >= 5) {
      setBizError("Maximum 5 business profiles allowed.");
      return;
    }
    setBizError(null);
    const updated = [...businesses, { ...newBiz, id: crypto.randomUUID() }];
    saveBusinesses(updated);
    setNewBiz({ name: "", address: "", vatNumber: "", email: "", country: "" });
  };

  const handleDeleteBusiness = (id: string) => {
    saveBusinesses(businesses.filter((b) => b.id !== id));
  };

  // --- Team Access ---
  const saveTeam = (updated: string[]) => {
    setTeamMembers(updated);
    localStorage.setItem("glotaxa_team_members", JSON.stringify(updated));
  };

  const handleInviteMember = () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setTeamError("Enter a valid email address.");
      return;
    }
    if (teamMembers.length >= 3) {
      setTeamError("Maximum 3 team members allowed.");
      return;
    }
    if (teamMembers.includes(newEmail.trim())) {
      setTeamError("This email is already invited.");
      return;
    }
    setTeamError(null);
    saveTeam([...teamMembers, newEmail.trim()]);
    setNewEmail("");
  };

  const handleRemoveMember = (email: string) => {
    saveTeam(teamMembers.filter((m) => m !== email));
  };

  // Generate year options for selectors (last 3 years + current)
  const yearOptions = Array.from(
    { length: 4 },
    (_, i) => now.getFullYear() - 3 + i,
  ).reverse();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Welcome header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Manage your invoices and account.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted-foreground"
          data-ocid="dashboard.button"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>

      {/* Plan card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Current Plan
              </p>
              {isLoadingPlan ? (
                <div
                  className="flex items-center gap-2 mt-1"
                  data-ocid="dashboard.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Loading…
                  </span>
                </div>
              ) : planError ? (
                <p
                  className="text-sm text-destructive mt-1"
                  data-ocid="dashboard.error_state"
                >
                  {planError}
                </p>
              ) : (
                <Badge
                  className={`mt-1 text-sm font-semibold px-3 py-0.5 ${planColorClass}`}
                >
                  {planLabel}
                </Badge>
              )}
            </div>
          </div>
          {planKey === "free" && !isLoadingPlan && (
            <Button
              size="sm"
              onClick={() => onNavigate("pricing")}
              data-ocid="dashboard.primary_button"
            >
              Upgrade Plan
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Usage card */}
      <div
        className="bg-card border border-border rounded-2xl p-6 mb-6"
        data-ocid="dashboard.card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-chart-2/10">
            <Receipt className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Invoice Usage
            </p>
            <p className="text-sm font-semibold text-foreground">
              {isLoadingUsage ? (
                <span className="text-muted-foreground">Loading…</span>
              ) : usageError ? (
                <span className="text-destructive text-xs">{usageError}</span>
              ) : (
                <span>
                  {invoiceUsed ?? 0}{" "}
                  <span className="text-muted-foreground font-normal">
                    / {invoiceLimit ?? 5} invoices used this period
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>

        {isLoadingUsage ? (
          <div
            className="flex items-center gap-2"
            data-ocid="dashboard.usage.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Fetching usage…
            </span>
          </div>
        ) : usageError ? (
          <div
            className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive"
            data-ocid="dashboard.usage.error_state"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{usageError}</span>
          </div>
        ) : (
          <>
            <Progress
              value={usagePercent}
              className={`h-2 mb-2 ${
                isAtLimit
                  ? "[&>div]:bg-destructive"
                  : usagePercent >= 80
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-chart-2"
              }`}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {usagePercent}% used
              </span>
              {isAtLimit && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Limit reached
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate("pricing")}
                    className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    data-ocid="dashboard.secondary_button"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── SECTION A: Monthly VAT Summary Export (all plans) ── */}
      <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVatSummary((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
          data-ocid="dashboard.vat_summary.toggle"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Monthly VAT Summary Export
              </p>
              <p className="text-xs text-muted-foreground">
                Download your monthly VAT reports as CSV or PDF
              </p>
            </div>
          </div>
          {showVatSummary ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showVatSummary && (
          <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Month
                </p>
                <select
                  value={summaryMonth}
                  onChange={(e) => setSummaryMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-ocid="dashboard.vat_summary.select"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Year
                </p>
                <select
                  value={summaryYear}
                  onChange={(e) => setSummaryYear(Number(e.target.value))}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSummary ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Net Total",
                      value: `€${selectedSummary.totalNet.toFixed(2)}`,
                    },
                    {
                      label: "VAT Total",
                      value: `€${selectedSummary.totalVat.toFixed(2)}`,
                    },
                    {
                      label: "Gross Total",
                      value: `€${selectedSummary.totalGross.toFixed(2)}`,
                    },
                    {
                      label: "Transactions",
                      value: String(selectedSummary.transactions.length),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-muted/60 rounded-lg p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {Object.keys(selectedSummary.byCountry).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 text-muted-foreground font-medium">
                            Country
                          </th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium">
                            Net
                          </th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium">
                            VAT
                          </th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium">
                            Gross
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedSummary.byCountry).map(
                          ([country, v]) => (
                            <tr
                              key={country}
                              className="border-b border-border/50"
                            >
                              <td className="py-1.5 font-mono font-semibold text-foreground">
                                {country}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                €{v.net.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                €{v.vat.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right text-foreground font-medium">
                                €{v.gross.toFixed(2)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportMonthlyCSV}
                    className="flex items-center gap-1.5"
                    data-ocid="dashboard.vat_summary.csv_button"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportMonthlyPDF}
                    className="flex items-center gap-1.5"
                    data-ocid="dashboard.vat_summary.pdf_button"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Export PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleExportVatSummaryBackend}
                    disabled={isExportingBackend}
                    className="flex items-center gap-1.5"
                    data-ocid="dashboard.vat_summary.backend_export_button"
                  >
                    {isExportingBackend ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    {isExportingBackend ? "Exporting..." : "Export via Backend"}
                  </Button>
                </div>
                {backendExportError && (
                  <p className="text-xs text-destructive mt-1">
                    {backendExportError}
                  </p>
                )}
              </>
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="dashboard.vat_summary.empty_state"
              >
                No transactions recorded for {MONTH_NAMES[summaryMonth]}{" "}
                {summaryYear}. Calculate VAT transactions to populate your
                report.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION D: Quarterly OSS VAT Report (Starter+ plans) ── */}
      <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOSSReport((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
          data-ocid="dashboard.oss_report.toggle"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-chart-1/10">
              <Globe className="w-4 h-4 text-chart-1" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Quarterly OSS VAT Report
              </p>
              <p className="text-xs text-muted-foreground">
                Export OSS transactions grouped by destination country
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isStarterPlus && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                Starter+ Plan
              </Badge>
            )}
            {showOSSReport ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {showOSSReport && (
          <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
            {!isStarterPlus ? (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  Starter plan or above required
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Upgrade to access quarterly OSS VAT reports.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => onNavigate("pricing")}
                  data-ocid="dashboard.oss_report.upgrade_button"
                >
                  Upgrade Plan
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-3 flex-wrap">
                  <div>
                    <p className="block text-xs font-medium text-muted-foreground mb-1">
                      Quarter
                    </p>
                    <select
                      id="oss-quarter"
                      value={ossQuarter}
                      onChange={(e) => setOssQuarter(Number(e.target.value))}
                      className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      data-ocid="dashboard.oss_report.quarter_select"
                    >
                      <option value={1}>Q1 (Jan–Mar)</option>
                      <option value={2}>Q2 (Apr–Jun)</option>
                      <option value={3}>Q3 (Jul–Sep)</option>
                      <option value={4}>Q4 (Oct–Dec)</option>
                    </select>
                  </div>
                  <div>
                    <p className="block text-xs font-medium text-muted-foreground mb-1">
                      Year
                    </p>
                    <select
                      value={ossYear}
                      onChange={(e) => setOssYear(Number(e.target.value))}
                      className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {ossReport.transactions.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1.5 text-muted-foreground font-medium">
                              Country
                            </th>
                            <th className="text-right py-1.5 text-muted-foreground font-medium">
                              Net Sales (EUR)
                            </th>
                            <th className="text-right py-1.5 text-muted-foreground font-medium">
                              VAT Rate
                            </th>
                            <th className="text-right py-1.5 text-muted-foreground font-medium">
                              VAT Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ossReport.byCountry.map((c) => (
                            <tr
                              key={c.country}
                              className="border-b border-border/50"
                            >
                              <td className="py-1.5 font-mono font-semibold text-foreground">
                                {c.country}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                €{c.netSales.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                {c.vatRate}%
                              </td>
                              <td className="py-1.5 text-right text-foreground font-medium">
                                €{c.vatAmount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2 pt-2 text-xs text-muted-foreground">
                      <span>
                        Total OSS transactions: {ossReport.transactions.length}
                      </span>
                      <span>·</span>
                      <span>Total VAT: €{ossReport.totalVat.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportOSSCSV}
                        className="flex items-center gap-1.5"
                        data-ocid="dashboard.oss_report.export_button"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Export CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleExportOSSBackend}
                        disabled={ossExporting}
                        className="flex items-center gap-1.5"
                        data-ocid="dashboard.oss_report.backend_export_button"
                      >
                        {ossExporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        {ossExporting ? "Exporting..." : "Export via Backend"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="dashboard.oss_report.empty_state"
                  >
                    No OSS transactions recorded for Q{ossQuarter} {ossYear}.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION B: Business Profiles (Business plan only) ── */}
      <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBusinessProfiles((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
          data-ocid="dashboard.business_profiles.toggle"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-chart-3/10">
              <Building2 className="w-4 h-4 text-chart-3" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Business Profiles
              </p>
              <p className="text-xs text-muted-foreground">
                Save up to 5 business profiles for quick invoice pre-fill
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isBusinessPlan && (
              <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                Business Plan
              </Badge>
            )}
            {showBusinessProfiles ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {showBusinessProfiles && (
          <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
            {!isBusinessPlan ? (
              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 rounded-lg p-4">
                <p className="text-sm text-violet-800 dark:text-violet-200 font-medium">
                  Business plan required
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                  Upgrade to Business to manage multiple business profiles.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => onNavigate("pricing")}
                  data-ocid="dashboard.business_profiles.upgrade_button"
                >
                  Upgrade Plan
                </Button>
              </div>
            ) : (
              <>
                {/* Add new business form */}
                {businesses.length < 5 && (
                  <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-foreground">
                      Add Business Profile ({businesses.length}/5)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="block text-xs text-muted-foreground mb-1">
                          Business Name *
                        </p>
                        <input
                          value={newBiz.name}
                          onChange={(e) =>
                            setNewBiz((b) => ({ ...b, name: e.target.value }))
                          }
                          id="biz-name"
                          placeholder="Acme GmbH"
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          data-ocid="dashboard.business_profiles.name_input"
                        />
                      </div>
                      <div>
                        <p className="block text-xs text-muted-foreground mb-1">
                          VAT Number
                        </p>
                        <input
                          value={newBiz.vatNumber}
                          onChange={(e) =>
                            setNewBiz((b) => ({
                              ...b,
                              vatNumber: e.target.value,
                            }))
                          }
                          id="biz-vat"
                          placeholder="DE123456789"
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <p className="block text-xs text-muted-foreground mb-1">
                          Address
                        </p>
                        <input
                          value={newBiz.address}
                          onChange={(e) =>
                            setNewBiz((b) => ({
                              ...b,
                              address: e.target.value,
                            }))
                          }
                          id="biz-address"
                          placeholder="123 Business St, Berlin"
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <p className="block text-xs text-muted-foreground mb-1">
                          Email
                        </p>
                        <input
                          value={newBiz.email}
                          onChange={(e) =>
                            setNewBiz((b) => ({ ...b, email: e.target.value }))
                          }
                          id="biz-email"
                          placeholder="billing@acme.com"
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <p className="block text-xs text-muted-foreground mb-1">
                          Country
                        </p>
                        <input
                          value={newBiz.country}
                          onChange={(e) =>
                            setNewBiz((b) => ({
                              ...b,
                              country: e.target.value,
                            }))
                          }
                          id="biz-country"
                          placeholder="DE"
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    {bizError && (
                      <p className="text-xs text-destructive">{bizError}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={handleAddBusiness}
                      data-ocid="dashboard.business_profiles.add_button"
                    >
                      Add Profile
                    </Button>
                  </div>
                )}

                {/* Existing business profiles list */}
                {businesses.length > 0 ? (
                  <div className="space-y-2">
                    {businesses.map((biz, idx) => (
                      <div
                        key={biz.id}
                        className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3"
                        data-ocid={`dashboard.business_profiles.item.${idx + 1}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {biz.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[biz.vatNumber, biz.country, biz.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBusiness(biz.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          data-ocid={`dashboard.business_profiles.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="dashboard.business_profiles.empty_state"
                  >
                    No business profiles yet. Add one above.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION C: Team Access (Business plan only) ── */}
      <div className="bg-card border border-border rounded-2xl mb-8 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTeamAccess((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
          data-ocid="dashboard.team_access.toggle"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-chart-2/10">
              <Users className="w-4 h-4 text-chart-2" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Team Access
              </p>
              <p className="text-xs text-muted-foreground">
                Invite up to 3 team members to your workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isBusinessPlan && (
              <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                Business Plan
              </Badge>
            )}
            {showTeamAccess ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {showTeamAccess && (
          <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
            {!isBusinessPlan ? (
              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 rounded-lg p-4">
                <p className="text-sm text-violet-800 dark:text-violet-200 font-medium">
                  Business plan required
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                  Upgrade to Business to invite team members.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => onNavigate("pricing")}
                  data-ocid="dashboard.team_access.upgrade_button"
                >
                  Upgrade Plan
                </Button>
              </div>
            ) : (
              <>
                {teamMembers.length < 3 && (
                  <div className="flex gap-2">
                    <input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleInviteMember()
                      }
                      placeholder="colleague@company.com"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      data-ocid="dashboard.team_access.email_input"
                    />
                    <Button
                      size="sm"
                      onClick={handleInviteMember}
                      data-ocid="dashboard.team_access.invite_button"
                    >
                      Invite
                    </Button>
                  </div>
                )}
                {teamError && (
                  <p className="text-xs text-destructive">{teamError}</p>
                )}

                {teamMembers.length > 0 ? (
                  <div className="space-y-2">
                    {teamMembers.map((email, idx) => (
                      <div
                        key={email}
                        className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3"
                        data-ocid={`dashboard.team_access.item.${idx + 1}`}
                      >
                        <span className="text-sm text-foreground">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(email)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          data-ocid={`dashboard.team_access.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="dashboard.team_access.empty_state"
                  >
                    No team members invited yet.
                  </p>
                )}

                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  ℹ️ Team members will receive an invite email once backend sync
                  is enabled. ({teamMembers.length}/3 invited)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <h2 className="text-base font-semibold text-foreground mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          type="button"
          onClick={() => onNavigate("country")}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
          data-ocid="dashboard.link"
        >
          <Globe className="w-8 h-8 text-chart-1 mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            Select Region
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a country and calculate VAT
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("invoice")}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
          data-ocid="dashboard.link"
        >
          <FileText className="w-8 h-8 text-chart-2 mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            Create Invoice
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a compliant EN 16931 invoice
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("pricing")}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
          data-ocid="dashboard.link"
        >
          <CreditCard className="w-8 h-8 text-chart-3 mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            Manage Plan
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            View and upgrade your subscription
          </p>
        </button>
      </div>

      {/* Info */}
      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">About Glotaxa</p>
            <p className="text-xs text-muted-foreground mt-1">
              Glotaxa helps you calculate VAT correctly for 11 countries and
              generate EN 16931 compliant invoices. Your session is stored
              locally and never shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
