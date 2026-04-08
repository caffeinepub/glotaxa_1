import { Download, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import UpgradeModal from "../components/UpgradeModal";
import UsageMeter from "../components/UsageMeter";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchServerUsage,
  incrementServerUsage,
} from "../utils/aiUsageTracker";

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
  role: "user" | "assistant" | "thinking";
  content: string;
  isTyping?: boolean;
}

interface StoredTransaction {
  country: string;
  amount: number;
  vat_rate: number;
}

// Typing animation speed in ms per character
const TYPING_SPEED = 15;

export default function AIVATAssistant() {
  const { isAuthenticated, accessToken, currentPlan, userId } = useAuth();
  const userPlan = currentPlan || "free";
  const limit = PLAN_LIMITS[userPlan] ?? PLAN_LIMITS.free;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load chat history and local usage count from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("ai_vat_history");
    const savedUsage = localStorage.getItem("ai_vat_usage");
    if (savedHistory) {
      try {
        // Filter out any stale thinking/typing messages from previous sessions
        const parsed: Message[] = JSON.parse(savedHistory);
        setMessages(parsed.filter((m) => m.role !== "thinking" && !m.isTyping));
      } catch {
        // ignore
      }
    }
    const localCount = savedUsage ? Number.parseInt(savedUsage, 10) : 0;

    if (userId) {
      fetchServerUsage(userId).then((serverCount) => {
        const trueUsage = Math.max(localCount, serverCount);
        setUsage(trueUsage);
        localStorage.setItem("ai_vat_usage", String(trueUsage));
      });
    } else {
      setUsage(localCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Save history and usage to localStorage whenever they change
  // Only persist non-thinking/non-typing messages
  useEffect(() => {
    const persistable = messages.filter(
      (m) => m.role !== "thinking" && !m.isTyping,
    );
    localStorage.setItem("ai_vat_history", JSON.stringify(persistable));
    localStorage.setItem("ai_vat_usage", String(usage));
  }, [messages, usage]);

  // Show upgrade modal when limit is reached
  useEffect(() => {
    if (usage >= limit && usage > 0) {
      setShowUpgradeModal(true);
    }
  }, [usage, limit]);

  // Auto-scroll to bottom on every message change or during typing
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLimitReached = usage >= limit;

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

  // Animate a full text string into the message at `msgId`
  const typeMessage = useCallback(
    (msgId: string, fullText: string, baseMessages: Message[]) => {
      let i = 0;

      // Add the message with empty content and isTyping flag
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
          typingRef.current = setTimeout(tick, TYPING_SPEED);
        }
      };

      typingRef.current = setTimeout(tick, TYPING_SPEED);
    },
    [],
  );

  // Clean up typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, []);

  const sendQuestion = async (question: string) => {
    if (!question.trim() || isLoading || isLimitReached) return;

    const newMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question.trim(),
    };

    // Add user message + thinking loader
    const thinkingId = `thinking-${Date.now()}`;
    const withThinking: Message[] = [
      ...messages,
      newMsg,
      { id: thinkingId, role: "thinking", content: "" },
    ];
    setMessages(withThinking);
    setInput("");

    const newUsageCount = usage + 1;
    setUsage(newUsageCount);

    if (userId) {
      incrementServerUsage(userId, usage);
    }

    setIsLoading(true);

    const context = getTransactionContext();
    // Base messages = without the thinking loader (used for typing animation)
    const baseMessages: Message[] = [...messages, newMsg];

    try {
      const res = await fetch(SUPABASE_AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          question: question.trim(),
          ...(context ? { context } : {}),
        }),
      });

      const data = await res.json();

      // Remove thinking loader
      setMessages(baseMessages);

      // Check for backend LIMIT_REACHED error
      if (data.error === "LIMIT_REACHED" || res.status === 403) {
        const upgradeMsg =
          "🚀 You've reached your free limit.\nUpgrade to continue using AI VAT Assistant.";
        typeMessage(`ai-upgrade-${Date.now()}`, upgradeMsg, baseMessages);
        setShowUpgradeModal(true);
        setIsLoading(false);
        return;
      }

      const answer =
        data.answer ??
        data.error ??
        "Sorry, I couldn't get a response. Please try again.";

      typeMessage(`ai-${Date.now()}`, answer, baseMessages);
    } catch {
      setMessages(baseMessages);
      typeMessage(
        `ai-err-${Date.now()}`,
        "AI unavailable. Try again.",
        baseMessages,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = () => sendQuestion(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChat = () => {
    const text = messages
      .filter((m) => m.role !== "thinking")
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
    localStorage.removeItem("ai_vat_history");
  };

  const suggestions = [
    "VAT on my last transaction?",
    "Do I need OSS registration?",
    "Explain reverse charge",
    "VAT for EU SaaS sales?",
  ];

  const visibleMessages = messages.filter((m) => m.role !== "thinking");

  return (
    <>
      <div
        className="max-w-3xl mx-auto px-4 py-6 flex flex-col"
        style={{ minHeight: "calc(100vh - 140px)" }}
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
        </div>

        {/* Usage meter */}
        <UsageMeter usage={usage} limit={limit} plan={userPlan} />

        {/* Plan benefits inline */}
        <div className="text-sm text-muted-foreground mb-2">
          Free: 5 queries · Starter: 200 · Pro: 1,000 · Business: 5,000
        </div>

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

        {/* Prompt suggestions — clicking auto-sends the question */}
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              data-ocid="ai_vat.suggestion.button"
              onClick={() => sendQuestion(q)}
              disabled={isLoading || isLimitReached}
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
          className="flex-1 overflow-y-auto rounded-xl border p-4 space-y-3 bg-card"
          style={{ minHeight: "200px", maxHeight: "420px" }}
        >
          {visibleMessages.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Ask any VAT-related question to get started, or click a suggestion
              above.
            </p>
          )}

          {visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-sm text-foreground"
                    : "rounded-2xl rounded-bl-sm text-foreground"
                }`}
                style={{
                  margin: "5px 0",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: msg.role === "user" ? "#DCF8C6" : "#F1F0F0",
                  color: "#1a1a1a",
                }}
              >
                {msg.content}
                {msg.isTyping && (
                  <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}

          {/* "AI is thinking..." loader */}
          {isLoading && (
            <div className="flex justify-start">
              <div
                className="text-sm italic"
                style={{
                  margin: "5px 0",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "#F1F0F0",
                  color: "#555",
                }}
              >
                🤖 AI is thinking…
                <span className="inline-flex gap-1 ml-2">
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

        {/* Input row */}
        <div className="flex gap-2 mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isLimitReached}
            data-ocid="ai_vat.input"
            className="flex-1 border rounded-xl px-4 py-3 text-sm bg-card focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
            style={{ borderColor: "oklch(0.85 0.02 240)" }}
            placeholder="Ask VAT question… (Enter to send)"
          />
          <button
            type="button"
            data-ocid="ai_vat.submit_button"
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || isLimitReached}
            className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: "oklch(0.46 0.15 290)" }}
          >
            Send
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-3 pb-4">
          <button
            type="button"
            onClick={exportChat}
            disabled={visibleMessages.length === 0}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-40"
            style={{ color: "oklch(0.46 0.15 290)" }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Chat
          </button>
          <button
            type="button"
            onClick={clearHistory}
            disabled={visibleMessages.length === 0}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-40"
            style={{ color: "oklch(0.45 0.18 25)" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}
