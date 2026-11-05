import type { Metadata } from "next";
import { ActionForm, AdminShell, crumbsFromDashboard, Empty, PageHeader, RowMenu, Status, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { canEditClients, requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { initials, isoDate, money, shortDate } from "@/lib/format";
import { siteUrl } from "@/lib/http";
import { quote } from "@/lib/plans";

export const metadata: Metadata = { title: "Registrations" };

export default async function RegistrationsPage() {
  const user = await requireUser();
  const rows = await many(`select r.*, (select status from calls c where c.registration_id = r.id order by c.id desc limit 1) as call_status from registrations r order by r.created_at desc limit 2000`);
  const signup = `${await siteUrl()}/onboarding/account`;
  const back = "/admin/registrations";
  return (
    <AdminShell user={user} active="registrations">
      <PageHeader
        title="Registrations"
        crumbs={crumbsFromDashboard}
        description={`${rows.length} ${rows.length === 1 ? "business" : "businesses"} started onboarding.`}
        actions={<><a className="a-btn a-btn--outline" href="/onboarding/account" target="_blank"><Icon name="external-link" />Open signup form</a><button type="button" className="a-btn a-btn--primary" data-copy={signup}><Icon name="link" /><span data-copy-label="">Copy signup link</span></button></>}
      />
      <TableCard
        id="reg-table"
        exportName="registrations"
        search="Search business, contact, email or ID"
        select
        rows={rows.length}
        noMatch="No registrations match"
        empty={<Empty title="No registrations yet" text="New signups appear here as soon as a client finishes the first onboarding step."><button type="button" className="a-btn a-btn--outline" data-copy={signup}><Icon name="link" /><span data-copy-label="">Copy signup link</span></button></Empty>}
        filters={[
          { key: "status", options: [["draft", "In progress"], ["active", "Active"], ["pending", "Pending documents"], ["failed", "Payment failed"], ["review", "In review"], ["paused", "Paused"], ["cancelled", "Cancelled"]] },
          { key: "plan", options: [["monthly", "Monthly bookkeeping"], ["catchup", "Catch-up bookkeeping"]] },
        ]}
        columns={[{ label: "Business", sticky: true }, { label: "Contact", col: "contact" }, { label: "Plan", col: "plan" }, { label: "Amount", num: true }, { label: "Status" }, { label: "AI call", col: "call" }, { label: "State", col: "state" }, { label: "Signed up" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((r) => {
          const name = r.business_name || `${r.first_name} ${r.last_name}`;
          const q = quote(r.plan, r.catchup_months);
          return (
            <tr data-row="" data-id={r.id} data-status={r.status} data-plan={r.plan ?? ""} key={r.id}>
              <td className="a-table__check"><input className="a-check__input" type="checkbox" data-select-row="" aria-label={`Select ${name}`} /></td>
              <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(name)}</span><div><a href={`/admin/registrations/${r.id}`}>{name}</a><span className="a-table__sub">{r.ref}</span></div></div></td>
              <td data-label="Contact" data-col="contact"><span className="a-table__truncate">{r.first_name} {r.last_name}</span><span className="a-table__sub">{r.email}</span></td>
              <td data-label="Plan" data-col="plan">{q?.name ?? "Not chosen"}<span className="a-table__sub">{q ? (q.recurring ? "Monthly" : "One time") : ""}</span></td>
              <td className="a-table__num" data-label="Amount" data-sort={r.plan_amount_cents ?? 0}>{money(r.plan_amount_cents) || "None"}</td>
              <td data-label="Status"><Status value={r.status} /></td>
              <td data-label="AI call" data-col="call">{r.call_status ? <Status value={r.call_status} /> : "None"}</td>
              <td data-label="State" data-col="state">{r.state ?? ""}</td>
              <td data-label="Signed up" data-sort={isoDate(r.created_at)}>{shortDate(r.created_at)}</td>
              <td className="a-table__actions">
                <RowMenu id={`m-${r.id}`} name={name}>
                  <a className="a-menu__item" role="menuitem" href={`/admin/registrations/${r.id}`}><Icon name="eye" />View details</a>
                  <a className="a-menu__item" role="menuitem" href={`mailto:${r.email}`}><Icon name="mail" />Email client</a>
                  {canEditClients(user) && <ActionForm action="registration.call" back={back} fields={{ id: r.id }} menu><Icon name="phone-call" />Retry AI call</ActionForm>}
                </RowMenu>
              </td>
            </tr>
          );
        })}
      </TableCard>
    </AdminShell>
  );
}
