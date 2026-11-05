import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Anoglobe Bookkeeping collects, uses and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      toc={[
        ["collect", "Information we collect"],
        ["use", "How we use it"],
        ["cards", "Card payments"],
        ["calls", "Automated calls"],
        ["share", "Sharing"],
        ["security", "Security"],
        ["rights", "Your choices"],
        ["contact", "Contact"],
      ]}
    >
      <h2 id="collect">Information we collect</h2>
      <p>We collect the details you give us during signup: your name, work email, phone number, business name, entity type, EIN, address and the documents you upload. We also keep a record of payments and of calls made by our onboarding assistant.</p>
      <h2 id="use">How we use it</h2>
      <p>We use your information to provide bookkeeping services, bill you, contact you about your account and meet legal obligations.</p>
      <ul>
        <li>To set up and maintain your books</li>
        <li>To process payments through our payment processor</li>
        <li>To send receipts, reminders and account notices</li>
      </ul>
      <h2 id="cards">Card payments</h2>
      <p>Card details are entered into fields hosted by Stripe. Anoglobe never receives or stores your full card number or security code. We keep only the card brand, last four digits and expiry date for your records.</p>
      <h2 id="calls">Automated calls</h2>
      <p>After signup or payment, an automated assistant from our calling provider may call the number you give us to confirm details and schedule onboarding. You can ask us to stop these calls at any time.</p>
      <h2 id="share">Sharing</h2>
      <p>We share information only with service providers who help us run the service, such as our payment processor, email provider and calling provider, and only as needed for that purpose. We do not sell personal information.</p>
      <h2 id="security">Security</h2>
      <p>Information is encrypted in transit and at rest. Access is limited to team members who need it for your account.</p>
      <h2 id="rights">Your choices</h2>
      <p>You can ask to see, correct or delete your information by emailing privacy@anoglobebookkeeping.com. We may keep records we are required to keep by law.</p>
      <h2 id="contact">Contact</h2>
      <p>Questions about this policy: privacy@anoglobebookkeeping.com.</p>
    </LegalPage>
  );
}
