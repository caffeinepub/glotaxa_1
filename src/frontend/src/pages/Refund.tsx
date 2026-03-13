import React from "react";
import LegalLayout from "../components/LegalLayout";

export default function Refund() {
  return (
    <LegalLayout title="Refund Policy">
      <p>Last updated: 2026</p>

      <h2>Subscription Billing</h2>
      <p>Glotaxa subscriptions are billed through Paddle.</p>

      <h2>Refund Eligibility</h2>
      <p>
        Refund requests may be submitted within 7 days of the initial purchase
        if the service has not been extensively used.
      </p>

      <h2>Cancellation</h2>
      <p>
        Users can cancel subscriptions anytime. Cancellation stops future
        billing cycles.
      </p>

      <h2>Refund Processing</h2>
      <p>
        Approved refunds are processed by Paddle and may take several business
        days to appear in your account.
      </p>

      <h2>Contact</h2>
      <p>
        For refund requests please contact support through the Glotaxa platform.
      </p>
    </LegalLayout>
  );
}
