import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell, Empty, PageHeader, Status } from "@/components/admin-ui";
import { DesignJs } from "@/components/design-js";
import { Icon } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { many, one, type Row } from "@/lib/db";
import { easternTime, initials, money, shortDate } from "@/lib/format";
import { quote } from "@/lib/plans";

export const metadata: Metadata = { title: "Dashboard" };

const pad = (n: number) => String(n).padStart(2, "0");

/** The typed range, or this month, in Eastern Time. */
function parseRange(from?: string, to?: string): { start: Date; end: Date; fromText: string; toText: string } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstText = `${pad(now.getMonth() + 1)}/01/${now.getFullYear()}`;
  const lastText = `${pad(now.getMonth() + 1)}/${pad(monthEnd)}/${now.getFullYear()}`;
  const start = from ? easternTime(from, "00:00") : null;
  const end = to ? easternTime(to, "23:59") : null;
  return { start: start ?? easternTime(firstText, "00:00")!, end: end ?? easternTime(lastText, "23:59")!, fromText: start ? from! : firstText, toText: end ? to! : lastText };
}

function Skeleton() {
  return (
    <div className="a-stat-grid" role="status" aria-busy="true" aria-label="Loading key figures">
      {[1, 2, 3, 4, 5].map((n) => <div className="a-stat" key={n}><span className="a-skeleton a-skeleton--short" /><span className="a-skeleton" /></div>)}
    </div>
  );
}

async function Figures({ start, end }: { start: Date; end: Date }) {
  const span = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - span);
  const [signups, previous, subs, oneTime, failed, months, regs, pays, callStats] = await Promise.all([
    one<{ n: number }>("select count(*)::int as n from registrations where status <> 'draft' and created_at between $1 and $2", [start, end]),
    one<{ n: number }>("select count(*)::int as n from registrations where status <> 'draft' and created_at between $1 and $2", [previousStart, start]),
    one<{ n: number; mrr: number }>("select count(*)::int as n, coalesce(sum(amount_cents), 0)::int as mrr from subscriptions where status = 'active'"),
    one<{ cents: number }>("select coalesce(sum(amount_cents), 0)::int as cents from payments where kind = 'one-time' and status = 'succeeded' and created_at between $1 and $2", [start, end]),
    one<{ n: number }>("select count(*)::int as n from payments where status = 'failed' and created_at between $1 and $2", [start, end]),
    many<{ label: string; signups: number; recurring: number; onetime: number }>(
      `select to_char(m, 'Mon') as label,
        (select count(*)::int from registrations r where r.status <> 'draft' and date_trunc('month', r.created_at) = m) as signups,
        (select coalesce(sum(amount_cents), 0)::int from payments p where p.status = 'succeeded' and p.kind = 'recurring' and date_trunc('month', p.created_at) = m) as recurring,
        (select coalesce(sum(amount_cents), 0)::int from payments p where p.status = 'succeeded' and p.kind = 'one-time' and date_trunc('month', p.created_at) = m) as onetime
       from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m order by m`,
    ),
    many("select id, business_name, first_name, last_name, plan, catchup_months, state, status from registrations order by created_at desc limit 6"),
    many("select p.id, p.kind, p.amount_cents, p.status, p.created_at, r.business_name from payments p join registrations r on r.id = p.registration_id order by p.created_at desc limit 6"),
    many<{ status: string; n: number }>("select status, count(*)::int as n from calls where created_at between $1 and $2 group by status", [start, end]),
  ]);

  const labels = JSON.stringify(months.map((m) => m.label));
  const signupSeries = months.map((m) => m.signups);
  const revenue = months.map((m) => (m.recurring + m.onetime) / 100);
  const callCount = (status: string) => callStats.find((row) => row.status === status)?.n ?? 0;
  const delta = previous?.n ? Math.round((((signups?.n ?? 0) - previous.n) / previous.n) * 100) : null;
  const callTotal = callStats.reduce((sum, row) => sum + row.n, 0);

  const planLabel = (r: Row) => [quote(r.plan, r.catchup_months)?.name ?? "No plan yet", r.state].filter(Boolean).join(", ");

  return (
    <>
      <div className="a-stat-grid">
        <div className="a-stat"><p className="a-stat__label"><Icon name="users" />New signups</p><p className="a-stat__value">{signups?.n ?? 0}</p><svg className="a-sparkline" data-sparkline={JSON.stringify(signupSeries)} aria-hidden="true" />{delta !== null && <p className="a-stat__meta"><span className={`a-badge a-badge--${delta >= 0 ? "success" : "destructive"}`}><Icon name={delta >= 0 ? "trending-up" : "trending-down"} />{delta >= 0 ? "+" : ""}{delta}%</span>vs previous period</p>}</div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="recurring-payment" />Active subscriptions</p><p className="a-stat__value">{subs?.n ?? 0}</p></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="dollar-circle" />Monthly recurring revenue</p><p className="a-stat__value">{money(subs?.mrr ?? 0).replace(".00", "")}</p><svg className="a-sparkline" data-sparkline={JSON.stringify(months.map((m) => m.recurring / 100))} aria-hidden="true" /></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="briefcase" />One-time revenue</p><p className="a-stat__value">{money(oneTime?.cents ?? 0).replace(".00", "")}</p><svg className="a-sparkline" data-sparkline={JSON.stringify(months.map((m) => m.onetime / 100))} aria-hidden="true" /></div>
        <div className="a-stat"><p className="a-stat__label"><Icon name="x-circle" />Failed payments</p><p className="a-stat__value">{failed?.n ?? 0}</p></div>
      </div>

      <div className="a-admin-grid a-admin-grid--2">
        <figure className="a-chart a-card a-card__content" id="chart-signups" data-chart="line" data-labels={labels} data-series={JSON.stringify([{ name: "Signups", values: signupSeries }])}>
          <div className="a-chart__head"><figcaption><p className="a-chart__title">New signups</p><p className="a-chart__subtitle">Completed onboarding, by month</p></figcaption></div>
          <div className="a-chart__plot" />
        </figure>
        <figure className="a-chart a-card a-card__content" id="chart-revenue" data-chart="bar" data-format="currency" data-labels={labels} data-series={JSON.stringify([{ name: "Recurring", values: months.map((m) => m.recurring / 100) }, { name: "One-time", values: months.map((m) => m.onetime / 100) }])}>
          <div className="a-chart__head"><figcaption><p className="a-chart__title">Revenue</p><p className="a-chart__subtitle">USD, by month, {money(Math.round(revenue.reduce((a, b) => a + b, 0) * 100))} in total</p></figcaption></div>
          <div className="a-chart__plot" />
        </figure>
      </div>

      <div className="a-admin-grid a-admin-grid--2">
        <section className="a-card" aria-labelledby="recent-reg">
          <div className="a-card__header"><h2 className="a-card__title" id="recent-reg">Recent registrations</h2><a className="a-btn a-btn--link a-btn--sm" href="/admin/registrations">View all</a></div>
          <div className="a-card__content">
            {regs.length === 0 ? <Empty title="No registrations yet" text="New signups appear here as soon as a client finishes the first onboarding step." /> : (
              <ul className="a-feed" role="list">
                {regs.map((r) => {
                  const name = r.business_name || `${r.first_name} ${r.last_name}`;
                  return <li className="a-feed__item" key={r.id}><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(name)}</span><div className="a-feed__text"><p><a href={`/admin/registrations/${r.id}`}>{name}</a></p><p className="a-feed__meta">{planLabel(r)}</p></div><span><Status value={r.status} /></span></li>;
                })}
              </ul>
            )}
          </div>
        </section>
        <section className="a-card" aria-labelledby="recent-pay">
          <div className="a-card__header"><h2 className="a-card__title" id="recent-pay">Recent payments</h2><a className="a-btn a-btn--link a-btn--sm" href="/admin/payments">View all</a></div>
          <div className="a-card__content">
            {pays.length === 0 ? <Empty title="No payments yet" text="Payments appear here after the first client pays." /> : (
              <ul className="a-feed" role="list">
                {pays.map((p) => <li className="a-feed__item" key={p.id}><span className="a-avatar a-avatar--sm a-avatar--neutral" aria-hidden="true"><Icon name="credit-card" className="a-icon--16" /></span><div className="a-feed__text"><p><a href={`/admin/payments/${p.id}`}>{p.business_name}</a></p><p className="a-feed__meta">{p.kind === "recurring" ? "Recurring" : "One-time"}, {shortDate(p.created_at)}</p></div><span className="a-feed__end"><span className="a-tabular">{money(p.amount_cents)}</span><Status value={p.status} /></span></li>)}
              </ul>
            )}
          </div>
        </section>
      </div>

      {callTotal > 0 && (
        <div className="a-admin-grid"><figure className="a-chart a-card a-card__content" id="chart-calls" data-chart="donut" data-center-label="calls" data-series={JSON.stringify([{ name: "Answered", value: callCount("answered") }, { name: "No answer", value: callCount("noanswer") }, { name: "Failed", value: callCount("failed") }, { name: "Queued", value: callCount("queued") + callCount("ringing") }])}>
          <div className="a-chart__head"><figcaption><p className="a-chart__title">AI call outcomes</p><p className="a-chart__subtitle">{shortDate(start)} to {shortDate(end)}</p></figcaption><a className="a-btn a-btn--link a-btn--sm" href="/admin/ai-calls">View calls</a></div>
          <div className="a-chart__plot" />
        </figure></div>
      )}
      <DesignJs />
    </>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser();
  const { from, to } = await searchParams;
  const { start, end, fromText, toText } = parseRange(from, to);
  return (
    <AdminShell user={user} active="dashboard" streamed>
      <PageHeader
        title="Dashboard"
        description={`Signups, billing and AI calls from ${shortDate(start)} to ${shortDate(end)}.`}
        actions={
          <form method="get" className="a-btn-row">
            <div className="a-datepicker" data-datepicker="range" data-icons="chevron-left chevron-right chevron-down">
              <div className="a-input-group">
                <input className="a-input" type="text" inputMode="numeric" data-mask="date" placeholder="MM/DD/YYYY" aria-label="Start date" name="from" defaultValue={fromText} />
                <span className="a-input-group__sep" aria-hidden="true">to</span>
                <input className="a-input" type="text" inputMode="numeric" data-mask="date" placeholder="MM/DD/YYYY" aria-label="End date" name="to" defaultValue={toText} />
                <button type="button" className="a-input-group__action" data-datepicker-open="" aria-haspopup="dialog" aria-expanded="false" aria-label="Choose date range"><Icon name="calendar" /></button>
              </div>
            </div>
            <button type="submit" className="a-btn a-btn--outline">Apply</button>
          </form>
        }
      />
      <Suspense fallback={<Skeleton />}><Figures start={start} end={end} /></Suspense>
    </AdminShell>
  );
}
