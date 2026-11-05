import type { Metadata } from "next";
import { ActionForm, AdminShell, crumbsFromDashboard, Empty, PageHeader, RowMenu, Status, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { canManage, requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { initials, isoDate, money, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const rows = await many("select s.*, r.business_name, r.first_name, r.last_name, r.ref from subscriptions s join registrations r on r.id = s.registration_id order by s.created_at desc limit 2000");
  const back = "/admin/subscriptions";
  return (
    <AdminShell user={user} active="subscriptions">
      <PageHeader title="Subscriptions" crumbs={crumbsFromDashboard} description="Monthly plans. Automatic renewal charges start once Stripe is connected." />
      <TableCard
        id="sub-table"
        exportName="subscriptions"
        search="Search subscriptions"
        select
        rows={rows.length}
        noMatch="No subscriptions match"
        empty={<Empty title="No subscriptions yet" text="A subscription starts when a client pays for monthly bookkeeping." />}
        filters={[{ key: "status", options: [["active", "Active"], ["paused", "Paused"], ["failed", "Past due"], ["cancelled", "Cancelled"]] }]}
        columns={[{ label: "Business", sticky: true }, { label: "Plan" }, { label: "Amount", num: true }, { label: "Status" }, { label: "Next charge" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((s) => {
          const name = s.business_name || `${s.first_name} ${s.last_name}`;
          return (
            <tr data-row="" data-id={s.id} data-status={s.status} key={s.id}>
              <td className="a-table__check"><input className="a-check__input" type="checkbox" data-select-row="" aria-label={`Select ${name}`} /></td>
              <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(name)}</span><div><a href={`/admin/registrations/${s.registration_id}`}>{name}</a><span className="a-table__sub">{s.ref}</span></div></div></td>
              <td data-label="Plan">{s.plan}</td>
              <td className="a-table__num" data-label="Amount" data-sort={s.amount_cents}>{money(s.amount_cents)}</td>
              <td data-label="Status"><Status value={s.status} /></td>
              <td data-label="Next charge" data-sort={isoDate(s.next_charge_at)}>{shortDate(s.next_charge_at) || "None"}</td>
              <td className="a-table__actions">
                {canManage(user) && s.status !== "cancelled" && (
                  <RowMenu id={`m-${s.id}`} name={name}>
                    {s.status === "active"
                      ? <ActionForm action="subscription.status" back={back} fields={{ id: s.id, status: "paused" }} menu><Icon name="paused" />Pause billing</ActionForm>
                      : <ActionForm action="subscription.status" back={back} fields={{ id: s.id, status: "active" }} menu><Icon name="play" />Resume billing</ActionForm>}
                    <ActionForm action="subscription.status" back={back} fields={{ id: s.id, status: "cancelled" }} menu confirm={`Cancel the subscription for ${name}? This cannot be undone.`}><Icon name="x-circle" />Cancel subscription</ActionForm>
                  </RowMenu>
                )}
              </td>
            </tr>
          );
        })}
      </TableCard>
    </AdminShell>
  );
}
