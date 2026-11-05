import { canManage, currentUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { audit } from "@/lib/events";
import { clientIp, seeOther } from "@/lib/http";

// Fixed queries; the table name only ever selects one of these. The owner's and admin's lists stay with them.
const EXPORTS: Record<string, { sql: string; manage?: boolean }> = {
  registrations: { sql: "select id, ref, business_name, first_name, last_name, email, phone, state, plan, plan_amount_cents / 100.0 as amount, status, created_at from registrations" },
  payments: { manage: true, sql: "select p.id, p.ref, r.business_name, p.kind, p.amount_cents / 100.0 as amount, p.status, p.brand, p.last4, p.gateway, p.created_at from payments p join registrations r on r.id = p.registration_id" },
  subscriptions: { manage: true, sql: "select s.id, r.business_name, s.plan, s.amount_cents / 100.0 as amount, s.status, s.next_charge_at from subscriptions s join registrations r on r.id = s.registration_id" },
  documents: { sql: "select d.id, d.filename, d.kind, r.business_name, d.size_bytes, d.created_at from documents d join registrations r on r.id = d.registration_id" },
  calls: { sql: "select c.id, c.ref, r.business_name, c.status, c.trigger, c.duration_s, c.phone, c.created_at from calls c left join registrations r on r.id = c.registration_id" },
  emails: { sql: "select e.id, e.template, e.to_email, r.business_name, e.status, e.created_at from emails e left join registrations r on r.id = e.registration_id" },
  leads: { sql: "select id, first_name, last_name, email, phone, created_at from leads" },
  audit: { manage: true, sql: "select id, actor, event, ip, created_at from audit_log" },
  team: { manage: true, sql: "select id, name, email, role, status, last_active_at from admin_users" },
};

function cell(value: unknown): string {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  // Spreadsheet apps run cells that start like a formula; a leading quote keeps them as text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return seeOther("/admin/login");
  const url = new URL(req.url);
  const name = url.searchParams.get("table") ?? "";
  const source = EXPORTS[name];
  if (!source) return new Response("Unknown export", { status: 404 });
  if (source.manage && !canManage(user)) return seeOther("/admin/permission-denied");

  const ids = (url.searchParams.get("ids") ?? "").split(",").filter((id) => /^\d+$/.test(id));
  const alias = source.sql.match(/from \w+ (\w)\b/)?.[1];
  const column = alias && !["join", "left"].includes(alias) ? `${alias}.id` : "id";
  const rows = await many(`${source.sql}${ids.length ? ` where ${column} = any($1::bigint[])` : ""} limit 50000`, ids.length ? [ids] : []);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const csv = [headers.map(cell).join(","), ...rows.map((row) => headers.map((key) => cell(row[key])).join(","))].join("\r\n");
  await audit(user.name, `exported ${rows.length} ${name} rows`, { icon: "download", ip: await clientIp() });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="anoglobe-${name}.csv"` } });
}
