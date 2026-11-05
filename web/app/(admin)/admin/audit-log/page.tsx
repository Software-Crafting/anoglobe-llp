import type { Metadata } from "next";
import { AdminShell, crumbsFromDashboard, Empty, PageHeader, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { canManage, requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { dateTime, initials, isoDate } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  const user = await requireUser(canManage);
  const rows = await many("select * from audit_log order by created_at desc limit 2000");
  return (
    <AdminShell user={user} active="audit-log">
      <PageHeader title="Audit log" crumbs={crumbsFromDashboard} description="Every change and sign-in." />
      <TableCard
        id="audit-table"
        exportName="audit"
        search="Search activity"
        rows={rows.length}
        noMatch="No activity matches"
        empty={<Empty title="No activity yet" text="Sign-ins and changes are listed here." />}
        columns={[{ label: "Actor", sticky: true }, { label: "Event" }, { label: "IP" }, { label: "Time" }]}
      >
        {rows.map((row) => (
          <tr data-row="" data-id={row.id} key={row.id}>
            <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(row.actor)}</span>{row.actor}</div></td>
            <td data-label="Event"><Icon name={row.icon} /> {row.registration_id ? <a href={`/admin/registrations/${row.registration_id}`}>{row.event}</a> : row.event}</td>
            <td data-label="IP" className="a-mono">{row.ip}</td>
            <td data-label="Time" data-sort={isoDate(row.created_at)}>{dateTime(row.created_at)}</td>
          </tr>
        ))}
      </TableCard>
    </AdminShell>
  );
}
