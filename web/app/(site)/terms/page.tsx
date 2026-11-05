import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using Anoglobe Bookkeeping’s services.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      toc={[
        ["services", "Services"],
        ["billing", "Billing"],
        ["cancel", "Cancelling"],
        ["client", "Your responsibilities"],
        ["liability", "Limits"],
        ["law", "Governing law"],
      ]}
    >
      <h2 id="services">Services</h2>
      <p>Anoglobe LLP provides the bookkeeping services described in the plan you choose. The scope of each plan is listed on the pricing page at the time you sign up.</p>
      <h2 id="billing">Billing</h2>
      <p>Monthly plans are billed in US dollars on the same day each month, starting on the day you sign up. One-time projects are billed once when you confirm the project.</p>
      <ul>
        <li>Receipts are sent by email after every charge.</li>
        <li>Price changes are announced at least 30 days in advance.</li>
      </ul>
      <h2 id="cancel">Cancelling</h2>
      <p>You can cancel a monthly plan any time before the next billing date. Work already completed for a billed month is not refunded.</p>
      <h2 id="client">Your responsibilities</h2>
      <p>You agree to give us accurate information, timely access to your accounts and answers to our monthly questions.</p>
      <h2 id="liability">Limits</h2>
      <p>Our reports are based on the information you provide. We are not responsible for errors caused by missing or inaccurate information.</p>
      <h2 id="law">Governing law</h2>
      <p>These terms are governed by the laws named in your service agreement.</p>
    </LegalPage>
  );
}
