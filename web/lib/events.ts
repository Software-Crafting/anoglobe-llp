// What happens after a signup or payment: audit trail, emails, AI call queue.
import { many, one, pool, type Row } from "./db";
import { money, shortDate } from "./format";
import { renderTemplate, sendEmail } from "./mail";
import { quote } from "./plans";
import { getSettings } from "./settings";

export async function audit(actor: string, event: string, opts: { registrationId?: number | string | null; icon?: string; ip?: string } = {}) {
  await pool.query("insert into audit_log (actor, registration_id, event, icon, ip) values ($1, $2, $3, $4, $5)", [actor, opts.registrationId ?? null, event, opts.icon ?? "edit", opts.ip ?? null]);
}

// ponytail: no AI calling provider is connected yet, so calls wait as "queued". Send them to the provider API here when one is chosen.
export async function queueCall(registrationId: number | string | null, phone: string, trigger: string, scheduledFor?: Date) {
  return one("insert into calls (registration_id, phone, trigger, status, scheduled_for) values ($1, $2, $3, 'queued', $4) returning *", [registrationId, phone, trigger, scheduledFor ?? null]);
}

function firstCloseDate(): string {
  const now = new Date();
  return shortDate(new Date(now.getFullYear(), now.getMonth() + 2, 10));
}

async function teamNotice(reg: Row, base: string, lines: { preheader: string; payment: string }) {
  const settings = await getSettings();
  const q = quote(reg.plan, reg.catchup_months);
  const docs = (await one<{ n: number }>("select count(*)::int as n from documents where registration_id = $1", [reg.id]))?.n ?? 0;
  const call = await one("select status from calls where registration_id = $1 order by id desc limit 1", [reg.id]);
  const subject = `${lines.preheader}: ${reg.business_name}`;
  await sendEmail({
    registrationId: reg.id,
    template: "team-notification",
    to: settings.teamEmail,
    subject,
    html: renderTemplate("team-notification", {
      preheader: lines.preheader,
      business: reg.business_name ?? "",
      contact: `${reg.first_name} ${reg.last_name}`,
      email: reg.email,
      phone: reg.phone,
      planLine: q ? `${q.name}, ${money(q.amountCents)}${q.recurring ? " per month" : ""}` : "Not chosen",
      paymentLine: lines.payment,
      documentsLine: docs ? `${docs} uploaded` : "None yet",
      callLine: call ? `${call.status === "queued" ? "Queued" : call.status}` : "None",
      adminUrl: `${base}/admin/registrations/${reg.id}`,
      siteUrl: base,
    }),
  });
}

export async function afterSignup(reg: Row, base: string) {
  const settings = await getSettings();
  if (settings.sendSignup) {
    await sendEmail({
      registrationId: reg.id,
      template: "signup-confirmation",
      to: reg.email,
      subject: "Your Anoglobe signup is complete",
      html: renderTemplate("signup-confirmation", {
        firstName: reg.first_name,
        business: reg.business_name ?? "",
        phone: reg.phone,
        firstClose: firstCloseDate(),
        uploadUrl: `${base}/onboarding/resume`,
        siteUrl: base,
      }),
    });
  }
  if (settings.callAfterSignup) await queueCall(reg.id, reg.phone, "signup");
  if (settings.notifySignup) await teamNotice(reg, base, { preheader: "New signup", payment: "Not paid yet" });
}

export async function afterPaymentSuccess(reg: Row, payment: Row, nextCharge: Date | null, base: string) {
  const settings = await getSettings();
  const q = quote(reg.plan, reg.catchup_months);
  if (settings.sendPayment) {
    await sendEmail({
      registrationId: reg.id,
      template: "payment-confirmation",
      to: reg.email,
      subject: `Receipt for ${q?.name ?? "your plan"}`,
      html: renderTemplate("payment-confirmation", {
        planName: q?.name ?? "",
        billing: q?.recurring ? "monthly" : "one time",
        date: shortDate(payment.created_at),
        receipt: `${reg.ref}-${payment.ref.replace("PAY-", "")}`,
        method: `${payment.brand} ending ${payment.last4}`,
        amount: money(payment.amount_cents),
        nextLine: nextCharge ? `Your next charge of ${money(payment.amount_cents)} is on ${shortDate(nextCharge)}. You can cancel any time before then.` : "This is a one-time charge.",
        receiptUrl: `${base}/onboarding/success`,
        siteUrl: base,
      }),
    });
  }
  if (settings.callAfterPayment) await queueCall(reg.id, reg.phone, "payment");
  if (settings.notifyPayment) {
    await teamNotice(reg, base, { preheader: `${money(payment.amount_cents)} paid`, payment: `Paid, ${payment.brand} ending ${payment.last4}` });
  }
}

export async function afterPaymentFailure(reg: Row, payment: Row, base: string) {
  const settings = await getSettings();
  const q = quote(reg.plan, reg.catchup_months);
  await sendEmail({
    registrationId: reg.id,
    template: "payment-failed",
    to: reg.email,
    subject: "Your payment did not go through",
    html: renderTemplate("payment-failed", { amount: money(payment.amount_cents), planName: q?.name ?? "plan", payUrl: `${base}/onboarding/resume`, siteUrl: base }),
  });
  if (settings.notifyFailed) await teamNotice(reg, base, { preheader: "Payment failed", payment: `Declined, ${payment.failure_reason}` });
}

/** Sends a stored email again, exactly as it was. */
export async function resendEmail(id: number | string) {
  const email = await one("select * from emails where id = $1", [id]);
  if (!email) return null;
  return sendEmail({ registrationId: email.registration_id, template: email.template, to: email.to_email, subject: email.subject, html: email.html });
}

export async function recentNotifications(seenAt: Date) {
  const rows = await many("select event, icon, created_at from audit_log order by created_at desc limit 6");
  return rows.map((row): Row => ({ ...row, unread: new Date(row.created_at) > new Date(seenAt) }));
}
