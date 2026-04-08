import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Augment window with invoiceData for AI context
declare global {
  interface Window {
    invoiceData?: {
      country: string;
      amount: number;
      vat_rate: number;
      customer_type: string;
    };
  }
}
import type { InvoicePrePopData, TabName } from "../App";
import UpgradeModal from "../components/UpgradeModal";
import { supabase, useAuth } from "../contexts/AuthContext";
import { VAT_RULES } from "../data/vatRules";
import type { CountryCode } from "../data/vatRules";
import type { Invoice16931, InvoiceLineItem } from "../types/invoice";
import { downloadInvoicePDF } from "../utils/invoicePDF";
import { downloadInvoiceXMLWithOSS } from "../utils/invoiceXML";
import { validateVatId } from "../utils/vatIdValidator";
import type { VatIdValidationResult } from "../utils/vatIdValidator";

interface InvoiceProps {
  setActiveTab: (tab: TabName) => void;
  prePopData: InvoicePrePopData | null;
  onInvoiceGenerated?: (
    invoiceNumber: string,
    totalAmount: number,
    currency: string,
  ) => void;
}

interface LocalLineItem {
  id: string;
  description: string;
  itemType: string;
  netAmount: number;
  vatCategory: string;
  vatRate: number;
}

interface BusinessProfile {
  id: string;
  name: string;
  address: string;
  vatNumber: string;
  email: string;
  country: string;
}

const MAX_LINE_ITEMS = 3;

const ITEM_TYPES = ["Goods", "Services", "Digital Services", "Mixed"];
const VAT_CATEGORIES_LIST = [
  "Others",
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
];
const CURRENCIES = ["EUR", "GBP", "SEK", "PLN", "HUF"];

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(VAT_RULES).map(([code, rule]) => [code, rule.name]),
);

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function getVatRateForCategory(
  vatCategory: string,
  country: CountryCode,
): number {
  const rules = VAT_RULES[country];
  if (!rules) return 0;

  if (country === "GB") {
    if (vatCategory === "Intra-EU B2B") return 0;
    if (vatCategory === "Transport") return 20;
    if (rules.categoryRates && vatCategory in rules.categoryRates) {
      return rules.categoryRates[vatCategory].rate;
    }
    return rules.standard;
  }

  switch (vatCategory) {
    case "Financial Services":
    case "Insurance":
    case "Education":
      return 0;
    case "Exports":
    case "Intra-EU B2B":
      return 0;
    case "Basic Food":
    case "Books":
    case "Medical":
    case "Transport":
    case "Hotel":
      return rules.reduced ?? rules.standard;
    default:
      return rules.standard;
  }
}

const WIDGET_PLAN_LIMITS: Record<string, number> = {
  free: 5,
  starter: 200,
  pro: 1000,
  business: 5000,
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

const WIDGET_TYPING_SPEED = 15;

function AskVATWidget() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! Ask me anything about EU/UK VAT.",
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { accessToken, currentPlan } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userPlan = currentPlan || "free";
  const aiLimit = WIDGET_PLAN_LIMITS[userPlan] ?? 5;

  const signedIn = !!accessToken;
  const aiUsage = Number.parseInt(
    localStorage.getItem(signedIn ? "ai_vat_usage" : "guestCount") ?? "0",
    10,
  );
  const guestLimit = 5;
  const isAILimitReached = signedIn
    ? aiUsage >= aiLimit
    : aiUsage >= guestLimit;

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, []);

  // Animate text into a message bubble character by character
  const typeMessage = useCallback(
    (msgId: string, fullText: string, baseMessages: ChatMessage[]) => {
      let i = 0;
      setMessages([
        ...baseMessages,
        { id: msgId, role: "assistant", content: "", isTyping: true },
      ]);

      const tick = () => {
        i++;
        const partial = fullText.slice(0, i);
        const done = i >= fullText.length;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: partial, isTyping: !done } : m,
          ),
        );
        if (!done) {
          typingRef.current = setTimeout(tick, WIDGET_TYPING_SPEED);
        }
      };
      typingRef.current = setTimeout(tick, WIDGET_TYPING_SPEED);
    },
    [],
  );

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAsking) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: trimmed,
    };

    // Guest limit check
    if (!signedIn && aiUsage >= guestLimit) {
      const upgradeText =
        "You've used your 5 free queries. Sign in and upgrade to continue using AI VAT Assistant.";
      const base: ChatMessage[] = [...messages, userMsg];
      typeMessage(`ai-${Date.now()}`, upgradeText, base);
      return;
    }

    // Signed-in plan limit check
    if (signedIn && aiUsage >= aiLimit) {
      const upgradeText =
        "🚀 You've reached your free limit.\nUpgrade to continue using AI VAT Assistant.";
      const base: ChatMessage[] = [...messages, userMsg];
      typeMessage(`ai-${Date.now()}`, upgradeText, base);
      return;
    }

    const baseMessages: ChatMessage[] = [...messages, userMsg];
    setMessages([
      ...baseMessages,
      {
        id: "thinking",
        role: "assistant",
        content: "🤖 AI is thinking…",
        isTyping: false,
      },
    ]);
    setInput("");
    setIsAsking(true);

    // Read invoice context from window.invoiceData
    const invoiceContext = window.invoiceData ?? undefined;

    try {
      const res = await fetch(
        "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/ai-vat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            question: trimmed,
            context: invoiceContext,
          }),
        },
      );
      const data = await res.json();

      // Remove thinking bubble
      setMessages(baseMessages);

      if (data.error === "LIMIT_REACHED" || res.status === 403) {
        const upgradeText =
          "🚀 You've reached your free limit.\nUpgrade to continue using AI VAT Assistant.";
        typeMessage(`ai-upgrade-${Date.now()}`, upgradeText, baseMessages);
        setShowUpgradeModal(true);
        return;
      }

      const answer = data.answer ?? "Sorry, could not get a response.";
      typeMessage(`ai-${Date.now()}`, answer, baseMessages);

      // Increment usage counter
      const newUsage = aiUsage + 1;
      localStorage.setItem(
        signedIn ? "ai_vat_usage" : "guestCount",
        String(newUsage),
      );
    } catch {
      setMessages(baseMessages);
      typeMessage(
        `ai-err-${Date.now()}`,
        "Something went wrong. Please try again.",
        baseMessages,
      );
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Invoice-aware quick prompts
  const quickPrompts = [
    { label: "Check VAT", question: "What VAT applies to this invoice?" },
    { label: "OSS Check", question: "Is OSS applicable for this transaction?" },
    { label: "Explain VAT", question: "Explain VAT for this invoice" },
  ];

  // Floating button (chat closed)
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed z-50 flex items-center justify-center text-2xl text-white shadow-xl transition-transform hover:scale-110 cursor-pointer"
        style={{
          bottom: "20px",
          right: "20px",
          background: "#4CAF50",
          padding: "12px",
          borderRadius: "50%",
          width: "52px",
          height: "52px",
          border: "none",
        }}
        title="Ask a VAT question"
        data-ocid="invoice.chat_widget.open_button"
      >
        💬
      </button>
    );
  }

  // Chat box (open)
  return (
    <>
      <div
        className="fixed z-50 flex flex-col bg-card border border-border shadow-2xl"
        style={{
          bottom: "80px",
          right: "20px",
          width: "300px",
          height: "400px",
          borderRadius: "16px",
          overflow: "hidden",
        }}
        data-ocid="invoice.chat_widget.box"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: "#4CAF50" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <h3 className="font-semibold text-white text-sm">
              Ask VAT Question
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white text-xl leading-none font-bold"
            aria-label="Close chat"
            data-ocid="invoice.chat_widget.close_button"
          >
            &times;
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-1"
          style={{ background: "var(--background)" }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <span
                className="inline-block text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap"
                style={{
                  margin: "5px 0",
                  padding: "8px",
                  borderRadius: "8px",
                  background: msg.role === "user" ? "#DCF8C6" : "#F1F0F0",
                  color: "#1a1a1a",
                  fontStyle: msg.id === "thinking" ? "italic" : "normal",
                }}
              >
                {msg.content}
                {msg.isTyping && (
                  <span className="inline-block w-0.5 h-3 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </span>
            </div>
          ))}
          {/* "AI is thinking" shown via messages array — scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        <div
          className="flex gap-1.5 px-3 py-2 shrink-0 overflow-x-auto"
          style={{ background: "var(--muted)" }}
        >
          {quickPrompts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => sendMessage(p.question)}
              disabled={isAsking || isAILimitReached}
              className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
              data-ocid={`invoice.chat_widget.quick_prompt.${p.label.toLowerCase().replace(/\s+/g, "_")}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0 border-t border-border"
          style={{ background: "var(--background)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask VAT question..."
            disabled={isAILimitReached || isAsking}
            className="flex-1 text-sm border border-border rounded-full px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:bg-muted min-w-0"
            data-ocid="invoice.chat_widget.input"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isAILimitReached || isAsking || !input.trim()}
            className="shrink-0 w-8 h-8 rounded-full text-white text-sm flex items-center justify-center disabled:opacity-50 transition-opacity"
            style={{ background: "#4CAF50" }}
            aria-label="Send message"
            data-ocid="invoice.chat_widget.send_button"
          >
            ➤
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}

export default function Invoice({
  setActiveTab,
  prePopData,
  onInvoiceGenerated,
}: InvoiceProps) {
  const today = new Date().toISOString().split("T")[0];
  const dueDateDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { accessToken, isAuthenticated, userId, currentPlan } = useAuth();
  const planKey = (currentPlan ?? "free").toLowerCase();
  const canBulkImport = planKey === "pro" || planKey === "business";

  // Business profiles from localStorage
  const savedBusinesses: BusinessProfile[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("glotaxa_businesses") || "[]");
    } catch {
      return [];
    }
  }, []);

  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(dueDateDefault);

  // Seller details
  const [sellerName, setSellerName] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerVatNumber, setSellerVatNumber] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerCountry, setSellerCountry] = useState<CountryCode>("DE");

  // Buyer details
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState("");
  const [buyerTaxIdValidation, setBuyerTaxIdValidation] =
    useState<VatIdValidationResult | null>(null);
  const [buyerContractNumber, setBuyerContractNumber] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LocalLineItem[]>([
    {
      id: "1",
      description: "Professional Services",
      itemType: "Services",
      netAmount: 1000,
      vatCategory: "Others",
      vatRate: 20,
    },
  ]);

  const [currency, setCurrency] = useState("EUR");
  const [paymentMeans, setPaymentMeans] = useState("Bank Transfer");
  const [iban, setIban] = useState("");
  const [earlyPaymentDiscount, setEarlyPaymentDiscount] = useState(
    "2% if paid within 10 days",
  );
  const [latePenaltyTerms, setLatePenaltyTerms] = useState(
    "1.5% per month on overdue amounts",
  );
  const [notes, setNotes] = useState("");

  // Bulk CSV import state
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvPreview, setCsvPreview] = useState<LocalLineItem[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Inline Ask VAT Question state
  const [invoiceQuestion, setInvoiceQuestion] = useState("");
  const [invoiceAnswer, setInvoiceAnswer] = useState("");
  const [invoiceAILoading, setInvoiceAILoading] = useState(false);
  const [invoiceAIError, setInvoiceAIError] = useState<string | null>(null);
  // Generate Invoice state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const atLineItemLimit = lineItems.length >= MAX_LINE_ITEMS;

  // Track OSS from prePopData
  const isOSS = prePopData?.isOSS ?? false;
  const buyerCountry = prePopData?.country ?? "";

  // Pre-populate from transaction data
  useEffect(() => {
    if (!prePopData) return;

    setSellerCountry((prePopData.country as CountryCode) || "DE");

    const descriptionMap: Record<string, string> = {
      Others: "Professional Services",
      "Basic Food": "Food & Beverages Supply",
      Books: "Books & Publications",
      Medical: "Medical Supplies",
      Transport: "Transport Services",
      Hotel: "Hotel & Accommodation",
      "Financial Services": "Financial Services",
      Insurance: "Insurance Services",
      Education: "Educational Services",
      Exports: "Export of Goods",
      "Intra-EU B2B": "Intra-EU B2B Supply",
    };

    const itemTypeMap: Record<string, string> = {
      Others: "Services",
      "Basic Food": "Goods",
      Books: "Goods",
      Medical: "Goods",
      Transport: "Services",
      Hotel: "Services",
      "Financial Services": "Services",
      Insurance: "Services",
      Education: "Services",
      Exports: "Goods",
      "Intra-EU B2B": "Goods",
    };

    setLineItems([
      {
        id: "1",
        description: descriptionMap[prePopData.category] || prePopData.category,
        itemType: itemTypeMap[prePopData.category] || "Services",
        netAmount: prePopData.netAmount,
        vatCategory: prePopData.category,
        vatRate: prePopData.vatRate,
      },
    ]);

    const currencyMap: Record<string, string> = {
      GB: "GBP",
      SE: "SEK",
      PL: "PLN",
      HU: "HUF",
    };
    setCurrency(currencyMap[prePopData.country] || "EUR");

    if (prePopData.vatType === "Reverse Charge") {
      setNotes(
        "VAT reverse charge applies. The recipient is liable for the VAT amount under Article 196 of the EU VAT Directive.",
      );
    }

    // Add OSS note if applicable
    if (prePopData.isOSS) {
      setNotes(
        `OSS Scheme \u2014 VAT remitted to ${prePopData.country} tax authority under the EU One-Stop-Shop scheme.`,
      );
    }
  }, [prePopData]);

  const updateLineItem = (
    id: string,
    field: keyof LocalLineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "vatCategory") {
          updated.vatRate = getVatRateForCategory(
            value as string,
            sellerCountry,
          );
        }
        return updated;
      }),
    );
  };

  const addLineItem = () => {
    if (atLineItemLimit) return;
    setLineItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        itemType: "Services",
        netAmount: 0,
        vatCategory: "Others",
        vatRate: getVatRateForCategory("Others", sellerCountry),
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Load business profile
  const handleLoadBusiness = (bizId: string) => {
    const biz = savedBusinesses.find((b) => b.id === bizId);
    if (!biz) return;
    setSellerName(biz.name);
    setSellerAddress(biz.address);
    setSellerVatNumber(biz.vatNumber);
    setSellerEmail(biz.email);
    setSellerCountry((biz.country as CountryCode) || "DE");
  };

  // CSV parsing for bulk import
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    setCsvPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        // Skip header row if present
        const dataLines = lines[0].toLowerCase().includes("description")
          ? lines.slice(1)
          : lines;

        if (dataLines.length === 0) {
          setCsvError("CSV file appears to be empty.");
          return;
        }

        const parsed: LocalLineItem[] = dataLines
          .slice(0, MAX_LINE_ITEMS)
          .map((line, i) => {
            const cols = line
              .split(",")
              .map((c) => c.trim().replace(/^"|"$/g, ""));
            const description = cols[0] || "Item";
            const quantity = Number.parseFloat(cols[1] || "1") || 1;
            const unitPrice = Number.parseFloat(cols[2] || "0") || 0;
            const vatRate = Number.parseFloat(cols[3] || "0") || 0;
            return {
              id: `csv-${i}-${Date.now()}`,
              description,
              itemType: "Services",
              netAmount: unitPrice * quantity,
              vatCategory: "Others",
              vatRate,
            };
          });

        setCsvPreview(parsed);
      } catch {
        setCsvError("Failed to parse CSV. Please check the format.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  const handleLoadCSVIntoInvoice = () => {
    if (csvPreview.length === 0) return;
    setLineItems(csvPreview);
    setCsvPreview([]);
    setShowCSVImport(false);
  };

  // Buyer VAT ID validation on blur
  const handleBuyerTaxIdBlur = async () => {
    if (!buyerTaxId.trim()) {
      setBuyerTaxIdValidation(null);
      return;
    }
    const localResult = validateVatId(buyerTaxId.trim());
    if (!localResult.valid) {
      setBuyerTaxIdValidation(localResult);
      return;
    }
    try {
      const res = await fetch(
        "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/validate-vat-id",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vat_number: buyerTaxId.trim() }),
        },
      );
      const data = await res.json();
      if (!data.valid) {
        setBuyerTaxIdValidation({
          ...localResult,
          valid: false,
          message: "VAT ID could not be verified. Please check and try again.",
        });
      } else {
        setBuyerTaxIdValidation({
          ...localResult,
          valid: true,
          message: `Verified: ${localResult.message}`,
        });
      }
    } catch {
      // Network error — fall back to local regex result silently
      setBuyerTaxIdValidation(localResult);
    }
  };

  // Totals
  const totalNet = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.netAmount, 0),
    [lineItems],
  );
  const vatBreakdown = useMemo(
    () =>
      lineItems.reduce<
        Record<string, { rate: number; base: number; vat: number }>
      >((acc, item) => {
        const key = `${item.vatRate}`;
        if (!acc[key]) acc[key] = { rate: item.vatRate, base: 0, vat: 0 };
        acc[key].base += item.netAmount;
        acc[key].vat += item.netAmount * (item.vatRate / 100);
        return acc;
      }, {}),
    [lineItems],
  );
  const totalVat = useMemo(
    () => Object.values(vatBreakdown).reduce((sum, v) => sum + v.vat, 0),
    [vatBreakdown],
  );
  const totalGross = totalNet + totalVat;

  // Sync current invoice data to window.invoiceData for AI context
  useEffect(() => {
    const customerType = buyerTaxId ? "B2B" : "B2C";
    const vatRate = lineItems.length > 0 ? lineItems[0].vatRate : 0;
    window.invoiceData = {
      country: sellerCountry,
      amount: totalGross,
      vat_rate: vatRate,
      customer_type: customerType,
    };
  }, [sellerCountry, totalGross, lineItems, buyerTaxId]);

  // Build Invoice16931 for export (with OSS note embedded)
  const buildInvoice16931 = (): Invoice16931 => {
    const cleanLineItems: InvoiceLineItem[] = lineItems.map((item) => ({
      itemType: item.itemType,
      description: item.description || "Item",
      quantity: 1,
      unitPrice: item.netAmount,
      amount: item.netAmount,
      vatRate: item.vatRate,
    }));

    const taxDetails: { [vatRate: string]: number } = {};
    for (const [rate, v] of Object.entries(vatBreakdown)) {
      taxDetails[rate] = v.vat;
    }

    // Inject OSS note into invoice notes
    let invoiceNotes = notes;
    if (isOSS && buyerCountry && !invoiceNotes.includes("OSS")) {
      invoiceNotes = `OSS Scheme \u2014 VAT remitted to ${buyerCountry} tax authority under the EU One-Stop-Shop scheme.${invoiceNotes ? ` ${invoiceNotes}` : ""}`;
    }

    return {
      header: { invoiceNumber, invoiceDate, invoiceType: "Invoice" },
      seller: {
        name: sellerName || "Seller",
        address: sellerAddress || "",
        vatNumber: sellerVatNumber || "",
        email: sellerEmail || "",
        phone: sellerPhone || "",
      },
      buyer: {
        name: buyerName || "Buyer",
        address: buyerAddress || "",
        taxIdOrBusinessRegNumber: buyerTaxId || "",
        publicContractNumber: buyerContractNumber || "",
      },
      lineItems: cleanLineItems,
      taxDetails,
      subtotal: totalNet,
      grandTotal: totalGross,
      currency,
      paymentTerms: {
        paymentDueDate: dueDate,
        paymentMeans,
        bankingInfo: { iban: iban || "N/A" },
        earlyPaymentDiscount,
        latePenaltyTerms,
      },
      notes: invoiceNotes,
      isOSS,
      ossCountry: buyerCountry,
    } as Invoice16931 & { notes: string; isOSS: boolean; ossCountry: string };
  };

  const handleDownloadPDF = () => downloadInvoicePDF(buildInvoice16931());
  const handleDownloadXML = () =>
    downloadInvoiceXMLWithOSS(buildInvoice16931() as any, isOSS, buyerCountry);

  const handleInvoiceAskAI = async () => {
    if (!invoiceQuestion.trim()) return;
    setInvoiceAILoading(true);
    setInvoiceAIError(null);
    setInvoiceAnswer("");
    try {
      const response = await fetch(
        "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/ai-vat",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: invoiceQuestion, simple: true }),
        },
      );
      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        setInvoiceAIError(`AI service error (${response.status}): ${errText}`);
        return;
      }
      const data = await response.json();
      setInvoiceAnswer(data.answer ?? "No answer received");
    } catch (error) {
      console.error("AI Error:", error);
      setInvoiceAIError("Something went wrong. Please try again.");
    } finally {
      setInvoiceAILoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!isAuthenticated || !accessToken || !userId) {
      setGenerateError(
        "You must be signed in to generate invoices via the cloud. Use PDF/XML export instead.",
      );
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(false);

    try {
      // Step 0: Pre-check usage client-side for a friendly early error
      const { data: usageData, error: usageError } =
        await supabase.rpc("get_invoice_usage");

      if (!usageError && Array.isArray(usageData) && usageData.length > 0) {
        const { invoice_used, invoice_limit } = usageData[0];
        if (invoice_used >= invoice_limit) {
          setGenerateError("Invoice limit reached for your plan");
          setTimeout(() => setActiveTab("pricing"), 2000);
          return;
        }
      }

      // Step 1: Server-side authoritative limit check
      const { error: limitError } = await supabase.rpc("create_invoice_secure");

      if (limitError) {
        setGenerateError("Invoice limit reached for your plan");
        setTimeout(() => setActiveTab("pricing"), 2000);
        return;
      }

      // Step 2: Insert invoice record into the invoices table
      const invoiceId = crypto.randomUUID();
      const { error: invoiceError } = await supabase.from("invoices").insert({
        id: invoiceId,
        user_id: userId,
        customer_name: buyerName || "Customer",
        amount: totalGross,
        status: "pending",
      });

      if (invoiceError) {
        console.error(invoiceError);
        setGenerateError(
          invoiceError.message || "Failed to save invoice. Please try again.",
        );
        return;
      }

      // Step 3: For each line item — security check first, then direct insert
      for (const item of lineItems) {
        const { error: itemSecureError } = await supabase.rpc(
          "create_invoice_item_secure",
          { p_invoice_id: invoiceId },
        );

        if (itemSecureError) {
          console.error(itemSecureError);
          setGenerateError(
            itemSecureError.message ||
              "Failed to authorise invoice item. Please try again.",
          );
          return;
        }

        const { error: itemInsertError } = await supabase
          .from("invoice_items")
          .insert({
            invoice_id: invoiceId,
            description: item.description || "Item",
            item_type: item.itemType,
            quantity: 1,
            unit_price: item.netAmount,
            vat_category: item.vatCategory,
            vat_rate: item.vatRate,
            vat_amount: (item.netAmount * item.vatRate) / 100,
            net_amount: item.netAmount,
          });

        if (itemInsertError) {
          console.error(itemInsertError);
          setGenerateError(
            itemInsertError.message ||
              "Failed to save invoice items. Please try again.",
          );
          return;
        }
      }

      setGenerateSuccess(true);
      if (onInvoiceGenerated) {
        onInvoiceGenerated(invoiceNumber, totalGross, currency);
      }
    } catch {
      setGenerateError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("transaction")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transaction
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              EN 16931 Compliant Invoice
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate EU/UK compliant electronic invoices
              {prePopData && (
                <span className="ml-2 inline-flex items-center gap-1 text-primary font-medium">
                  <FileText className="w-3 h-3" />
                  Pre-populated from transaction
                </span>
              )}
              {isOSS && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                  OSS Scheme
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadXML}
              className="flex items-center gap-2"
            >
              <FileCode className="w-4 h-4" />
              XML
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Business Profile Pre-fill */}
          {savedBusinesses.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                Load Business:
              </span>
              <select
                onChange={(e) =>
                  e.target.value && handleLoadBusiness(e.target.value)
                }
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                defaultValue=""
                data-ocid="invoice.business_profile.select"
              >
                <option value="">Select a saved business profile…</option>
                {savedBusinesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name} {biz.vatNumber ? `(${biz.vatNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Invoice Header */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Invoice Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Invoice Number
                </p>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Invoice Date
                </p>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Due Date
                </p>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seller & Buyer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seller */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">
                Seller (Supplier)
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Company Name
                  </p>
                  <Input
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="Your Company Ltd"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Address
                  </p>
                  <Input
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    placeholder="123 Business St, City"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    VAT Number
                  </p>
                  <Input
                    value={sellerVatNumber}
                    onChange={(e) => setSellerVatNumber(e.target.value)}
                    placeholder="GB123456789"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Email
                  </p>
                  <Input
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder="billing@company.com"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Phone
                  </p>
                  <Input
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder="+44 123 456789"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Country
                  </p>
                  <select
                    value={sellerCountry}
                    onChange={(e) => {
                      const newCountry = e.target.value as CountryCode;
                      setSellerCountry(newCountry);
                      setLineItems((prev) =>
                        prev.map((item) => ({
                          ...item,
                          vatRate: getVatRateForCategory(
                            item.vatCategory,
                            newCountry,
                          ),
                        })),
                      );
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name} ({code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">
                Buyer (Customer)
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Company Name
                  </p>
                  <Input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Customer Company Ltd"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Address
                  </p>
                  <Input
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="456 Customer Ave, City"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Tax ID / VAT ID
                  </p>
                  <Input
                    value={buyerTaxId}
                    onChange={(e) => {
                      setBuyerTaxId(e.target.value);
                      if (buyerTaxIdValidation) setBuyerTaxIdValidation(null);
                    }}
                    onBlur={handleBuyerTaxIdBlur}
                    placeholder="FR987654321"
                    className={`${
                      buyerTaxIdValidation && !buyerTaxIdValidation.valid
                        ? "border-destructive"
                        : buyerTaxIdValidation?.valid && buyerTaxId
                          ? "border-green-500"
                          : ""
                    }`}
                    data-ocid="invoice.buyer_tax_id.input"
                  />

                  {/* Validation result */}
                  {buyerTaxIdValidation && buyerTaxId && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {buyerTaxIdValidation.valid ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid format
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          {buyerTaxIdValidation.message}
                        </span>
                      )}
                    </div>
                  )}

                  {buyerTaxIdValidation?.format && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: {buyerTaxIdValidation.format}
                    </p>
                  )}

                  {buyerTaxIdValidation &&
                    !buyerTaxIdValidation.valid &&
                    buyerTaxId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Verify on VIES:{" "}
                        <a
                          href="https://ec.europa.eu/taxation_customs/vies/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          ec.europa.eu/taxation_customs/vies/
                        </a>
                      </p>
                    )}
                </div>
                <div>
                  <p className="block text-xs font-medium text-muted-foreground mb-1">
                    Contract No. (optional)
                  </p>
                  <Input
                    value={buyerContractNumber}
                    onChange={(e) => setBuyerContractNumber(e.target.value)}
                    placeholder="CONTRACT-001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bulk CSV Import (Pro/Business only) */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCSVImport((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
              data-ocid="invoice.csv_import.toggle"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Import Line Items from CSV
                </span>
                {!canBulkImport && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                    Pro/Business
                  </span>
                )}
              </div>
              {showCSVImport ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showCSVImport && (
              <div className="px-6 pb-6 pt-2 border-t border-border space-y-3">
                {!canBulkImport ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      Pro or Business plan required
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Upgrade to import line items from CSV files.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab("pricing")}
                      data-ocid="invoice.csv_import.upgrade_button"
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                      <strong>Expected CSV format:</strong>
                      <br />
                      <code className="font-mono">
                        description,quantity,unitPrice,vatRate
                      </code>
                      <br />
                      <span className="text-muted-foreground">
                        Example: Web Design Services,1,1500,20
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="pointer-events-none"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Choose CSV File
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleCSVFile}
                        data-ocid="invoice.csv_import.upload_button"
                      />
                    </label>

                    {csvError && (
                      <p className="text-xs text-destructive">{csvError}</p>
                    )}

                    {csvPreview.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-foreground">
                          Preview ({csvPreview.length} items):
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-1.5 text-muted-foreground">
                                  Description
                                </th>
                                <th className="text-right py-1.5 text-muted-foreground">
                                  Net Amount
                                </th>
                                <th className="text-right py-1.5 text-muted-foreground">
                                  VAT Rate
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreview.map((item, i) => (
                                <tr
                                  key={item.id}
                                  className="border-b border-border/50"
                                  data-ocid={`invoice.csv_import.item.${i + 1}`}
                                >
                                  <td className="py-1.5 text-foreground">
                                    {item.description}
                                  </td>
                                  <td className="py-1.5 text-right text-muted-foreground">
                                    €{item.netAmount.toFixed(2)}
                                  </td>
                                  <td className="py-1.5 text-right text-muted-foreground">
                                    {item.vatRate}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleLoadCSVIntoInvoice}
                          data-ocid="invoice.csv_import.load_button"
                        >
                          Load into Invoice
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  Line Items
                </h2>
                <span className="text-xs text-muted-foreground">
                  {lineItems.length} / {MAX_LINE_ITEMS}
                </span>
                {atLineItemLimit && (
                  <span className="text-xs text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full">
                    Maximum reached
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addLineItem}
                disabled={atLineItemLimit}
                className="flex items-center gap-2"
                title={
                  atLineItemLimit
                    ? `Maximum of ${MAX_LINE_ITEMS} line items allowed per invoice`
                    : "Add a new line item"
                }
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">
                      Net Amount
                    </th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">
                      VAT Category
                    </th>
                    <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">
                      VAT Rate
                    </th>
                    <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">
                      VAT Amount
                    </th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 last:border-0"
                      data-ocid={`invoice.line_items.item.${idx + 1}`}
                    >
                      <td className="py-3 pr-3">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Item description"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          value={item.itemType}
                          onChange={(e) =>
                            updateLineItem(item.id, "itemType", e.target.value)
                          }
                          className="h-8 px-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {ITEM_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <Input
                          type="number"
                          value={item.netAmount}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "netAmount",
                              Number.parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-8 text-xs text-right w-28"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          value={item.vatCategory}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "vatCategory",
                              e.target.value,
                            )
                          }
                          className="h-8 px-2 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {VAT_CATEGORIES_LIST.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <span className="text-xs font-medium text-foreground">
                          {item.vatRate}%
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <span className="text-xs text-muted-foreground">
                          {((item.netAmount * item.vatRate) / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                          data-ocid={`invoice.line_items.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Currency & Payment */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Payment Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Currency
                </p>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Payment Method
                </p>
                <Input
                  value={paymentMeans}
                  onChange={(e) => setPaymentMeans(e.target.value)}
                  placeholder="Bank Transfer"
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  IBAN
                </p>
                <Input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Early Payment Discount
                </p>
                <Input
                  value={earlyPaymentDiscount}
                  onChange={(e) => setEarlyPaymentDiscount(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Late Penalty Terms
                </p>
                <Input
                  value={latePenaltyTerms}
                  onChange={(e) => setLatePenaltyTerms(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="block text-xs font-medium text-muted-foreground mb-1">
                  Notes
                </p>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or reverse charge statement"
                />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Invoice Totals
            </h2>
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Total</span>
                <span className="font-medium">
                  {currency} {totalNet.toFixed(2)}
                </span>
              </div>
              {Object.values(vatBreakdown).map((v) => (
                <div key={v.rate} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({v.rate}%)</span>
                  <span className="font-medium">
                    {currency} {v.vat.toFixed(2)}
                  </span>
                </div>
              ))}
              {isOSS && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">VAT Treatment</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    🌍 OSS VAT Applied
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                <span>Total (incl. VAT)</span>
                <span>
                  {currency} {totalGross.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* UK VAT Reference Panel */}
          {sellerCountry === "GB" && (
            <div className="bg-muted/40 border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                UK VAT Reference
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Standard Rate: 20%</span>
                <span>Reduced Rate: 5%</span>
                <span>Zero Rate: 0%</span>
                <span>Basic Food: 0%</span>
                <span>Medical: 0%</span>
                <span>Education: 0%</span>
                <span>Exports: 0%</span>
                <span>Financial Services: Exempt</span>
                <span>Insurance: Exempt</span>
              </div>
            </div>
          )}

          {/* OSS Notice */}
          {isOSS && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300/50 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                OSS Scheme Active
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                This invoice is subject to the EU One-Stop-Shop scheme. VAT will
                be remitted to {buyerCountry || "the buyer's"} tax authority.
                This note is included in both PDF and XML exports.
              </p>
            </div>
          )}

          {/* Inline Ask a VAT Question */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="text-base">💬</span>
                Ask a VAT Question
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Have a doubt before generating? Ask our AI assistant.
              </p>
            </div>

            <Textarea
              value={invoiceQuestion}
              onChange={(e) => setInvoiceQuestion(e.target.value)}
              placeholder="e.g. Do I need to apply reverse charge here?"
              rows={3}
              className="w-full resize-none text-sm"
              data-ocid="invoice.vat_question.textarea"
            />

            <Button
              onClick={handleInvoiceAskAI}
              disabled={invoiceAILoading || !invoiceQuestion.trim()}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              data-ocid="invoice.ask_vat.button"
            >
              {invoiceAILoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Asking...
                </>
              ) : (
                "Ask"
              )}
            </Button>

            {invoiceAILoading && (
              <p
                className="text-xs text-muted-foreground animate-pulse"
                data-ocid="invoice.ask_vat.loading_state"
              >
                Getting your answer...
              </p>
            )}

            {invoiceAIError && (
              <p
                className="text-xs text-destructive"
                data-ocid="invoice.ask_vat.error_state"
              >
                {invoiceAIError}
              </p>
            )}

            {invoiceAnswer && (
              <pre
                className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed border-t border-border pt-3"
                data-ocid="invoice.ask_vat.success_state"
              >
                {invoiceAnswer}
              </pre>
            )}
          </div>

          {/* Generate Invoice via Cloud */}
          {isAuthenticated && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Generate Invoice (Cloud)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save your invoice to the cloud via your Glotaxa account.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={isGenerating}
                  className="shrink-0"
                  data-ocid="invoice.primary_button"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    "Generate Invoice"
                  )}
                </Button>
              </div>

              {generateError && (
                <div
                  className="mt-4 flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3"
                  data-ocid="invoice.error_state"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{generateError}</span>
                </div>
              )}

              {generateSuccess && (
                <div
                  className="mt-4 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg px-4 py-3"
                  data-ocid="invoice.success_state"
                >
                  ✓ Invoice created successfully!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <AskVATWidget />
    </>
  );
}
