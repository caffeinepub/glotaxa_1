import React from "react";
import LegalLayout from "../components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last updated: 2026</p>

      <h2>Information We Collect</h2>
      <ul>
        <li>Email address</li>
        <li>Account profile information</li>
        <li>Invoice data created by users</li>
        <li>Usage analytics</li>
      </ul>

      <h2>How We Use Information</h2>
      <p>Information helps us:</p>
      <ul>
        <li>Provide invoicing tools</li>
        <li>Improve application performance</li>
        <li>Deliver customer support</li>
      </ul>

      <h2>Payment Processing</h2>
      <p>
        Payments are securely handled by Paddle. Glotaxa does not store credit
        card information.
      </p>

      <h2>Data Security</h2>
      <p>
        We use modern security infrastructure and encryption to protect user
        information.
      </p>

      <h2>User Rights</h2>
      <p>
        Users can request deletion or correction of personal data at any time.
      </p>
    </LegalLayout>
  );
}
