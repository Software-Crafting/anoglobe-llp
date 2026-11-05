import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell, crumbsFromDashboard, PageHeader, Status } from "@/components/admin-ui";
import { SelectField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { canManage, requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { dateTime, money } from "@/lib/format";

export const metadata: Metadata = { title: "Payment" };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const p = await one("select p.*, r.business_name, r.first_name, r.last_name, r.ref as reg_ref from payments p join registrations r on r.id = p.registration_id where p.id = $1", [id]);
  if (!p) notFound();
  const name = p.business_name || `${p.first_name} ${p.last_name}`;
  const back = `/admin/payments/${id}`;
  const net = p.refund_cents ? p.amount_cents - p.refund_cents : p.amount_cents;

  return (
    <AdminShell user={user} active="payments">
      <PageHeader
        title={p.ref}
        crumbs={[...crumbsFromDashboard, ["Payments", "/admin/payments"]]}
        status={<Status value={p.status} />}
        description={<><a href={`/admin/registrations/${p.registration_id}`}>{name}</a>, {dateTime(p.created_at)}</>}
        actions={
          <>
            <button type="button" className="a-btn a-btn--outline" data-print=""><Icon name="download" />Download receipt</button>
            {canManage(user) && p.status === "succeeded" && <button type="button" className="a-btn a-btn--primary" data-dialog-open="dlg-refund"><Icon name="refunded" />Refund</button>}
          </>
        }
      />
      <div className="a-admin-grid a-admin-grid--main-side">
        <div className="a-admin-grid">
          <section className="a-card" aria-label="Amount">
            <div className="a-card__header"><h2 className="a-card__title">Amount</h2></div>
            <div className="a-card__content">
              <dl className="a-summary__lines"><div className="a-summary__line"><dt>{p.description}</dt><dd>{money(p.amount_cents)}</dd></div>{p.refund_cents && <div className="a-summary__line a-summary__line--discount"><dt>Refunded, {p.refund_reason}</dt><dd>-{money(p.refund_cents)}</dd></div>}</dl>
              <dl className="a-summary__total"><dt>{p.status === "succeeded" || p.status === "refunded" ? "Net charged" : "Attempted"}</dt><dd>{money(net)}</dd></dl>
            </div>
          </section>
          <section className="a-card" aria-label="Billing authorization">
            <div className="a-card__header"><h2 className="a-card__title">Billing authorization</h2>{p.auth_at && <span className="a-badge a-badge--success"><Icon name="check" />Recorded</span>}</div>
            <div className="a-card__content"><dl className="a-dl"><dt>Type</dt><dd>{p.kind === "recurring" ? "Monthly recurring, until cancelled" : "One time"}</dd><dt>Agreed text</dt><dd>&ldquo;{p.auth_text}&rdquo;</dd><dt>Accepted by</dt><dd>{p.auth_by}</dd><dt>Accepted at</dt><dd>{dateTime(p.auth_at)}</dd><dt>IP address</dt><dd className="a-mono">{p.auth_ip}</dd></dl></div>
          </section>
        </div>
        <div className="a-admin-grid">
          <section className="a-card" aria-label="Gateway">
            <div className="a-card__header"><h2 className="a-card__title">Gateway</h2></div>
            <div className="a-card__content">
              <dl className="a-dl">
                <dt>Processor</dt><dd>{p.gateway === "test" ? "Test mode, no real charge" : p.gateway}</dd>
                <dt>Payment ID</dt><dd className="a-mono">{p.gateway_id}</dd>
                <dt>Card</dt><dd>{p.brand} ending {p.last4}{p.exp ? `, exp ${p.exp}` : ""}</dd>
                {p.failure_reason && <><dt>Failure</dt><dd>{p.failure_reason}</dd></>}
              </dl>
            </div>
          </section>
        </div>
      </div>
      {canManage(user) && p.status === "succeeded" && (
        <dialog className="a-dialog a-dialog--select" id="dlg-refund" aria-labelledby="dlg-refund-title" data-dismissable="false">
          <form method="post" action="/api/admin" style={{ display: "contents" }}>
            <input type="hidden" name="_action" value="payment.refund" /><input type="hidden" name="_back" value={back} /><input type="hidden" name="id" value={id} />
            <div className="a-dialog__header"><div><h2 className="a-dialog__title" id="dlg-refund-title">Refund this payment?</h2><p className="a-dialog__description">{p.gateway === "test" ? "Test mode: this only records the refund." : `Money returns to ${p.brand} ending ${p.last4} in 5 to 10 business days.`}</p></div></div>
            <div className="a-dialog__body a-form-grid">
              <div className="a-field"><label className="a-label" htmlFor="refund-amount">Amount, USD</label><input className="a-input" id="refund-amount" name="amount" type="text" inputMode="decimal" defaultValue={(p.amount_cents / 100).toFixed(2)} required /><p className="a-hint">Up to {money(p.amount_cents)}</p></div>
              <SelectField name="reason" label="Reason" required placeholder="Choose a reason" options={[["Requested by client", "Requested by client"], ["Duplicate charge", "Duplicate charge"], ["Fraudulent", "Fraudulent"], ["Other", "Other"]]} />
            </div>
            <div className="a-dialog__footer"><button type="button" className="a-btn a-btn--ghost" data-dialog-close="" autoFocus>Keep payment</button><button type="submit" className="a-btn a-btn--destructive">Refund payment</button></div>
          </form>
        </dialog>
      )}
    </AdminShell>
  );
}
