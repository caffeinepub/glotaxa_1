import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calculator, Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { supabase } from "../contexts/AuthContext";

interface LoginProps {
  onMagicLinkSent: () => void;
  onSkip: () => void;
  embedded?: boolean;
}

export default function Login({
  onMagicLinkSent,
  onSkip,
  embedded = false,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: "https://added-aquamarine-f5s-draft.caffeine.xyz/",
        },
      });

      if (authError) {
        setError(
          authError.message || "Failed to send login link. Please try again.",
        );
      } else {
        setSent(true);
        onMagicLinkSent();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-ocid="login.page"
      className={`${embedded ? "py-12" : "min-h-screen"} flex flex-col items-center justify-center px-4 relative overflow-hidden`}
      style={{
        background:
          "linear-gradient(135deg, oklch(0.975 0.008 240) 0%, oklch(0.96 0.015 220) 40%, oklch(0.97 0.012 200) 100%)",
      }}
    >
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 w-full h-full overflow-hidden"
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: "40vw",
            height: "40vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.85 0.06 255 / 0.18) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-8%",
            left: "-8%",
            width: "35vw",
            height: "35vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.82 0.08 195 / 0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Step Indicator — Page 1 of 5 */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="step-dot active" />
            <div className="step-dot" />
            <div className="step-dot" />
            <div className="step-dot" />
            <div className="step-dot" />
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "oklch(0.38 0.13 255)",
              textTransform: "uppercase",
            }}
          >
            Step 1 of 5 — Sign In
          </span>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-xl mb-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.14 255), oklch(0.48 0.16 195))",
              boxShadow:
                "0 8px 24px oklch(0.42 0.14 255 / 0.3), 0 2px 8px oklch(0.42 0.14 255 / 0.15)",
            }}
          >
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.38 0.13 255), oklch(0.48 0.16 195))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Glotaxa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            VAT-compliant invoicing for UK &amp; EU
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-card border border-border rounded-2xl p-8"
          style={{
            boxShadow:
              "0 4px 6px -1px oklch(0.38 0.13 255 / 0.06), 0 16px 48px -8px oklch(0.38 0.13 255 / 0.12), 0 2px 4px oklch(0 0 0 / 0.04)",
          }}
        >
          {sent ? (
            <div className="text-center space-y-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full mx-auto"
                style={{ background: "oklch(0.38 0.13 255 / 0.1)" }}
              >
                <Mail
                  className="w-6 h-6"
                  style={{ color: "oklch(0.38 0.13 255)" }}
                />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Check your email
              </h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic login link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Click the link to sign in — no code needed.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Sign in to your account
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we'll send you a magic login link.
                </p>
              </div>

              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      data-ocid="login.input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    data-ocid="login.error_state"
                    className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  data-ocid="login.primary_button"
                  className="w-full font-semibold"
                  disabled={isLoading}
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.42 0.14 255), oklch(0.45 0.15 245))",
                    boxShadow: "0 4px 14px oklch(0.42 0.14 255 / 0.35)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending link…
                    </>
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Just want to explore? No account needed.
            </p>
            <Button
              variant="ghost"
              size="sm"
              data-ocid="login.secondary_button"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Continue without signing in
            </Button>
          </div>
        </div>

        {/* Feature hints below card */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "oklch(0.44 0.14 160)",
                display: "inline-block",
              }}
            />
            EU &amp; UK VAT
          </span>
          <span className="flex items-center gap-1.5">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "oklch(0.48 0.16 195)",
                display: "inline-block",
              }}
            />
            EN 16931 Invoices
          </span>
          <span className="flex items-center gap-1.5">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "oklch(0.46 0.15 290)",
                display: "inline-block",
              }}
            />
            No signup required
          </span>
        </div>
      </div>
    </div>
  );
}
