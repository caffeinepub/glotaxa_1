interface UpgradeModalProps {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const handleViewPlans = () => {
    window.dispatchEvent(new CustomEvent("navigate-to-pricing"));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      data-ocid="upgrade.modal"
    >
      <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Upgrade Required</h2>
        <p className="text-sm text-gray-600 mb-4">
          You&apos;ve reached your AI usage limit. Upgrade to continue using AI
          VAT Assistant.
        </p>

        <button
          type="button"
          onClick={handleViewPlans}
          className="w-full py-2 rounded text-white font-medium mb-2 transition-opacity hover:opacity-90"
          style={{ background: "oklch(0.42 0.14 255)" }}
          data-ocid="upgrade.view_plans_button"
        >
          View Plans
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-gray-500 text-sm py-1"
          data-ocid="upgrade.cancel_button"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
