import type { Metadata } from "next";
import { AdminShell, crumbsFromDashboard, Empty, PageHeader, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { initials, isoDate, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const user = await requireUser();
  const rows = await many("select * from leads order by created_at desc limit 2000");
  return (
    <AdminShell user={user} active="leads">
      <PageHeader title="Leads" crumbs={crumbsFromDashboard} description="People who filled in “Ready to Work With Us?” on the home page." />
      <TableCard
        id="lead-table"
        exportName="leads"
        search="Search name, email or phone"
        select
        rows={rows.length}
        noMatch="No leads match"
        empty={<Empty title="No leads yet" text="The home page form saves here." />}
        columns={[{ label: "Name", sticky: true }, { label: "Email" }, { label: "Phone" }, { label: "Received" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((lead) => {
          const name = `${lead.first_name} ${lead.last_name}`;
          return (
            <tr data-row="" data-id={lead.id} key={lead.id}>
              <td className="a-table__check"><input className="a-check__input" type="checkbox" data-select-row="" aria-label={`Select ${name}`} /></td>
              <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(name)}</span>{name}</div></td>
              <td data-label="Email"><a href={`mailto:${lead.email}`}>{lead.email}</a></td>
              <td data-label="Phone"><a href={`tel:${lead.phone.replace(/\D/g, "")}`}>{lead.phone}</a></td>
              <td data-label="Received" data-sort={isoDate(lead.created_at)}>{shortDate(lead.created_at)}</td>
              <td className="a-table__actions"><a className="a-btn a-btn--ghost a-btn--icon a-btn--sm" href={`mailto:${lead.email}`} aria-label={`Email ${name}`} data-tooltip="Email"><Icon name="mail" /></a></td>
            </tr>
          );
        })}
      </TableCard>
    </AdminShell>
  );
}
