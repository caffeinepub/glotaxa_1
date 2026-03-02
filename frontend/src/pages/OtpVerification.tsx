import { useState } from 'react';
import { Calculator, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = 'https://cvelhiuefcykduwgnjjs.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM';

interface OtpVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OtpVerification({ email, onVerified, onBack }: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentPlan } = useAuth();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=otp`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token: otp, type: 'email' }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.access_token) {
        // Save session — only token and user id, NOT plan
        localStorage.setItem('supabase_access_token', data.access_token);
        localStorage.setItem('supabase_user_id', data.user?.id ?? '');
        // Reset plan so dashboard fetches fresh
        setCurrentPlan(null as unknown as string);
        onVerified();
      } else {
        setError(data?.msg || data?.message || data?.error_description || 'Invalid or expired code. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Glotaxa</h1>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-2">
              <Label>One-time code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || otp.length < 6}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            Didn't receive the code? Check your spam folder or go back to resend.
          </p>
        </div>
      </div>
    </div>
  );
}
