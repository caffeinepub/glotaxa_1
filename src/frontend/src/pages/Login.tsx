import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calculator, Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../contexts/AuthContext";

interface LoginProps {
  onOtpSent: (email: string) => void;
  onSkip: () => void;
}

export default function Login({ onOtpSent, onSkip }: LoginProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          create_user: true,
          // type=email forces Supabase to send a numeric OTP code,
          // not a magic link
          type: "email",
        }),
      });

      if (response.ok) {
        onOtpSent(email.trim());
      } else {
        const body = await response.json().catch(() => ({}));
        setError(
          (body as { msg?: string; message?: string }).msg ||
            (body as { msg?: string; message?: string }).message ||
            "Failed to send OTP. Please try again.",
        );
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 mb-4">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Glotaxa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            VAT-compliant invoicing for UK & EU
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Sign in to your account
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we'll send you a one-time code.
            </p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
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
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending OTP…
                </>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Just want to explore? No account needed.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Continue without signing in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
