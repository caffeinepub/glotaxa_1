import { Download, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const SUPABASE_AI_URL =
  "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/ai-vat";

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  starter: 200,
  pro: 1000,
  business: 5000,
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface StoredTransaction {
  country: string;
  amount: number;
  vat_rate: number;
}

export default function AIVATAssistant() {
  const { isAuthenticated, accessToken, currentPlan } = useAuth();
  const userPlan = currentPlan || "free";
  const limit = PLAN_LIMITS[userPlan] ?? PLAN_LIMITS.free;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load history and usage from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("ai_vat_history");
    const savedUsage = localStorage.getItem("ai_vat_usage");
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch {
        // ignore
      }
    }
    if (savedUsage) setUsage(Number.parseInt(savedUsage, 10));
  }, []);

  // Save history and usage to localStorage
  useEffect(() => {
    localStorage.setItem("ai_vat_history", JSON.stringify(messages));
    localStorage.setItem("ai_vat_usage", String(usage));
  }, [messages, usage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLimitReached = usage >= limit;

  // Read recent transactions from localStorage (saved by Transaction page)
  const getTransactionContext = (): string => {
    try {
      const saved = localStorage.getItem("vat_transactions");
      if (!saved) return "";
      const transactions: StoredTransaction[] = JSON.parse(saved);
      if (!transactions || transactions.length === 0) return "";
      const latest = transactions.slice(-3);
      return latest
        .map(
          (t) =>
            `Country: ${t.country}, Amount: ${t.amount}, VAT: ${t.vat_rate}%`,
        )
        .join("\n");
    } catch {
      return "";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isLimitReached) return;

    const question = input.trim();
    const newMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setInput("");
    setUsage((u) => u + 1);
    setIsLoading(true);

    const context = getTransactionContext();

    try {
      const res = await fetch(SUPABASE_AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ question, ...(context ? { context } : {}) }),
      });

      const data = await res.json();
      const answer =
        data.answer ??
        data.error ??
        "Sorry, I couldn't get a response. Please try again.";
      setMessages([
        ...updated,
        { id: `ai-${Date.now()}`, role: "assistant", content: answer },
      ]);
    } catch {
      setMessages([
        ...updated,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: "AI unavailable. Try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChat = () => {
    const text = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "vat-chat.txt";
    link.click();
  };

  const clearHistory = () => {
    setMessages([]);
    setUsage(0);
    localStorage.removeItem("ai_vat_history");
    localStorage.removeItem("ai_vat_usage");
  };

  const suggestions = [
    "VAT on my last transaction?",
    "Do I need OSS registration?",
    "Explain reverse charge",
    "VAT for EU SaaS sales?",
  ];

  return (
    <div
      className="max-w-3xl mx-auto px-4 py-6 flex flex-col"
      style={{ height: "calc(100vh - 140px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.46 0.15 290 / 0.12)" }}
          >
            <Sparkles
              className="w-5 h-5"
              style={{ color: "oklch(0.46 0.15 290)" }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              AI VAT Assistant
            </h1>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(0.46 0.15 290 / 0.10)",
                color: "oklch(0.46 0.15 290)",
              }}
            >
              {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Usage: {usage} / {limit} queries
        </div>
      </div>

      {/* Limit warning */}
      {isLimitReached && (
        <div
          className="rounded-lg px-4 py-3 mb-3 text-sm font-medium"
          style={{
            background: "oklch(0.95 0.05 25)",
            color: "oklch(0.45 0.18 25)",
            border: "1px solid oklch(0.85 0.08 25)",
          }}
        >
          You've reached your limit. Upgrade to continue.{" "}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("navigate-to-pricing"))
            }
            className="underline font-semibold"
            style={{ color: "oklch(0.45 0.18 25)" }}
          >
            View Plans
          </button>
        </div>
      )}

      {/* Login nudge for guests */}
      {!isAuthenticated && (
        <div
          className="rounded-lg px-4 py-3 mb-3 text-sm"
          style={{
            background: "oklch(0.96 0.01 240)",
            color: "oklch(0.40 0.04 240)",
            border: "1px solid oklch(0.88 0.02 240)",
          }}
        >
          Sign in to save your chat history and unlock higher usage limits.
        </div>
      )}

      {/* Features info */}
      <div
        className="mb-3 text-sm rounded-xl border p-3"
        style={{
          background: "oklch(0.97 0.005 240)",
          borderColor: "oklch(0.90 0.01 240)",
          color: "oklch(0.35 0.02 240)",
        }}
      >
        <strong className="text-foreground">Features:</strong>
        <ul className="list-disc ml-5 mt-1 space-y-0.5">
          <li>AI VAT explanations</li>
          <li>Transaction-aware answers</li>
          <li>Cross-border VAT insights</li>
          <li>Export chat</li>
        </ul>
      </div>

      {/* Prompt suggestions */}
      <div className="flex flex-wrap gap-2 mb-3">
        {suggestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setInput(q)}
            disabled={isLimitReached}
            className="px-3 py-1.5 text-sm rounded-full border transition-all hover:shadow-sm disabled:opacity-40"
            style={{
              borderColor: "oklch(0.46 0.15 290 / 0.3)",
              color: "oklch(0.46 0.15 290)",
              background: "oklch(0.46 0.15 290 / 0.06)",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div
        className="flex-1 overflow-y-auto rounded-xl border p-4 space-y-4 bg-card"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Ask any VAT-related question to get started.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-sm text-white"
                  : "rounded-bl-sm text-foreground border"
              }`}
              style={
                msg.role === "user"
                  ? { background: "oklch(0.46 0.15 290)" }
                  : {
                      background: "oklch(0.97 0.005 240)",
                      borderColor: "oklch(0.90 0.01 240)",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-sm border text-sm text-muted-foreground"
              style={{
                background: "oklch(0.97 0.005 240)",
                borderColor: "oklch(0.90 0.01 240)",
              }}
            >
              <span className="inline-flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isLimitReached}
          className="flex-1 border rounded-xl px-4 py-3 text-sm bg-card focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
          style={{ borderColor: "oklch(0.85 0.02 240)" }}
          placeholder="Ask VAT question… (Enter to send)"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={isLoading || !input.trim() || isLimitReached}
          className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
          style={{ background: "oklch(0.46 0.15 290)" }}
        >
          Send
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-3">
        <button
          type="button"
          onClick={exportChat}
          disabled={messages.length === 0}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ color: "oklch(0.46 0.15 290)" }}
        >
          <Download className="w-3.5 h-3.5" />
          Export Chat
        </button>
        <button
          type="button"
          onClick={clearHistory}
          disabled={messages.length === 0}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ color: "oklch(0.45 0.18 25)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear History
        </button>
      </div>
    </div>
  );
}
