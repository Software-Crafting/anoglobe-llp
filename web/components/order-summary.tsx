import type { Row } from "@/lib/db";
import { money, shortDate } from "@/lib/format";
import { quote } from "@/lib/plans";
import { Icon } from "./ui";

export function OrderSummary({ reg }: { reg: Row | null }) {
  const q = quote(reg?.plan, reg?.catchup_months);
  const due = q ? money(q.amountCents) : "Choose a plan";
  const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return (
    <aside className="a-onb__aside" aria-label="Your order">
      <div className="a-onb__aside-inner">
        <button type="button" className="a-onb-summary-toggle" data-summary-toggle="" aria-expanded="false" aria-controls="summary-panel"><span>Order summary, {due}</span><Icon name="chevron-down" /></button>
        <div className="a-onb__aside-inner" id="summary-panel" data-summary-panel="">
          <div className="a-summary" role="group" aria-label="Order summary">
            <p className="a-summary__title">Order summary</p>
            <dl className="a-summary__lines">
              <div className="a-summary__line"><dt>Business</dt><dd>{reg?.business_name ?? "Your business"}</dd></div>
              <div className="a-summary__line"><dt>Plan</dt><dd>{q?.name ?? "Monthly bookkeeping"}</dd></div>
              <div className="a-summary__line"><dt>Price</dt><dd>{q ? `${money(q.amountCents)}${q.recurring ? " per month" : ""}` : "$270.00 per month"}</dd></div>
              <div className="a-summary__line"><dt>Billing</dt><dd>{q?.billing ?? "Monthly, cancel any time"}</dd></div>
            </dl>
            <dl className="a-summary__total"><dt>Due today</dt><dd>{q ? due : "$270.00"}</dd></dl>
            {(!q || q.recurring) && <p className="a-summary__note">Then {q ? due : "$270.00"} on this date each month{reg?.plan ? `, next on ${shortDate(next)}` : ""}.</p>}
          </div>
          <div className="a-card"><div className="a-card__content a-choice-list">
            <p className="a-gateway-note"><Icon name="shield-check" />Your details are encrypted. Card data never reaches Anoglobe.</p>
            <p className="a-gateway-note"><Icon name="phone-call" />After signup our assistant calls to confirm your details.</p>
            <p className="a-small a-muted">Questions? <a href="mailto:hello@anoglobebookkeeping.com">hello@anoglobebookkeeping.com</a></p>
          </div></div>
        </div>
      </div>
    </aside>
  );
}
