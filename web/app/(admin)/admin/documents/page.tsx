import type { Metadata } from "next";
import { AdminShell, crumbsFromDashboard, Empty, PageHeader, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { fileSize, isoDate, KINDS, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireUser();
  const rows = await many("select d.*, r.business_name, r.first_name, r.last_name from documents d join registrations r on r.id = d.registration_id order by d.created_at desc limit 2000");
  return (
    <AdminShell user={user} active="documents">
      <PageHeader title="Documents" crumbs={crumbsFromDashboard} description="Files uploaded by clients during onboarding. Encrypted in storage." />
      <TableCard
        id="doc-table"
        exportName="documents"
        search="Search files or businesses"
        select
        rows={rows.length}
        noMatch="No documents match"
        empty={<Empty title="No documents uploaded" text="Clients can upload during onboarding or later from their email link." />}
        filters={[{ key: "kind", options: [["bank-statement", "Bank statement"], ["tax-return", "Tax return"], ["chart-of-accounts", "Chart of accounts"]] }]}
        columns={[{ label: "File", sticky: true }, { label: "Type" }, { label: "Size", num: true }, { label: "Uploaded" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((doc) => (
          <tr data-row="" data-id={doc.id} data-kind={doc.kind} key={doc.id}>
            <td className="a-table__check"><input className="a-check__input" type="checkbox" data-select-row="" aria-label={`Select ${doc.filename}`} /></td>
            <td className="a-table__sticky"><div className="a-table__primary"><Icon name="file-text" /><div><span className="a-table__truncate">{doc.filename}</span><a className="a-table__sub" href={`/admin/registrations/${doc.registration_id}`}>{doc.business_name || `${doc.first_name} ${doc.last_name}`}</a></div></div></td>
            <td data-label="Type">{KINDS[doc.kind]}</td>
            <td className="a-table__num" data-label="Size" data-sort={doc.size_bytes}>{fileSize(Number(doc.size_bytes))}</td>
            <td data-label="Uploaded" data-sort={isoDate(doc.created_at)}>{shortDate(doc.created_at)}</td>
            <td className="a-table__actions"><a className="a-btn a-btn--ghost a-btn--icon a-btn--sm" href={`/api/admin/documents/${doc.id}`} aria-label={`Download ${doc.filename}`} data-tooltip="Download"><Icon name="download" /></a></td>
          </tr>
        ))}
      </TableCard>
    </AdminShell>
  );
}
