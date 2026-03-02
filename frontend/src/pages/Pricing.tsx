import { useState } from 'react';
import { Check, Minus, Star, Zap, Trophy, Gift, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = 'https://cvelhiuefcykduwgnjjs.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM';

interface PricingPlan {
  id: string;
  icon: React.ReactNode;
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limits?: string[];
  highlightTag?: string;
  buttonLabel: string;
  isPopular?: boolean;
  isBestValue?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    icon: <Gift className="w-5 h-5" />,
    title: 'FREE',
    price: '€0',
    period: '/ month',
    description: 'Perfect to get started with VAT-compliant invoicing.',
    features: [
      '5 invoices per month',
      '3 line items per invoice',
      'UK VAT support (0%, Exempt, 20%)',
      'EU Intra-EU B2B (Reverse Charge)',
      'UBL-XML export (Peppol ready)',
      'PDF invoice download',
      'Email OTP login (secure)',
      'Single business profile',
    ],
    limits: [
      'Max invoice value €1,000',
      'No bulk invoices',
      'No VAT auto-detection',
    ],
    buttonLabel: 'Free Plan',
  },
  {
    id: 'starter',
    icon: <Zap className="w-5 h-5" />,
    title: 'STARTER',
    price: '€2.99',
    period: '/ month',
    description: 'For freelancers and solo founders.',
    features: [
      '30 invoices per month',
      '10 line items per invoice',
      'Auto VAT rate suggestion (UK + EU)',
      'Unlimited invoice value',
      'UBL-XML + PDF export',
      'Customer VAT ID validation',
      'Remove Glotaxa branding',
    ],
    highlightTag: 'Most Popular for Freelancers',
    buttonLabel: 'Upgrade to Starter',
    isPopular: true,
  },
  {
    id: 'pro',
    icon: <Star className="w-5 h-5" />,
    title: 'PRO',
    price: '€4.99',
    period: '/ month',
    description: 'Built for growing businesses handling VAT seriously.',
    features: [
      'Unlimited invoices',
      'Unlimited line items',
      'UK + EU VAT auto-classification',
      'OSS VAT ready invoices',
      'Multi-currency invoices',
      'Invoice duplication',
      'Export monthly VAT summary',
      'Priority email support',
    ],
    highlightTag: 'Best Value',
    buttonLabel: 'Upgrade to Pro',
    isBestValue: true,
  },
  {
    id: 'business',
    icon: <Trophy className="w-5 h-5" />,
    title: 'BUSINESS',
    price: '€9.99',
    period: '/ month',
    description: 'For accountants, agencies, and high-volume sellers.',
    features: [
      'Everything in Pro',
      'Multiple businesses (up to 5)',
      'Team access (3 users)',
      'Bulk invoice upload (CSV)',
      'Quarterly OSS VAT report export',
      'VAT Compliance Score',
      'API access (beta)',
      'Priority support',
    ],
    buttonLabel: 'Upgrade to Business',
  },
];

function PlanCard({
  plan,
  currentPlan,
  onUpgrade,
  isUpgrading,
  upgradeSuccess,
}: {
  plan: PricingPlan;
  currentPlan: string | null;
  onUpgrade: (planId: string) => void;
  isUpgrading: boolean;
  upgradeSuccess: boolean;
}) {
  const isHighlighted = plan.isPopular || plan.isBestValue;
  const isCurrentPlan = (currentPlan ?? 'free').toLowerCase() === plan.id;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-shadow ${
        isHighlighted
          ? 'border-primary shadow-lg shadow-primary/10 bg-card'
          : 'border-border bg-card hover:shadow-md'
      }`}
    >
      <div className="p-6 pb-4">
        {/* Inline Highlight Badge */}
        {plan.highlightTag && (
          <div className="mb-3">
            <Badge
              className={`px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                plan.isPopular
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-accent-foreground'
              }`}
            >
              {plan.highlightTag}
            </Badge>
          </div>
        )}

        {/* Icon + Title */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`p-2 rounded-lg ${
              plan.isPopular
                ? 'bg-primary/10 text-primary'
                : plan.isBestValue
                ? 'bg-accent/20 text-accent-foreground'
                : plan.id === 'business'
                ? 'bg-muted text-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {plan.icon}
          </span>
          <h3 className="text-lg font-bold tracking-wide text-foreground">{plan.title}</h3>
          {isCurrentPlan && (
            <Badge variant="outline" className="ml-auto text-xs">
              Current
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
          <span className="text-sm text-muted-foreground">{plan.period}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>

        {/* CTA Button */}
        {isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled>
            <CheckCircle className="w-4 h-4 mr-2" />
            Current Plan
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={isHighlighted ? 'default' : 'outline'}
            disabled={isUpgrading}
            onClick={() => onUpgrade(plan.id)}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Upgrading…
              </>
            ) : upgradeSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Upgraded!
              </>
            ) : (
              plan.buttonLabel
            )}
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-border" />

      {/* Features */}
      <div className="p-6 pt-4 flex-1">
        <ul className="space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {plan.limits && plan.limits.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/60">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Limits
            </p>
            <ul className="space-y-1.5">
              {plan.limits.map((limit) => (
                <li key={limit} className="flex items-start gap-2">
                  <Minus className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground">{limit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { userId, accessToken, currentPlan, setCurrentPlan, isAuthenticated } = useAuth();
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [successPlanId, setSuccessPlanId] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated || !userId || !accessToken) {
      setUpgradeError('You must be signed in to upgrade your plan.');
      return;
    }

    setUpgradingPlanId(planId);
    setUpgradeError(null);
    setSuccessPlanId(null);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan: planId }),
        }
      );

      if (response.ok) {
        setCurrentPlan(planId);
        setSuccessPlanId(planId);
        // Clear success indicator after 3s
        setTimeout(() => setSuccessPlanId(null), 3000);
      } else {
        const data = await response.json().catch(() => ({}));
        setUpgradeError(data?.message || data?.error || 'Failed to upgrade plan. Please try again.');
      }
    } catch {
      setUpgradeError('Network error. Please check your connection and try again.');
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
          Start free and scale as your business grows. All plans include VAT-compliant invoicing
          for UK and EU transactions.
        </p>
        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground mt-3 bg-muted/50 inline-block px-4 py-2 rounded-full">
            Sign in to upgrade your plan
          </p>
        )}
      </div>

      {/* Error */}
      {upgradeError && (
        <div className="max-w-xl mx-auto mb-6 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 text-center">
          {upgradeError}
        </div>
      )}

      {/* Success */}
      {successPlanId && (
        <div className="max-w-xl mx-auto mb-6 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg px-4 py-3 text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Plan upgraded to <strong className="capitalize">{successPlanId}</strong> successfully!
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            onUpgrade={handleUpgrade}
            isUpgrading={upgradingPlanId === plan.id}
            upgradeSuccess={successPlanId === plan.id}
          />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground mt-10">
        All prices exclude VAT. Upgrade or downgrade at any time. No contracts.
      </p>
    </div>
  );
}
