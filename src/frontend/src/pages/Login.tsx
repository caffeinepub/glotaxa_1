import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calculator, Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { supabase } from "../contexts/AuthContext";

interface LoginProps {
  onMagicLinkSent: () => void;
  onSkip: () => void;
}

export default function Login({ onMagicLinkSent, onSkip }: LoginProps) {
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
          emailRedirectTo: "https://finvra-zet.caffeine.xyz/",
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
                <Mail className="w-6 h-6 text-primary" />
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
                  className="w-full"
                  disabled={isLoading}
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
