import React from "react";
import LegalLayout from "../components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>Last updated: 2026</p>

      <h2>1. Introduction</h2>
      <p>
        Glotaxa provides an AI powered invoicing and tax automation platform. By
        using this service you agree to these terms.
      </p>

      <h2>2. User Accounts</h2>
      <p>
        Users must register an account and maintain accurate information. You
        are responsible for safeguarding your login credentials.
      </p>

      <h2>3. Subscription Plans</h2>
      <p>
        Glotaxa provides free and paid plans. Paid subscriptions are processed
        through Paddle.
      </p>
      <ul>
        <li>Free plan: limited invoices per month</li>
        <li>Starter plan: expanded invoice limits</li>
        <li>Pro plan: automation and reporting tools</li>
        <li>Business plan: enterprise scale features</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>Users agree not to misuse the platform including:</p>
      <ul>
        <li>Fraudulent invoicing</li>
        <li>Illegal financial activity</li>
        <li>Attempting to bypass system limits</li>
      </ul>

      <h2>5. Platform Availability</h2>
      <p>
        We strive to maintain high availability but cannot guarantee
        uninterrupted service.
      </p>

      <h2>6. Financial Disclaimer</h2>
      <p>
        Glotaxa does not provide tax, accounting, or legal advice. Users are
        responsible for verifying financial data.
      </p>

      <h2>7. Termination</h2>
      <p>Accounts violating these terms may be suspended or terminated.</p>

      <h2>8. Limitation of Liability</h2>
      <p>
        Glotaxa is not responsible for financial loss resulting from use of the
        platform.
      </p>
    </LegalLayout>
  );
}
