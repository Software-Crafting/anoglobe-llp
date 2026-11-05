import type { Metadata } from "next";
import { ActionForm, AdminShell, crumbsFromDashboard, Empty, PageHeader, RowMenu, Status, TableCard } from "@/components/admin-ui";
import { SelectField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { canManage, requireUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { initials, isoDate, ROLES, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requireUser(canManage);
  const rows = await many("select * from admin_users order by status = 'active' desc, name");
  const back = "/admin/team";
  return (
    <AdminShell user={user} active="team">
      <PageHeader title="Team" crumbs={crumbsFromDashboard} description="People who can sign in to the admin panel." actions={<button type="button" className="a-btn a-btn--primary" data-dialog-open="dlg-invite"><Icon name="plus" />Invite member</button>} />
      <TableCard
        id="team-table"
        exportName="team"
        search="Search team"
        rows={rows.length}
        noMatch="No team members match"
        empty={<Empty title="No team members" text="Invite someone to get started." />}
        columns={[{ label: "Name", sticky: true }, { label: "Role" }, { label: "Status" }, { label: "Last active" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((member) => (
          <tr data-row="" data-id={member.id} data-status={member.status} key={member.id}>
            <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(member.name)}</span><div>{member.name}<span className="a-table__sub">{member.email}</span></div></div></td>
            <td data-label="Role">{ROLES[member.role]}</td>
            <td data-label="Status"><Status value={member.status} /></td>
            <td data-label="Last active" data-sort={isoDate(member.last_active_at)}>{shortDate(member.last_active_at) || "Never"}</td>
            <td className="a-table__actions">
              {member.role !== "owner" && String(member.id) !== String(user.id) && member.status !== "disabled" && (
                <RowMenu id={`m-${member.id}`} name={member.name}>
                  {["admin", "bookkeeper", "viewer"].filter((role) => role !== member.role).map((role) => <ActionForm action="team.role" back={back} fields={{ id: member.id, role }} menu key={role}><Icon name="users" />Make {ROLES[role]}</ActionForm>)}
                  <ActionForm action="team.remove" back={back} fields={{ id: member.id }} menu confirm={`Remove access for ${member.name}?`}><Icon name="trash" />Remove access</ActionForm>
                </RowMenu>
              )}
            </td>
          </tr>
        ))}
      </TableCard>
      <dialog className="a-dialog a-dialog--select" id="dlg-invite" aria-labelledby="dlg-invite-title">
        <form method="post" action="/api/admin" style={{ display: "contents" }}>
          <input type="hidden" name="_action" value="team.invite" /><input type="hidden" name="_back" value={back} />
          <div className="a-dialog__header"><h2 className="a-dialog__title" id="dlg-invite-title">Invite a team member</h2><button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button></div>
          <div className="a-dialog__body a-form-grid">
            <div className="a-field"><label className="a-label" htmlFor="invite-name">Name</label><input className="a-input" id="invite-name" name="name" type="text" required /></div>
            <div className="a-field"><label className="a-label" htmlFor="invite-email">Work email</label><input className="a-input" id="invite-email" name="email" type="email" required placeholder="name@anoglobebookkeeping.com" /></div>
            <SelectField name="role" label="Role" required placeholder="Choose a role" options={[["admin", "Admin, full access"], ["bookkeeper", "Bookkeeper, clients and documents"], ["viewer", "Viewer, read only"]]} />
          </div>
          <div className="a-dialog__footer"><button type="button" className="a-btn a-btn--ghost" data-dialog-close="">Cancel</button><button type="submit" className="a-btn a-btn--primary">Send invite</button></div>
        </form>
      </dialog>
    </AdminShell>
  );
}
