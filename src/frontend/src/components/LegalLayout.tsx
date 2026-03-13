import type React from "react";

export default function LegalLayout({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          padding: "20px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Glotaxa</h2>
        <nav>
          <a
            href="/"
            style={{
              marginRight: "20px",
              color: "#1a56db",
              textDecoration: "none",
            }}
          >
            Home
          </a>
          <a
            href="/#pricing"
            style={{
              marginRight: "20px",
              color: "#1a56db",
              textDecoration: "none",
            }}
          >
            Pricing
          </a>
          <a
            href="/terms"
            style={{
              marginRight: "20px",
              color: "#1a56db",
              textDecoration: "none",
            }}
          >
            Terms
          </a>
          <a
            href="/privacy"
            style={{
              marginRight: "20px",
              color: "#1a56db",
              textDecoration: "none",
            }}
          >
            Privacy
          </a>
          <a
            href="/refund"
            style={{ color: "#1a56db", textDecoration: "none" }}
          >
            Refunds
          </a>
        </nav>
      </header>

      <main
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          padding: "20px",
          lineHeight: "1.7",
        }}
      >
        <h1>{title}</h1>
        {children}
      </main>

      <footer
        style={{
          marginTop: "60px",
          padding: "20px",
          borderTop: "1px solid #eee",
          textAlign: "center",
        }}
      >
        <p>© 2026 Glotaxa</p>
        <a href="/terms" style={{ color: "#1a56db", textDecoration: "none" }}>
          Terms
        </a>{" "}
        |{" "}
        <a href="/privacy" style={{ color: "#1a56db", textDecoration: "none" }}>
          Privacy
        </a>{" "}
        |{" "}
        <a href="/refund" style={{ color: "#1a56db", textDecoration: "none" }}>
          Refund Policy
        </a>
      </footer>
    </div>
  );
}
