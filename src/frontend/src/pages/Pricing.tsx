import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Paddle configuration
// ---------------------------------------------------------------------------
const PADDLE_CLIENT_TOKEN = "live_d09b7a642a152b846a4bb178859";

const PADDLE_PRICE_IDS: Record<string, string> = {
  starter: "pri_01kk0ym38zmzr21hjp11tpm3r8",
  pro: "pri_01kk0yptcrkfgc75dwan4qdh79",
  business: "pri_01kk0ys2ez4vb8qf1cq8dytf7e",
};

const SUPABASE_URL = "https://cvelhiuefcykduwgnjjs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM";

interface Plan {
  name: string;
  price: string;
  tag?: string;
  description: string;
  core: string[];
  limits?: string[];
  ai: string[];
  highlight?: boolean;
  button: string;
  disabled?: boolean;
  paddleKey?: string;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "€0",
    description: "Perfect to get started with VAT-compliant invoicing.",
    core: [
      "5 invoices per month",
      "3 line items per invoice",
      "UK VAT support (0%, Exempt, 20%)",
      "EU Intra-EU B2B (Reverse Charge)",
      "UBL-XML export (Peppol ready)",
      "PDF invoice download",
      "Single business profile",
    ],
    limits: [
      "Max invoice value €1,000",
      "No bulk invoices",
      "No VAT auto-detection",
    ],
    ai: ["5 AI queries/session"],
    button: "Free Plan",
    disabled: true,
  },
  {
    name: "Starter",
    price: "€2.99",
    tag: "Most Popular for Freelancers",
    description: "For freelancers and solo founders.",
    core: [
      "30 invoices per month",
      "10 line items per invoice",
      "Auto VAT rate suggestion (UK + EU)",
      "Unlimited invoice value",
      "UBL-XML + PDF export",
      "Customer VAT ID validation",
      "Remove Glotaxa branding",
    ],
    ai: ["200 AI queries/session", "Transaction-aware AI answers"],
    highlight: true,
    button: "Upgrade to Starter",
    paddleKey: "starter",
  },
  {
    name: "Pro",
    price: "€4.99",
    tag: "Best Value",
    description: "Built for growing businesses handling VAT seriously.",
    core: [
      "Unlimited invoices",
      "Unlimited line items",
      "UK + EU VAT auto-classification",
      "OSS VAT ready invoices",
      "Multi-currency invoices",
      "Export monthly VAT summary",
      "Priority email support",
    ],
    ai: [
      "1,000 AI queries/session",
      "Transaction-aware AI answers",
      "Export chat history",
    ],
    button: "Upgrade to Pro",
    paddleKey: "pro",
  },
  {
    name: "Business",
    price: "€9.99",
    description: "For accountants, agencies, and high-volume sellers.",
    core: [
      "Everything in Pro",
      "Multiple businesses (up to 5)",
      "Team access (3 users)",
      "Bulk invoice upload (CSV)",
      "Quarterly OSS VAT report export",
      "VAT Compliance Score",
      "API access (beta)",
    ],
    ai: [
      "5,000 AI queries/session",
      "Transaction-aware AI answers",
      "Export chat history",
      "Priority AI support",
    ],
    button: "Upgrade to Business",
    paddleKey: "business",
  },
];

export default function Pricing() {
  const { userId, accessToken, setCurrentPlan, isAuthenticated } = useAuth();
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [successPlanId, setSuccessPlanId] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // ---------------------------------------------------------------------------
  // Load and initialise Paddle on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const initPaddle = () => {
      if (window.Paddle) {
        window.Paddle.Setup({ token: PADDLE_CLIENT_TOKEN });
      }
    };

    if (window.Paddle) {
      initPaddle();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.onload = () => initPaddle();
      document.body.appendChild(script);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch user email from Supabase when authenticated
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !userId || !accessToken) return;

    fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.email) setUserEmail(data.email);
      })
      .catch(() => {});
  }, [isAuthenticated, userId, accessToken]);

  // ---------------------------------------------------------------------------
  // Checkout functions — one per paid plan
  // ---------------------------------------------------------------------------
  const upgradeToStarter = async () => {
    if (!window.Paddle) {
      setUpgradeError(
        "Payment system failed to load. Please refresh and try again.",
      );
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId: PADDLE_PRICE_IDS.starter, quantity: 1 }],
      ...(userEmail ? { customer: { email: userEmail } } : {}),
    });
  };

  const upgradeToPro = async () => {
    if (!window.Paddle) {
      setUpgradeError(
        "Payment system failed to load. Please refresh and try again.",
      );
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId: PADDLE_PRICE_IDS.pro, quantity: 1 }],
      ...(userEmail ? { customer: { email: userEmail } } : {}),
    });
  };

  const upgradeToBusiness = async () => {
    if (!window.Paddle) {
      setUpgradeError(
        "Payment system failed to load. Please refresh and try again.",
      );
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId: PADDLE_PRICE_IDS.business, quantity: 1 }],
      ...(userEmail ? { customer: { email: userEmail } } : {}),
    });
  };

  // ---------------------------------------------------------------------------
  // Upgrade handler — routes to the right checkout function per plan
  // ---------------------------------------------------------------------------
  const handleUpgrade = async (planId: string) => {
    setUpgradeError(null);
    setSuccessPlanId(null);

    if (planId === "starter") {
      upgradeToStarter();
      return;
    }
    if (planId === "pro") {
      upgradeToPro();
      return;
    }
    if (planId === "business") {
      upgradeToBusiness();
      return;
    }

    // Free plan: update Supabase directly
    if (!isAuthenticated || !userId || !accessToken) {
      setUpgradeError("You must be signed in to change your plan.");
      return;
    }

    setUpgradingPlanId(planId);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: planId }),
        },
      );

      if (response.ok) {
        setCurrentPlan(planId);
        setSuccessPlanId(planId);
        setTimeout(() => setSuccessPlanId(null), 3000);
      } else {
        const data = await response.json().catch(() => ({}));
        setUpgradeError(
          data?.message ||
            data?.error ||
            "Failed to update plan. Please try again.",
        );
      }
    } catch {
      setUpgradeError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setUpgradingPlanId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-foreground mb-3">
          Simple, Transparent Pricing
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-base">
          Start free and scale as your business grows. All plans include
          VAT-compliant invoicing for UK and EU transactions.
        </p>
        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground mt-3 bg-muted/50 inline-block px-4 py-2 rounded-full">
            Sign in to upgrade your plan
          </p>
        )}
      </div>

      {/* Error */}
      {upgradeError && (
        <div
          className="max-w-xl mx-auto mb-6 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 text-center"
          data-ocid="pricing.error_state"
        >
          {upgradeError}
        </div>
      )}

      {/* Success */}
      {successPlanId && (
        <div
          className="max-w-xl mx-auto mb-6 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg px-4 py-3 text-center flex items-center justify-center gap-2"
          data-ocid="pricing.success_state"
        >
          <CheckCircle className="w-4 h-4" />
          Plan upgraded to{" "}
          <strong className="capitalize">{successPlanId}</strong> successfully!
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`p-6 rounded-2xl shadow bg-white ${
              plan.highlight
                ? "border-2 border-blue-600 scale-105"
                : "border border-gray-200"
            }`}
            data-ocid={`pricing.${plan.name.toLowerCase()}.card`}
          >
            {/* TAG */}
            {plan.tag && (
              <div className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mb-2 inline-block">
                {plan.tag}
              </div>
            )}

            {/* TITLE */}
            <h2 className="text-xl font-bold">{plan.name}</h2>

            {/* PRICE */}
            <p className="text-2xl font-semibold mt-2">{plan.price} / month</p>

            {/* DESCRIPTION */}
            <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

            {/* CORE FEATURES */}
            <p className="font-semibold text-gray-700 mb-1">Core Features</p>
            <ul className="text-sm mb-3 space-y-1">
              {plan.core.map((f) => (
                <li key={f}>✔ {f}</li>
              ))}
            </ul>

            {/* LIMITS (ONLY FREE) */}
            {plan.limits && (
              <>
                <p className="text-xs text-gray-500 mt-2 mb-1">Limits</p>
                <ul className="text-xs text-gray-500 mb-3 space-y-1">
                  {plan.limits.map((l) => (
                    <li key={l}>• {l}</li>
                  ))}
                </ul>
              </>
            )}

            {/* AI FEATURES */}
            <p className="font-semibold text-blue-600 mb-1">AI VAT Assistant</p>
            <ul className="text-sm mb-4 space-y-1">
              {plan.ai.map((f) => (
                <li key={f}>✔ {f}</li>
              ))}
            </ul>

            {/* BUTTON */}
            <Button
              disabled={plan.disabled || upgradingPlanId === plan.paddleKey}
              onClick={() => plan.paddleKey && handleUpgrade(plan.paddleKey)}
              className={`w-full py-2 rounded font-medium transition-colors ${
                plan.highlight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              } ${plan.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              data-ocid={`pricing.${plan.name.toLowerCase()}.primary_button`}
            >
              {upgradingPlanId === plan.paddleKey ? "Upgrading…" : plan.button}
            </Button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-border text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} GD Enterprises
        </p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <a href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </a>
          <span>|</span>
          <a
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </a>
          <span>|</span>
          <a href="/refund" className="hover:text-foreground transition-colors">
            Refund Policy
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Support:{" "}
          <a
            href="mailto:gdenterprises005@gmail.com"
            className="hover:text-foreground transition-colors"
            data-ocid="pricing.support.link"
          >
            gdenterprises005@gmail.com
          </a>
        </p>
      </footer>
    </div>
  );
}
