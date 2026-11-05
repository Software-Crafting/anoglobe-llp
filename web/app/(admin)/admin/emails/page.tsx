import type { Metadata } from "next";
import { ActionForm, AdminShell, crumbsFromDashboard, Empty, PageHeader, Status, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { canEditClients, requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { isoDate, shortDate, TEMPLATES } from "@/lib/format";

export const metadata: Metadata = { title: "Emails" };

const PREVIEWS = ["signup-confirmation", "payment-confirmation", "team-notification", "payment-failed", "call-scheduled"];

export default async function EmailsPage() {
  const user = await requireUser();
  const rows = await many("select e.id, e.template, e.to_email, e.subject, e.status, e.error, e.created_at, r.business_name from emails e left join registrations r on r.id = e.registration_id order by e.created_at desc limit 2000");
  const mailServer = Boolean(process.env.SMTP_URL);
  return (
    <AdminShell user={user} active="emails">
      <PageHeader title="Emails" crumbs={crumbsFromDashboard} description="Automated emails sent after signup and payment." />
      {!mailServer && <div className="a-alert a-alert--warning" role="note"><Icon name="alert-triangle" /><p className="a-alert__title">No mail server is set up</p><p className="a-alert__body">Emails are written here with the status Not sent. Add SMTP_URL to .env.local and they go out.</p></div>}
      <div className="a-feature-grid">
        {PREVIEWS.map((name) => (
          <a className="a-card a-card--interactive" href={`/api/admin/emails/${name}`} target="_blank" key={name}>
            <div className="a-card__content"><span className="a-feature__icon"><Icon name="mail-duo" className="a-icon--32" /></span><p className="a-card__title">{TEMPLATES[name]}</p><p className="a-card__description">Preview with sample details</p></div>
          </a>
        ))}
      </div>
      <TableCard
        id="mail-table"
        exportName="emails"
        search="Search emails"
        select
        rows={rows.length}
        noMatch="No emails match"
        empty={<Empty title="No emails sent" text="Signup and payment emails will be listed here with their delivery status." />}
        filters={[{ key: "status", options: [["delivered", "Delivered"], ["not_sent", "Not sent"], ["failed", "Failed"]] }]}
        columns={[{ label: "Email", sticky: true }, { label: "To" }, { label: "Status" }, { label: "Sent" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((email) => (
          <tr data-row="" data-id={email.id} data-status={email.status} key={email.id}>
            <td className="a-table__check"><input className="a-check__input" type="checkbox" data-select-row="" aria-label={`Select ${email.subject}`} /></td>
            <td className="a-table__sticky"><a href={`/api/admin/emails/${email.id}`} target="_blank">{TEMPLATES[email.template] ?? email.template}</a><span className="a-table__sub">{email.business_name}</span></td>
            <td data-label="To">{email.to_email}</td>
            <td data-label="Status"><Status value={email.status} /></td>
            <td data-label="Sent" data-sort={isoDate(email.created_at)}>{shortDate(email.created_at)}</td>
            <td className="a-table__actions">{canEditClients(user) && <ActionForm action="email.resend" back="/admin/emails" fields={{ id: email.id }} className="a-btn a-btn--ghost a-btn--sm">Resend</ActionForm>}</td>
          </tr>
        ))}
      </TableCard>
    </AdminShell>
  );
}
