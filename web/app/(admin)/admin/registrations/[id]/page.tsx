import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, AdminShell, crumbsFromDashboard, Empty, PageHeader, Status } from "@/components/admin-ui";
import { Field, SelectField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { canEditClients, canManage, requireUser } from "@/lib/auth";
import { many, one, type Row } from "@/lib/db";
import { dateTime, duration, fileSize, initials, KINDS, money, shortDate, TEMPLATES, TRIGGERS } from "@/lib/format";
import { entityLabel, label, OPTIONS } from "@/lib/onboarding";
import { quote } from "@/lib/plans";
import { decryptText } from "@/lib/secure";

export const metadata: Metadata = { title: "Registration" };

function InlineEdit({ reg, field, title, value, editable }: { reg: string; field: string; title: string; value: string; editable: boolean }) {
  const id = `ie-${field}`;
  return (
    <div className="a-field">
      <p className="a-label" id={`${id}-label`}>{title}</p>
      {editable ? (
        <div className="a-inline-edit" data-inline-edit={title} data-reg={reg} data-field={field}>
          <span className="a-inline-edit__value">{value}</span>
          <button type="button" className="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-inline-start="" aria-label={`Edit ${title.toLowerCase()}`} data-tooltip="Edit"><Icon name="edit" /></button>
          <div className="a-inline-edit__form" hidden>
            <input className="a-input" type="text" aria-labelledby={`${id}-label`} />
            <button type="button" className="a-btn a-btn--primary a-btn--sm" data-inline-save="">Save</button>
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" data-inline-cancel="">Cancel</button>
          </div>
        </div>
      ) : <p>{value}</p>}
    </div>
  );
}

const Rows = ({ rows }: { rows: [string, unknown][] }) => (
  <dl className="a-dl">{rows.map(([name, value]) => <div key={name} style={{ display: "contents" }}><dt>{name}</dt><dd>{(value as string) || "None"}</dd></div>)}</dl>
);

const CALL_TIMES = Array.from({ length: 21 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  const hour = Math.floor(minutes / 60);
  return [`${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`, `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`];
});

const TABS: [string, string, string][] = [["over", "user", "Overview"], ["docs", "folder", "Documents"], ["pay", "credit-card", "Payments"], ["calls", "phone-call", "Calls"], ["mail", "mail", "Emails"], ["log", "clock", "Activity"]];

function callMarker(status: string) {
  if (status === "answered") return { cls: "a-timeline__marker a-timeline__marker--success", icon: "phone-call" };
  if (status === "queued" || status === "ringing") return { cls: "a-timeline__marker a-timeline__marker--accent", icon: "phone-call" };
  return { cls: "a-timeline__marker", icon: "phone-missed" };
}

export default async function RegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const reg = await one("select * from registrations where id = $1", [id]);
  if (!reg) notFound();
  const [docs, payments, calls, emails, activity, notes, subscription] = await Promise.all([
    many("select * from documents where registration_id = $1 order by created_at desc", [id]),
    many("select * from payments where registration_id = $1 order by created_at desc", [id]),
    many("select * from calls where registration_id = $1 order by created_at desc", [id]),
    many("select id, template, to_email, status, created_at from emails where registration_id = $1 order by created_at desc", [id]),
    many("select * from audit_log where registration_id = $1 order by created_at desc limit 100", [id]),
    many("select * from notes where registration_id = $1 order by created_at desc", [id]),
    one("select * from subscriptions where registration_id = $1 order by id desc limit 1", [id]),
  ]);
  const d: Row = reg.data ?? {};
  const name = reg.business_name || `${reg.first_name} ${reg.last_name}`;
  const q = quote(reg.plan, reg.catchup_months);
  const editable = canEditClients(user);
  const back = `/admin/registrations/${id}`;
  const lastPayment = payments.find((p) => p.status === "succeeded");
  // Only owners and admins see the whole EIN; everyone else gets the last four.
  let ein = "None";
  if (reg.ein_enc) {
    const value = decryptText(reg.ein_enc);
    ein = canManage(user) ? value : `••-•••${value.slice(-4)}`;
  }
  const address = [d["biz-line1"], d["biz-line2"], d["biz-city"], `${reg.state ?? ""} ${d["biz-zip"] ?? ""}`.trim()].filter(Boolean).join(", ");
  const services = (d.services ?? []).map((s: string) => OPTIONS.services.find(([v]) => v === s)?.[2]).join(", ");

  return (
    <AdminShell user={user} active="registrations">
      <PageHeader
        title={name}
        crumbs={[...crumbsFromDashboard, ["Registrations", "/admin/registrations"]]}
        status={<Status value={reg.status} />}
        description={`${reg.ref}, signed up ${shortDate(reg.created_at)}`}
        actions={editable && (
          <>
            <ActionForm action="registration.call" back={back} fields={{ id }}><Icon name="phone-call" />Retry AI call</ActionForm>
            <button type="button" className="a-btn a-btn--outline" data-dialog-open="dlg-schedule"><Icon name="calendar" />Schedule call</button>
            <button type="button" className="a-btn a-btn--outline" data-dialog-open="dlg-note"><Icon name="message" />Add note</button>
            <button type="button" className="a-btn a-btn--primary" data-menu-trigger="" aria-haspopup="menu" aria-expanded="false" aria-controls="status-menu" data-align="end">Set status<Icon name="chevron-down" /></button>
            <div className="a-menu" id="status-menu" role="menu" aria-label="Set status" hidden>
              {[["active", "Active"], ["pending", "Pending documents"], ["review", "In review"], ["paused", "Paused"]].map(([value, text]) => <ActionForm action="registration.status" back={back} fields={{ id, status: value }} menu key={value}>{text}</ActionForm>)}
            </div>
          </>
        )}
      />
      <div className="a-tabs a-page-tabs" data-tabs="">
        <div role="tablist" className="a-tabs__list" data-scroll-area="" aria-label="Registration sections">
          {TABS.map(([tab, icon, text], index) => <button type="button" role="tab" className="a-tabs__tab" id={`t-${tab}`} aria-controls={`p-${tab}`} aria-selected={index === 0} key={tab}><Icon name={icon} />{text}</button>)}
        </div>

        <div role="tabpanel" className="a-tabs__panel" id="p-over" aria-labelledby="t-over" tabIndex={0}>
          <div className="a-admin-grid a-admin-grid--main-side">
            <div className="a-admin-grid">
              <section className="a-card" aria-label="Contact">
                <div className="a-card__header"><h2 className="a-card__title">Contact</h2></div>
                <div className="a-card__content a-form-grid a-form-grid--2">
                  <InlineEdit reg={id} field="first_name" title="First name" value={reg.first_name} editable={editable} />
                  <InlineEdit reg={id} field="last_name" title="Last name" value={reg.last_name} editable={editable} />
                  <InlineEdit reg={id} field="email" title="Email" value={reg.email} editable={editable} />
                  <InlineEdit reg={id} field="phone" title="Phone" value={reg.phone} editable={editable} />
                  <div className="a-field"><p className="a-label">Role</p><p>{label(OPTIONS.roles, reg.role) || "None"}</p></div>
                </div>
              </section>
              <section className="a-card" aria-label="Business">
                <div className="a-card__header"><h2 className="a-card__title">Business</h2></div>
                <div className="a-card__content"><Rows rows={[["Legal name", reg.business_name], ["Doing business as", d.dba], ["Entity", entityLabel(d.entity)], ["EIN", ein], ["Industry", d.industry], ["Formed in", label(OPTIONS.states, d["formation-state"])], ["Address", address], ["Website", d.website], ["Team size", label(OPTIONS.team, d.team)]]} /></div>
              </section>
              <section className="a-card" aria-label="Services and books">
                <div className="a-card__header"><h2 className="a-card__title">Services and books</h2></div>
                <div className="a-card__content"><Rows rows={[["Services", services], ["Software", d.software], ["Months behind", label(OPTIONS.behind, d["months-behind"])], ["Volume", d.volume ? `About ${d.volume} transactions a month` : ""], ["Accounts", d.accounts ? `${d.accounts} bank and card accounts` : ""], ["Start date", d["start-date"]], ["Notes", d.notes]]} /></div>
              </section>
            </div>
            <div className="a-admin-grid">
              <section className="a-card" aria-label="Plan">
                <div className="a-card__header"><h2 className="a-card__title">Plan</h2>{subscription && <Status value={subscription.status} />}</div>
                <div className="a-card__content">
                  {q ? <><p className="a-stat__value">{money(q.amountCents)}<span className="a-small a-muted">{q.recurring ? " per month" : " one time"}</span></p><Rows rows={[["Plan", q.name], ["Billing", q.billing], ["Next charge", subscription?.next_charge_at ? shortDate(subscription.next_charge_at) : ""], ["Card", lastPayment ? `${lastPayment.brand} ending ${lastPayment.last4}` : ""]]} /></> : <p className="a-muted">No plan chosen yet.</p>}
                </div>
              </section>
              <section className="a-card" aria-label="Notes">
                <div className="a-card__header"><h2 className="a-card__title">Notes</h2>{editable && <button type="button" className="a-btn a-btn--link a-btn--sm" data-dialog-open="dlg-note">Add</button>}</div>
                <div className="a-card__content">
                  {notes.length === 0 ? <p className="a-muted">No notes yet.</p> : (
                    <ul className="a-feed" role="list">{notes.map((note) => <li className="a-feed__item" key={note.id}><span className="a-avatar a-avatar--sm a-avatar--neutral" aria-hidden="true">{initials(note.author)}</span><div className="a-feed__text"><p>{note.body}</p><p className="a-feed__meta">{note.author}</p></div><span className="a-feed__time">{shortDate(note.created_at)}</span></li>)}</ul>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div role="tabpanel" className="a-tabs__panel" id="p-docs" aria-labelledby="t-docs" tabIndex={0} hidden>
          {docs.length === 0 ? <Empty title="No documents uploaded" text="Clients can upload during onboarding or later from their email link." /> : (
            <ul className="a-file-list" aria-label="Documents">
              {docs.map((doc) => (
                <li className="a-file is-done" key={doc.id}>
                  <Icon name="file-text" />
                  <span className="a-file__name">{doc.filename}</span>
                  <span className="a-file__meta">{KINDS[doc.kind]}, {fileSize(Number(doc.size_bytes))}, {shortDate(doc.created_at)}, by {doc.uploaded_by}</span>
                  <span className="a-file__actions">
                    <a className="a-btn a-btn--ghost a-btn--icon a-btn--sm" href={`/api/admin/documents/${doc.id}?view=1`} target="_blank" aria-label={`Open ${doc.filename}`} data-tooltip="Open"><Icon name="eye" /></a>
                    <a className="a-btn a-btn--ghost a-btn--icon a-btn--sm" href={`/api/admin/documents/${doc.id}`} aria-label={`Download ${doc.filename}`} data-tooltip="Download"><Icon name="download" /></a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div role="tabpanel" className="a-tabs__panel" id="p-pay" aria-labelledby="t-pay" tabIndex={0} hidden>
          {payments.length === 0 ? <Empty title="No payments yet" text="Payments appear here after this client pays." /> : (
            <div className="a-table-scroll" data-scroll-area="" tabIndex={0} role="region" aria-label="Payments">
              <table className="a-table a-table--stack">
                <thead><tr><th scope="col">Payment</th><th scope="col">Date</th><th scope="col">Type</th><th scope="col" className="a-table__num">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>{payments.map((p) => <tr key={p.id}><td><a href={`/admin/payments/${p.id}`}>{p.ref}</a></td><td data-label="Date">{shortDate(p.created_at)}</td><td data-label="Type">{p.kind === "recurring" ? "Recurring" : "One-time"}</td><td className="a-table__num" data-label="Amount">{money(p.amount_cents)}</td><td data-label="Status"><Status value={p.status} /></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>

        <div role="tabpanel" className="a-tabs__panel" id="p-calls" aria-labelledby="t-calls" tabIndex={0} hidden>
          {calls.length === 0 ? <Empty title="No calls yet" text="Calls start after a client signs up or pays." /> : (
            <ol className="a-timeline">
              {calls.map((call) => {
                const marker = callMarker(call.status);
                return (
                  <li className="a-timeline__item" key={call.id}>
                    <span className={marker.cls}><Icon name={marker.icon} /></span>
                    <div>
                      <p className="a-timeline__title"><Status value={call.status} /> {TRIGGERS[call.trigger] ?? call.trigger}</p>
                      <p className="a-timeline__meta">{dateTime(call.scheduled_for ?? call.created_at)}{call.duration_s != null ? `, ${duration(call.duration_s)}` : ""}, to {call.phone}</p>
                      {call.summary && <p className="a-timeline__body">{call.summary}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div role="tabpanel" className="a-tabs__panel" id="p-mail" aria-labelledby="t-mail" tabIndex={0} hidden>
          {emails.length === 0 ? <Empty title="No emails sent" text="Signup and payment emails will be listed here with their delivery status." /> : (
            <ul className="a-feed" role="list">
              {emails.map((email) => <li className="a-feed__item" key={email.id}><span className="a-avatar a-avatar--sm a-avatar--neutral" aria-hidden="true"><Icon name="mail" className="a-icon--16" /></span><div className="a-feed__text"><p><a href={`/api/admin/emails/${email.id}`} target="_blank">{TEMPLATES[email.template] ?? email.template}</a></p><p className="a-feed__meta">To {email.to_email}</p></div><span className="a-feed__end"><Status value={email.status} /><span className="a-feed__time">{dateTime(email.created_at)}</span></span></li>)}
            </ul>
          )}
        </div>

        <div role="tabpanel" className="a-tabs__panel" id="p-log" aria-labelledby="t-log" tabIndex={0} hidden>
          {activity.length === 0 ? <p className="a-muted">Nothing yet.</p> : (
            <ol className="a-timeline">{activity.map((item) => <li className="a-timeline__item" key={item.id}><span className="a-timeline__marker"><Icon name={item.icon} /></span><div><p className="a-timeline__title">{item.actor} {item.event}</p><p className="a-timeline__meta">{dateTime(item.created_at)}</p></div></li>)}</ol>
          )}
        </div>
      </div>

      {editable && (
        <>
          <dialog className="a-dialog" id="dlg-note" aria-labelledby="dlg-note-title">
            <form method="post" action="/api/admin" style={{ display: "contents" }}>
              <input type="hidden" name="_action" value="registration.note" /><input type="hidden" name="_back" value={back} /><input type="hidden" name="id" value={id} />
              <div className="a-dialog__header"><h2 className="a-dialog__title" id="dlg-note-title">Add internal note</h2><button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button></div>
              <div className="a-dialog__body"><div className="a-field"><label className="a-label" htmlFor="note-text">Note</label><textarea className="a-textarea" id="note-text" name="body" maxLength={1000} required placeholder="Visible to the Anoglobe team only" /></div></div>
              <div className="a-dialog__footer"><button type="button" className="a-btn a-btn--ghost" data-dialog-close="">Cancel</button><button type="submit" className="a-btn a-btn--primary">Save note</button></div>
            </form>
          </dialog>
          <dialog className="a-dialog a-dialog--select" id="dlg-schedule" aria-labelledby="dlg-schedule-title">
            <form method="post" action="/api/admin" style={{ display: "contents" }}>
              <input type="hidden" name="_action" value="registration.schedule" /><input type="hidden" name="_back" value={back} /><input type="hidden" name="id" value={id} />
              <div className="a-dialog__header"><div><h2 className="a-dialog__title" id="dlg-schedule-title">Schedule the welcome call</h2><p className="a-dialog__description">We email {reg.first_name} the date and time.</p></div><button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button></div>
              <div className="a-dialog__body a-form-grid a-form-grid--2">
                <Field id="call-date" label="Date, Eastern Time" required>
                  <div className="a-datepicker" data-datepicker="" data-min="today" data-icons="chevron-left chevron-right chevron-down">
                    <div className="a-input-group">
                      <input className="a-input" type="text" inputMode="numeric" data-mask="date" placeholder="MM/DD/YYYY" autoComplete="off" id="call-date" name="date" required />
                      <button type="button" className="a-input-group__action" data-datepicker-open="" aria-haspopup="dialog" aria-expanded="false" aria-label="Choose date"><Icon name="calendar" /></button>
                    </div>
                  </div>
                </Field>
                <SelectField name="time" label="Time" required placeholder="Choose a time" options={CALL_TIMES} />
              </div>
              <div className="a-dialog__footer"><button type="button" className="a-btn a-btn--ghost" data-dialog-close="">Cancel</button><button type="submit" className="a-btn a-btn--primary">Schedule call</button></div>
            </form>
          </dialog>
        </>
      )}
    </AdminShell>
  );
}
