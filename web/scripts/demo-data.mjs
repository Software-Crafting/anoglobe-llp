// Sample clients for previewing the admin. Uses the design system's made-up names.
// npm run demo:seed adds them; npm run demo:clear removes them. Never run the seed on a live client database.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query("delete from registrations where is_demo");
await client.query("delete from leads where is_demo");
await client.query("delete from audit_log where actor = 'Demo data'");

if (process.argv.includes("--clear")) {
  await client.end();
  console.log("Demo data removed.");
  process.exit(0);
}

const SAMPLES = [
  ["Harbor Lane Dental, LLC", "Maria", "Robles", "TX", "active", "monthly", 2, "answered"],
  ["Northwind Logistics Inc.", "Daniel", "Okafor", "IL", "active", "monthly", 3, "answered"],
  ["Bright Path Tutoring", "Asha", "Menon", "NJ", "failed", "monthly", 4, "noanswer"],
  ["Cedar & Pine Studio", "Ruth", "Abernathy", "OR", "review", "catchup", 6, "answered"],
  ["Summit Ridge Roofing Co.", "Liam", "Hart", "CO", "active", "monthly", 9, "answered"],
  ["Little Fern Bakery", "Nora", "Quinn", "CA", "pending", "monthly", 12, "queued"],
  ["Wildflower Yoga Collective", "Ines", "Silva", "WA", "active", "monthly", 20, "answered"],
  ["Bluewater Charters", "Sam", "Reyes", "FL", "paused", "monthly", 35, "failed"],
  ["Second Story Books", "Theo", "Park", "NY", "active", "catchup", 50, "answered"],
  ["Granite Peak Consulting", "Priya", "Shah", "UT", "active", "monthly", 80, "answered"],
  ["Lantern Street Cafe", "Omar", "Haddad", "MI", "active", "monthly", 110, "noanswer"],
  ["Copperline Electric", "Greta", "Lund", "MN", "draft", null, 1, null],
];

const ago = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

for (const [business, first, last, state, status, plan, days, call] of SAMPLES) {
  const amount = plan === "monthly" ? 27000 : plan === "catchup" ? 66000 : null;
  const email = `${first.toLowerCase()}@${business.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.example`;
  const phone = `(512) 555-01${String(10 + days).slice(-2)}`;
  const data = { "first-name": first, "last-name": last, email, phone, role: "owner", "legal-name": business, entity: "llc-single", industry: "Other", "biz-line1": "100 Sample Rd", "biz-city": "Sampleville", "biz-state": state, "biz-zip": "78704", services: ["monthly"], software: "QuickBooks Online", volume: "250", accounts: "3", "start-date": "12/01/2026", team: "2-10" };
  const { rows: [reg] } = await client.query(
    "insert into registrations (status, step, first_name, last_name, email, phone, role, business_name, state, plan, plan_amount_cents, catchup_months, data, is_demo, created_at, terms_at) values ($1, 'payment', $2, $3, $4, $5, 'owner', $6, $7, $8, $9, $10, $11, true, $12, $12) returning id",
    [status, first, last, email, phone, business, state, plan, amount, plan === "catchup" ? 3 : null, JSON.stringify(data), ago(days)],
  );
  if (plan) {
    const failed = status === "failed";
    await client.query(
      "insert into payments (registration_id, kind, description, amount_cents, status, brand, last4, exp, gateway, gateway_id, failure_reason, auth_text, auth_by, auth_at, auth_ip, created_at) values ($1, $2, $3, $4, $5, 'Visa', $6, '08/29', 'test', 'test_demo', $7, 'I authorize Anoglobe LLP to charge this amount.', $8, $9, '203.0.113.48', $9)",
      [reg.id, plan === "monthly" ? "recurring" : "one-time", plan === "monthly" ? "Monthly bookkeeping" : "Catch-up bookkeeping", amount, failed ? "failed" : "succeeded", failed ? "0002" : "4242", failed ? "card declined" : null, `${first} ${last}`, ago(days)],
    );
    if (plan === "monthly" && !failed) {
      await client.query("insert into subscriptions (registration_id, plan, amount_cents, status, next_charge_at, created_at) values ($1, 'Monthly bookkeeping', 27000, $2, $3, $4)", [reg.id, status === "paused" ? "paused" : "active", new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), ago(days)]);
    }
  }
  if (call) {
    await client.query("insert into calls (registration_id, trigger, phone, status, duration_s, provider_id, summary, sentiment, next_step, created_at) values ($1, 'payment', $2, $3, $4, $5, $6, $7, $8, $9)", [
      reg.id, phone, call, call === "answered" ? 240 : null, call === "answered" ? "demo_call" : null,
      call === "answered" ? "Confirmed QuickBooks Online access and 3 accounts. Will upload two statements this week." : null,
      call === "answered" ? "Positive" : null, call === "answered" ? "Bookkeeper intro" : null, ago(days),
    ]);
  }
  await client.query("insert into emails (registration_id, template, to_email, subject, html, status, error, created_at) values ($1, 'signup-confirmation', $2, 'Your Anoglobe signup is complete', '<p>Sample email.</p>', 'not_sent', 'Demo data', $3)", [reg.id, email, ago(days)]);
  await client.query("insert into notes (registration_id, author, body, created_at) values ($1, 'Demo data', 'Prefers Thursday afternoon check-ins.', $2)", [reg.id, ago(days)]);
  await client.query("insert into audit_log (actor, registration_id, event, icon, ip, created_at) values ('Demo data', $1, $2, 'user', '203.0.113.20', $3)", [reg.id, `sample signup for ${business}`, ago(days)]);
}
await client.query("insert into leads (first_name, last_name, email, phone, is_demo) values ('Tessa', 'Monroe', 'tessa@sample.example', '(415) 555-0110', true), ('Reid', 'Lawson', 'reid@sample.example', '(415) 555-0111', true)");
await client.end();
console.log(`Added ${SAMPLES.length} sample clients and 2 leads.`);
