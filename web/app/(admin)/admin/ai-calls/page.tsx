import type { Metadata } from "next";
import { ActionForm, AdminShell, crumbsFromDashboard, Empty, PageHeader, Status, TableCard } from "@/components/admin-ui";
import { Icon } from "@/components/ui";
import { canEditClients, canManage, requireUser } from "@/lib/auth";
import { many, one } from "@/lib/db";
import { dateTime, duration, initials, isoDate, shortDate, TRIGGERS } from "@/lib/format";

export const metadata: Metadata = { title: "AI calls" };

export default async function CallsPage() {
  const user = await requireUser();
  const [rows, stats] = await Promise.all([
    many("select c.*, r.business_name, r.first_name, r.last_name from calls c left join registrations r on r.id = c.registration_id order by c.created_at desc limit 2000"),
    one<{ total: number; answered: number; avg: number; ringing: number; queued: number }>(
      `select count(*)::int as total, count(*) filter (where status = 'answered')::int as answered, coalesce(avg(duration_s) filter (where status = 'answered'), 0)::int as avg,
        count(*) filter (where status = 'ringing')::int as ringing, count(*) filter (where status = 'queued')::int as queued from calls where created_at >= date_trunc('month', now())`,
    ),
  ]);
  const back = "/admin/ai-calls";
  const answeredShare = stats?.total ? Math.round((stats.answered / stats.total) * 100) : 0;
  return (
    <AdminShell user={user} active="ai-calls">
      <PageHeader
        title="AI calls"
        crumbs={crumbsFromDashboard}
        description="Calls for after signup and payment. No calling provider is connected yet, so new calls wait in the queue."
        actions={canManage(user) && <button type="button" className="a-btn a-btn--outline" data-dialog-open="dlg-test"><Icon name="phone-call" />Place test call</button>}
      />
      <div className="a-stat-grid">
        <div className="a-stat"><p className="a-stat__label"><Icon name="phone-call" />Calls this month</p><p className="a-stat__value">{stats?.total ?? 0}</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="check-circle" />Answered</p><p className="a-stat__value">{answeredShare}%</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="clock" />Average length</p><p className="a-stat__value">{duration(stats?.avg ?? 0)}</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="phone-call" />Waiting</p><p className="a-stat__value">{(stats?.queued ?? 0) + (stats?.ringing ?? 0)}</p></div>
      </div>
      <TableCard
        id="call-table"
        exportName="calls"
        search="Search calls"
        rows={rows.length}
        noMatch="No calls match"
        empty={<Empty title="No calls yet" text="Calls start after a client signs up or pays." />}
        filters={[{ key: "status", options: [["answered", "Answered"], ["queued", "Queued"], ["ringing", "Ringing"], ["noanswer", "No answer"], ["failed", "Failed"]] }]}
        columns={[{ label: "Business", sticky: true }, { label: "Status" }, { label: "Trigger" }, { label: "Duration", num: true }, { label: "Phone", col: "phone" }, { label: "Date" }, { label: "Actions", noSort: true }]}
      >
        {rows.map((call) => {
          const name = call.registration_id ? call.business_name || `${call.first_name} ${call.last_name}` : "Test call";
          return (
            <tr data-row="" data-id={call.id} data-status={call.status} key={call.id}>
              <td className="a-table__sticky"><div className="a-table__primary"><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(name)}</span><div>{call.registration_id ? <a href={`/admin/registrations/${call.registration_id}`}>{name}</a> : name}<span className="a-table__sub">{call.ref}</span></div></div></td>
              <td data-label="Status"><Status value={call.status} /></td>
              <td data-label="Trigger">{TRIGGERS[call.trigger] ?? call.trigger}</td>
              <td className="a-table__num" data-label="Duration" data-sort={call.duration_s ?? 0}>{duration(call.duration_s) || "None"}</td>
              <td data-label="Phone" data-col="phone">{call.phone}</td>
              <td data-label="Date" data-sort={isoDate(call.created_at)}>{shortDate(call.created_at)}</td>
              <td className="a-table__actions">
                <div className="a-btn-row">
                  {call.summary && <button type="button" className="a-btn a-btn--ghost a-btn--sm" data-dialog-open={`call-${call.id}`}>Summary</button>}
                  {canEditClients(user) && <ActionForm action="call.retry" back={back} fields={{ id: call.id }} className="a-btn a-btn--ghost a-btn--icon a-btn--sm"><span className="a-visually-hidden">Retry call to {name}</span><Icon name="phone-call" /></ActionForm>}
                </div>
                {call.summary && (
                  <dialog className="a-dialog a-sheet a-sheet--right" id={`call-${call.id}`} aria-labelledby={`call-${call.id}-title`}>
                    <div className="a-dialog__header"><div><h2 className="a-dialog__title" id={`call-${call.id}-title`}>Transcript summary</h2><p className="a-dialog__description">{name}, {dateTime(call.created_at)}{call.duration_s != null ? `, ${duration(call.duration_s)}` : ""}</p></div><button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button></div>
                    <div className="a-dialog__body">
                      <dl className="a-dl"><dt>Outcome</dt><dd><Status value={call.status} /></dd><dt>Provider call ID</dt><dd className="a-mono">{call.provider_id ?? "None"}</dd><dt>Summary</dt><dd>{call.summary}</dd><dt>Sentiment</dt><dd>{call.sentiment ?? "None"}</dd><dt>Next step</dt><dd>{call.next_step ?? "None"}</dd></dl>
                      <p className="a-small a-muted">The agent, script and voice belong to the AI calling provider. Anoglobe stores only the status and summary returned by its API.</p>
                    </div>
                    <div className="a-dialog__footer"><button type="button" className="a-btn a-btn--ghost" data-dialog-close="">Done</button></div>
                  </dialog>
                )}
              </td>
            </tr>
          );
        })}
      </TableCard>
      {canManage(user) && (
        <dialog className="a-dialog" id="dlg-test" aria-labelledby="dlg-test-title">
          <form method="post" action="/api/admin" style={{ display: "contents" }}>
            <input type="hidden" name="_action" value="call.test" /><input type="hidden" name="_back" value={back} />
            <div className="a-dialog__header"><h2 className="a-dialog__title" id="dlg-test-title">Place a test call</h2><button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button></div>
            <div className="a-dialog__body"><div className="a-field"><label className="a-label" htmlFor="test-phone">Phone</label><input className="a-input" id="test-phone" name="phone" type="tel" data-mask="phone" placeholder="(415) 555-0132" required /></div></div>
            <div className="a-dialog__footer"><button type="button" className="a-btn a-btn--ghost" data-dialog-close="">Cancel</button><button type="submit" className="a-btn a-btn--primary">Queue test call</button></div>
          </form>
        </dialog>
      )}
    </AdminShell>
  );
}
