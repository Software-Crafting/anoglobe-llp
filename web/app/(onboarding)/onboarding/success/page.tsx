import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DesignJs } from "@/components/design-js";
import { Icon } from "@/components/ui";
import { one } from "@/lib/db";
import { dateTime, money, shortDate } from "@/lib/format";
import { currentRegistration, isOpen } from "@/lib/onboarding";
import { quote } from "@/lib/plans";

export const metadata: Metadata = { title: "Welcome" };

export default async function SuccessPage() {
  const reg = await currentRegistration();
  if (!reg) redirect("/onboarding/account");
  if (isOpen(reg)) redirect("/onboarding");
  const payment = await one("select * from payments where registration_id = $1 and status = 'succeeded' order by id desc limit 1", [reg.id]);
  if (!payment) redirect("/onboarding");
  const subscription = await one("select * from subscriptions where registration_id = $1 and status = 'active' order by id desc limit 1", [reg.id]);
  const q = quote(reg.plan, reg.catchup_months);
  const now = new Date();
  const firstClose = shortDate(new Date(now.getFullYear(), now.getMonth() + 2, 10));

  return (
    <main id="main" className="a-onb a-onb--single">
      <div className="a-onb__main">
        <div className="a-onb__card">
          <div className="a-result">
            <span><svg className="a-anim-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" pathLength={1} /><path d="M8.2 12.3l2.6 2.6 5-5.2" pathLength={1} /></svg></span>
            <h1 className="a-result__title">Welcome to Anoglobe, {reg.first_name}</h1>
            <p className="a-result__text">Your payment went through and your account is ready. Your confirmation goes to <strong>{reg.email}</strong>.</p>
          </div>
          {payment.gateway === "test" && <div className="a-test-mode" role="note"><strong>Test mode.</strong> No real money moved.</div>}
          <div className="a-summary" role="group" aria-label="Receipt">
            <div className="a-page-header__row"><p className="a-summary__title">Receipt</p><span className="a-mono a-small a-muted">{reg.ref}-{payment.ref.replace("PAY-", "")}</span></div>
            <dl className="a-summary__lines">
              <div className="a-summary__line"><dt>Business</dt><dd>{reg.business_name}</dd></div>
              <div className="a-summary__line"><dt>Plan</dt><dd>{q?.name}, {q?.recurring ? "monthly" : "one time"}</dd></div>
              <div className="a-summary__line"><dt>Paid with</dt><dd>{payment.brand} ending {payment.last4}</dd></div>
              <div className="a-summary__line"><dt>Date</dt><dd>{dateTime(payment.created_at)}</dd></div>
            </dl>
            <dl className="a-summary__total"><dt>Amount paid</dt><dd>{money(payment.amount_cents)}</dd></dl>
            {subscription && <p className="a-summary__note">Next charge {money(subscription.amount_cents)} on {shortDate(subscription.next_charge_at)}.</p>}
            <div className="a-btn-row"><button type="button" className="a-btn a-btn--outline" data-print=""><Icon name="download" />Download receipt</button></div>
          </div>
          <h2 className="a-h4 a-onb__next">What happens next</h2>
          <ol className="a-timeline">
            <li className="a-timeline__item"><span className="a-timeline__marker a-timeline__marker--success"><Icon name="mail-check" /></span><div><p className="a-timeline__title">Confirmation email</p><p className="a-timeline__meta">Just now</p></div></li>
            <li className="a-timeline__item"><span className="a-timeline__marker a-timeline__marker--accent"><span className="a-calling" aria-hidden="true"><Icon name="phone-call" /></span></span><div><p className="a-timeline__title">Welcome call from our assistant</p><p className="a-timeline__meta">To {reg.phone}</p><p className="a-timeline__body">A short automated call to confirm your details and book a time with your bookkeeper.</p></div></li>
            <li className="a-timeline__item"><span className="a-timeline__marker"><Icon name="file-text" /></span><div><p className="a-timeline__title">Document review</p><p className="a-timeline__meta">Within 2 business days</p></div></li>
            <li className="a-timeline__item"><span className="a-timeline__marker"><Icon name="calendar" /></span><div><p className="a-timeline__title">First monthly close</p><p className="a-timeline__meta">By {firstClose}</p></div></li>
          </ol>
          <div className="a-form-actions"><a className="a-btn a-btn--ghost" href="/">Back to website</a><a className="a-btn a-btn--primary" href="/onboarding/documents"><Icon name="upload" />Upload documents now</a></div>
        </div>
      </div>
      <DesignJs />
    </main>
  );
}
