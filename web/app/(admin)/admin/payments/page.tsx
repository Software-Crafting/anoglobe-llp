import type { Metadata } from "next";
import { AdminShell, crumbsFromDashboard, Empty, PageHeader, RowMenu, Status, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { many, one } from "@/lib/db";
import { initials, isoDate, money, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await requireUser();
  const [rows, totals] = await Promise.all([
    many("select p.*, r.business_name, r.first_name, r.last_name from payments p join registrations r on r.id = p.registration_id order by p.created_at desc limit 2000"),
    one<{ collected: number; recurring: number; onetime: number; failed: number }>(
      `select coalesce(sum(amount_cents) filter (where status = 'succeeded'), 0)::int as collected,
        coalesce(sum(amount_cents) filter (where status = 'succeeded' and kind = 'recurring'), 0)::int as recurring,
        coalesce(sum(amount_cents) filter (where status = 'succeeded' and kind = 'one-time'), 0)::int as onetime,
        count(*) filter (where status = 'failed')::int as failed
       from payments where created_at >= date_trunc('month', now())`,
    ),
  ]);
  const testMode = process.env.PAYMENTS_MODE === "test";
  return (
    <AdminShell user={user} active="payments">
      <PageHeader title="Payments" crumbs={crumbsFromDashboard} description={testMode ? "Test mode. No real charges are made until Stripe keys are added." : "Card payments."} />
      <div className="a-stat-grid">
        <div className="a-stat"><p className="a-stat__label"><Icon name="dollar-circle" />Collected this month</p><p className="a-stat__value">{money(totals?.collected ?? 0)}</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="recurring-payment" />Recurring</p><p className="a-stat__value">{money(totals?.recurring ?? 0)}</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="briefcase" />One-time</p><p className="a-stat__value">{money(totals?.onetime ?? 0)}</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="x-circle" />Failed</p><p className="a-stat__value">{totals?.failed ?? 0}</p></div>
      </div>
      <TableCard
        id="pay-table"
        exportName="payments"
        search="Search business or payment ID"
        select
        rows={rows.length}
        noMatch="No payments match"
        empty={<Empty title="No payments yet" text={`Payments appear here after the first client pays.${testMode ? " The gateway is in test mode." : ""}`} />}
        filters={[
          { key: "status", options: [["succeeded", "Succeeded"], ["failed", "Failed"], ["refunded", "Refunded"], ["pending", "Pending"]] },
          { key: "kind", options: [["recurring", "Recurring"], ["one-time", "One-time"]] },
        ]}
        columns={[{ label: "Business", sticky: true }, { label: "Amount", num: true }, { label: "Type" }, { label: "Status" }, { label: "Method", col: "method" }, { label: "Date" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((p) => {
          const name = p.business_name || `${p.first_name} ${p.last_name}`;
          return (
            <tr data-row="" data-id={p.id} data-status={p.status} data-kind={p.kind} key={p.id}>
              <td className="a-table__check"><input className="a-check__input" type="checkbox" data-select-row="" aria-label={`Select ${p.ref}`} /></td>
              <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(name)}</span><div><a href={`/admin/payments/${p.id}`}>{name}</a><span className="a-table__sub">{p.ref}</span></div></div></td>
              <td className="a-table__num" data-label="Amount" data-sort={p.amount_cents}>{money(p.amount_cents)}</td>
              <td data-label="Type">{p.kind === "recurring" ? "Recurring" : "One-time"}</td>
              <td data-label="Status"><Status value={p.status} /></td>
              <td data-label="Method" data-col="method">{p.brand} {p.last4}</td>
              <td data-label="Date" data-sort={isoDate(p.created_at)}>{shortDate(p.created_at)}</td>
              <td className="a-table__actions"><RowMenu id={`m-${p.id}`} name={p.ref}><a className="a-menu__item" role="menuitem" href={`/admin/payments/${p.id}`}><Icon name="eye" />View payment</a><a className="a-menu__item" role="menuitem" href={`/admin/registrations/${p.registration_id}`}><Icon name="user" />View client</a></RowMenu></td>
            </tr>
          );
        })}
      </TableCard>
    </AdminShell>
  );
}
