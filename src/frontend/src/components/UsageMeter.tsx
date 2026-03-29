import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const SUPABASE_GET_USAGE_URL =
  "https://cvelhiuefcykduwgnjjs.supabase.co/functions/v1/get-usage";

interface UsageMeterProps {
  usage: number;
  limit: number;
  plan: string;
}

export default function UsageMeter({
  usage: localUsage,
  limit,
  plan,
}: UsageMeterProps) {
  const { accessToken } = useAuth();
  const [usage, setUsage] = useState(localUsage);

  // Fetch real usage from Supabase Edge Function when token is available
  useEffect(() => {
    if (!accessToken) {
      setUsage(localUsage);
      return;
    }

    async function fetchUsage() {
      try {
        const res = await fetch(SUPABASE_GET_USAGE_URL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUsage(data.queries_used ?? data.usage ?? localUsage);
        }
      } catch {
        // fall back to local usage count
        setUsage(localUsage);
      }
    }

    fetchUsage();
  }, [accessToken, localUsage]);

  // Keep in sync with local usage when backend is unavailable
  useEffect(() => {
    setUsage((prev) => Math.max(prev, localUsage));
  }, [localUsage]);

  const percent = Math.min((usage / limit) * 100, 100);
  const isLimitReached = usage >= limit;
  const isWarning = !isLimitReached && usage >= limit * 0.8;

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent("navigate-to-pricing"));
  };

  return (
    <div
      className="border rounded-xl p-4 mb-4 bg-white shadow"
      data-ocid="usage_meter.card"
    >
      {/* Plan + usage */}
      <div className="flex justify-between mb-2">
        <span
          className="font-semibold text-sm"
          style={{ color: "oklch(0.25 0.03 240)" }}
        >
          {plan.toUpperCase()} PLAN
        </span>
        <span className="text-sm text-gray-500">
          {usage} / {limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
        <div
          className="h-2 rounded transition-all"
          style={{
            width: `${percent}%`,
            background: isLimitReached
              ? "oklch(0.55 0.20 25)"
              : "oklch(0.42 0.14 255)",
          }}
        />
      </div>

      {/* 80% warning */}
      {isWarning && (
        <p
          className="text-yellow-600 text-xs mt-2"
          data-ocid="usage_meter.warning"
        >
          You&apos;re close to your limit. Upgrade soon.
        </p>
      )}

      {/* Limit reached */}
      {isLimitReached && (
        <div className="mt-3" data-ocid="usage_meter.limit_reached">
          <p className="text-red-600 text-sm">
            You&apos;ve reached your AI limit.
          </p>
          <button
            type="button"
            onClick={handleUpgrade}
            className="mt-2 w-full py-2 rounded text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "oklch(0.42 0.14 255)" }}
            data-ocid="usage_meter.upgrade_button"
          >
            Upgrade Plan
          </button>
        </div>
      )}
    </div>
  );
}
