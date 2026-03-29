import React from "react";
import LegalLayout from "../components/LegalLayout";

export default function Refund() {
  return (
    <LegalLayout title="Refund Policy">
      <p>Last updated: 2026</p>

      <h2>Subscription Billing</h2>
      <p>
        GD Enterprises subscriptions are billed through Paddle, our authorised
        reseller and Merchant of Record.
      </p>

      <h2>Refund Eligibility</h2>
      <p>
        You are entitled to a full refund within <strong>30 days</strong> of
        your initial purchase or renewal. All refund requests submitted within
        this 30-day window will be honoured, no questions asked.
      </p>

      <h2>How to Request a Refund</h2>
      <p>
        To request a refund, please contact us at{" "}
        <a href="mailto:gdenterprises005@gmail.com">
          gdenterprises005@gmail.com
        </a>{" "}
        with your order details. Refunds are processed by Paddle and typically
        appear in your account within 5–10 business days.
      </p>

      <h2>Cancellation</h2>
      <p>
        You can cancel your subscription at any time. Cancellation stops future
        billing cycles. If you cancel within the 30-day refund window you are
        also entitled to a refund of the most recent charge.
      </p>

      <h2>Contact</h2>
      <p>
        For any questions about refunds or billing, please email{" "}
        <a href="mailto:gdenterprises005@gmail.com">
          gdenterprises005@gmail.com
        </a>
        .
      </p>
    </LegalLayout>
  );
}
