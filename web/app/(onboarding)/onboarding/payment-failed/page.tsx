import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DesignJs } from "@/components/design-js";
import { Icon } from "@/components/ui";
import { one } from "@/lib/db";
import { money } from "@/lib/format";
import { currentRegistration, isOpen } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Your card was declined" };

export default async function PaymentFailedPage() {
  const reg = await currentRegistration();
  if (!reg) redirect("/onboarding/account");
  if (!isOpen(reg)) redirect("/onboarding/success");
  const payment = await one("select * from payments where registration_id = $1 and status = 'failed' order by id desc limit 1", [reg.id]);
  if (!payment) redirect("/onboarding");

  return (
    <main id="main" className="a-onb a-onb--single">
      <div className="a-onb__main">
        <div className="a-onb__card">
          <div className="a-result">
            <svg className="a-illus a-illus--96" aria-hidden="true"><use href="#illus-payment-failed" /></svg>
            <h1 className="a-result__title">Your card was declined</h1>
            <p className="a-result__text">Your bank did not approve the {money(payment.amount_cents)} charge. No money was taken and your details are saved.</p>
          </div>
          <div className="a-alert a-alert--destructive" role="note"><Icon name="x-circle" /><p className="a-alert__title">Reason from your bank: {payment.failure_reason}</p><p className="a-alert__body">Banks do not always share the reason. Common causes are a low balance, a daily limit, or a fraud check on a new merchant.</p></div>
          <h2 className="a-h4 a-onb__next">What you can do</h2>
          <ul className="a-check-list" role="list">
            <li><Icon name="credit-card" /><p><strong>Try another card</strong><span>Any Visa, Mastercard, American Express or Discover card.</span></p></li>
            <li><Icon name="phone" /><p><strong>Call your bank</strong><span>Ask them to approve a charge from Anoglobe LLP, then try again.</span></p></li>
            <li><Icon name="clock" /><p><strong>Finish later</strong><span>We keep your answers. Resume from the link in your email.</span></p></li>
          </ul>
          <div className="a-form-actions"><a className="a-btn a-btn--ghost" href="/onboarding/resume">Finish later</a><a className="a-btn a-btn--primary" href="/onboarding/payment"><Icon name="credit-card" />Try another card</a></div>
        </div>
      </div>
      <DesignJs />
    </main>
  );
}
