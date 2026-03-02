import { useEffect, useState } from 'react';
import {
  Calculator,
  FileText,
  Globe,
  CreditCard,
  LogOut,
  Loader2,
  Crown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = 'https://cvelhiuefcykduwgnjjs.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-primary/10 text-primary',
  pro: 'bg-accent/20 text-accent-foreground',
  business: 'bg-chart-2/20 text-chart-2',
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

export default function Dashboard({ onNavigate, onLogout }: DashboardProps) {
  const { userId, accessToken, currentPlan, setCurrentPlan, logout } = useAuth();
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !accessToken) return;
    if (currentPlan) return; // already fetched

    const fetchPlan = async () => {
      setIsLoadingPlan(true);
      setPlanError(null);
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=plan`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setCurrentPlan(data[0].plan ?? 'free');
          } else {
            setCurrentPlan('free');
          }
        } else {
          setPlanError('Could not load your plan. Please refresh.');
        }
      } catch {
        setPlanError('Network error loading plan.');
      } finally {
        setIsLoadingPlan(false);
      }
    };

    fetchPlan();
  }, [userId, accessToken, currentPlan, setCurrentPlan]);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const planKey = (currentPlan ?? 'free').toLowerCase();
  const planLabel = PLAN_LABELS[planKey] ?? planKey;
  const planColorClass = PLAN_COLORS[planKey] ?? PLAN_COLORS.free;

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
        <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground">
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>

      {/* Plan card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current Plan</p>
              {isLoadingPlan ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading…</span>
                </div>
              ) : planError ? (
                <p className="text-sm text-destructive mt-1">{planError}</p>
              ) : (
                <Badge className={`mt-1 text-sm font-semibold px-3 py-0.5 ${planColorClass}`}>
                  {planLabel}
                </Badge>
              )}
            </div>
          </div>
          {planKey === 'free' && !isLoadingPlan && (
            <Button size="sm" onClick={() => onNavigate('pricing')}>
              Upgrade Plan
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => onNavigate('country')}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <Globe className="w-8 h-8 text-chart-1 mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Select Region</h3>
          <p className="text-xs text-muted-foreground mt-1">Choose a country and calculate VAT</p>
        </button>

        <button
          onClick={() => onNavigate('invoice')}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <FileText className="w-8 h-8 text-chart-2 mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Create Invoice</h3>
          <p className="text-xs text-muted-foreground mt-1">Generate a compliant EN 16931 invoice</p>
        </button>

        <button
          onClick={() => onNavigate('pricing')}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
        >
          <CreditCard className="w-8 h-8 text-chart-3 mb-3" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Manage Plan</h3>
          <p className="text-xs text-muted-foreground mt-1">View and upgrade your subscription</p>
        </button>
      </div>

      {/* Info */}
      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">About Glotaxa</p>
            <p className="text-xs text-muted-foreground mt-1">
              Glotaxa helps you calculate VAT correctly for 11 countries and generate EN 16931 compliant invoices.
              Your session is stored locally and never shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
