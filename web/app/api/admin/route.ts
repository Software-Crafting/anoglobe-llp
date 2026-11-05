// Every admin change goes through here: one place for origin check, sign-in, roles and audit.
import { canEditClients, canManage, currentUser, endSession, type AdminUser } from "@/lib/auth";
import { one, pool, type Row } from "@/lib/db";
import { audit, queueCall, resendEmail } from "@/lib/events";
import { easternTime, money, ROLES, STATUS } from "@/lib/format";
import { clientIp, flash, formText, isSameOrigin, seeOther, siteUrl } from "@/lib/http";
import { renderSimple, renderTemplate, sendEmail } from "@/lib/mail";
import { checkPassword, hashPassword, hashToken, newToken } from "@/lib/secure";
import { DEFAULTS, saveSettings, type Settings } from "@/lib/settings";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\(\d{3}\) \d{3}-\d{4}$/;

type Context = { form: FormData; user: AdminUser & { sessionHash: string }; ip: string; text: (name: string, max?: number) => string };
/** Returns a toast message, or { error } to show it as a failure. */
type Result = string | { error: string };
type Action = { allow: (user: AdminUser) => boolean; run: (ctx: Context) => Promise<Result> };

const any = () => true;

async function registrationName(id: string) {
  return (await one("select business_name, first_name, last_name from registrations where id = $1", [id])) ?? null;
}
const displayName = (reg: Row) => reg.business_name || `${reg.first_name} ${reg.last_name}`;

const ACTIONS: Record<string, Action> = {
  "registration.status": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const id = text("id");
      const status = text("status");
      if (!["pending", "review", "active", "paused"].includes(status)) return { error: "Unknown status" };
      const reg = await registrationName(id);
      if (!reg) return { error: "Registration not found" };
      await pool.query("update registrations set status = $2, updated_at = now() where id = $1", [id, status]);
      await audit(user.name, `changed status of ${displayName(reg)} to ${STATUS[status].label}`, { registrationId: id, ip });
      return "Status updated";
    },
  },
  "registration.note": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const body = text("body", 1000);
      if (!body) return { error: "Write a note first" };
      await pool.query("insert into notes (registration_id, author, body) values ($1, $2, $3)", [text("id"), user.name, body]);
      await audit(user.name, "added a note", { registrationId: text("id"), icon: "message", ip });
      return "Note saved";
    },
  },
  "registration.field": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const id = text("id");
      const field = text("field");
      const value = text("value", 254);
      const valid: Record<string, () => boolean> = { email: () => EMAIL.test(value), phone: () => PHONE.test(value), first_name: () => value.length > 0, last_name: () => value.length > 0 };
      if (!valid[field]?.()) return { error: "Check the value and try again" };
      // field comes from the fixed list above, never from free text.
      await pool.query(`update registrations set ${field} = $2, updated_at = now() where id = $1`, [id, field === "email" ? value.toLowerCase() : value]);
      await audit(user.name, `edited ${field.replace("_", " ")}`, { registrationId: id, ip });
      return "Saved";
    },
  },
  "registration.call": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const reg = await one("select phone from registrations where id = $1", [text("id")]);
      if (!reg) return { error: "Registration not found" };
      await queueCall(text("id"), reg.phone, "manual");
      await audit(user.name, "queued an AI call", { registrationId: text("id"), icon: "phone-call", ip });
      return "Call queued";
    },
  },
  "registration.schedule": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const reg = await one("select * from registrations where id = $1", [text("id")]);
      const when = easternTime(text("date"), text("time"));
      if (!reg || !when || when < new Date()) return { error: "Choose a date and time in the future" };
      await queueCall(reg.id, reg.phone, "scheduled", when);
      const zone = { timeZone: "America/New_York" };
      const long = when.toLocaleDateString("en-US", { ...zone, weekday: "long", month: "short", day: "numeric", year: "numeric" });
      const time = `${when.toLocaleTimeString("en-US", { ...zone, hour: "numeric", minute: "2-digit" })} ET`;
      await sendEmail({
        registrationId: reg.id,
        template: "call-scheduled",
        to: reg.email,
        subject: `Your welcome call is scheduled for ${long}`,
        html: renderTemplate("call-scheduled", { longDate: long, time, shortWhen: `${when.toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" })} at ${time}`, phone: reg.phone, siteUrl: await siteUrl() }),
      });
      await audit(user.name, `scheduled a call for ${long}, ${time}`, { registrationId: reg.id, icon: "calendar", ip });
      return "Call scheduled, email sent";
    },
  },
  "call.retry": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const call = await one("select registration_id, phone from calls where id = $1", [text("id")]);
      if (!call) return { error: "Call not found" };
      await queueCall(call.registration_id, call.phone, "manual");
      await audit(user.name, "queued a call retry", { registrationId: call.registration_id, icon: "phone-call", ip });
      return "Call queued";
    },
  },
  "call.test": {
    allow: canManage,
    run: async ({ text, user, ip }) => {
      if (!PHONE.test(text("phone"))) return { error: "Enter a phone number like (415) 555-0132" };
      await queueCall(null, text("phone"), "test");
      await audit(user.name, `queued a test call to ${text("phone")}`, { icon: "phone-call", ip });
      return "Test call queued. It runs once a calling provider is connected.";
    },
  },
  "email.resend": {
    allow: canEditClients,
    run: async ({ text, user, ip }) => {
      const status = await resendEmail(text("id"));
      if (!status) return { error: "Email not found" };
      await audit(user.name, "resent an email", { icon: "mail", ip });
      return status === "delivered" ? "Email resent" : { error: status === "not_sent" ? "Saved, but not sent: no mail server is set up" : "That email failed to send" };
    },
  },
  "payment.refund": {
    allow: canManage,
    run: async ({ text, user, ip }) => {
      const payment = await one("select * from payments where id = $1", [text("id")]);
      if (!payment || payment.status !== "succeeded") return { error: "Only a successful payment can be refunded" };
      const cents = Math.round(Number(text("amount").replace(/[^\d.]/g, "")) * 100);
      if (!cents || cents > payment.amount_cents) return { error: `Enter an amount up to ${money(payment.amount_cents)}` };
      if (!text("reason")) return { error: "Choose a reason" };
      if (payment.gateway !== "test") return { error: "Refunds for this gateway are not connected yet" };
      await pool.query("update payments set status = 'refunded', refund_cents = $2, refund_reason = $3 where id = $1", [payment.id, cents, text("reason")]);
      await audit(user.name, `refunded ${money(cents)} on ${payment.ref}, test mode`, { registrationId: payment.registration_id, icon: "refunded", ip });
      return "Refund recorded";
    },
  },
  "subscription.status": {
    allow: canManage,
    run: async ({ text, user, ip }) => {
      const status = text("status");
      if (!["active", "paused", "cancelled"].includes(status)) return { error: "Unknown status" };
      const sub = await one("update subscriptions set status = $2, next_charge_at = case when $2 = 'cancelled' then null else next_charge_at end where id = $1 returning registration_id, plan", [text("id"), status]);
      if (!sub) return { error: "Subscription not found" };
      if (status !== "active") await pool.query("update registrations set status = $2, updated_at = now() where id = $1", [sub.registration_id, status === "paused" ? "paused" : "cancelled"]);
      else await pool.query("update registrations set status = 'active', updated_at = now() where id = $1", [sub.registration_id]);
      await audit(user.name, `set ${sub.plan} subscription to ${status}`, { registrationId: sub.registration_id, icon: "recurring-payment", ip });
      return `Subscription ${status === "active" ? "resumed" : status}`;
    },
  },
  "team.invite": {
    allow: canManage,
    run: async ({ text, user, ip }) => {
      const email = text("email", 254).toLowerCase();
      const role = text("role");
      if (!EMAIL.test(email)) return { error: "Enter a work email" };
      if (!["admin", "bookkeeper", "viewer"].includes(role)) return { error: "Choose a role" };
      if (await one("select 1 from admin_users where lower(email) = $1", [email])) return { error: "That person already has an account" };
      const token = newToken();
      await pool.query("insert into admin_users (name, email, role, status, reset_hash, reset_expires) values ($1, $2, $3, 'invited', $4, now() + interval '7 days')", [text("name", 100) || email.split("@")[0], email, role, hashToken(token)]);
      await sendEmail({ template: "team-access", to: email, subject: "You have been invited to Anoglobe Admin", html: renderSimple("Join Anoglobe Admin", `${user.name} invited you as ${ROLES[role]}. Choose a password to sign in. This link lasts 7 days.`, "Choose a password", `${await siteUrl()}/admin/reset-password?token=${token}`) });
      await audit(user.name, `invited ${email} as ${ROLES[role]}`, { icon: "users", ip });
      return "Invitation sent";
    },
  },
  "team.role": {
    allow: canManage,
    run: async ({ text, user, ip }) => {
      const role = text("role");
      if (!["admin", "bookkeeper", "viewer"].includes(role)) return { error: "Unknown role" };
      const target = await one("update admin_users set role = $2 where id = $1 and role <> 'owner' returning name", [text("id"), role]);
      if (!target) return { error: "The owner's role cannot be changed here" };
      await audit(user.name, `changed ${target.name} to ${ROLES[role]}`, { icon: "users", ip });
      return "Role updated";
    },
  },
  "team.remove": {
    allow: canManage,
    run: async ({ text, user, ip }) => {
      if (text("id") === String(user.id)) return { error: "You cannot remove your own access" };
      const target = await one("update admin_users set status = 'disabled', reset_hash = null where id = $1 and role <> 'owner' returning name", [text("id")]);
      if (!target) return { error: "The owner cannot be removed" };
      await pool.query("delete from admin_sessions where user_id = $1", [text("id")]);
      await audit(user.name, `removed access for ${target.name}`, { icon: "trash", ip });
      return `${target.name} removed`;
    },
  },
  "settings.save": {
    allow: canManage,
    run: async ({ form, text, user, ip }) => {
      const textKeys = ["businessName", "brandName", "supportEmail", "senderName", "fromEmail", "teamEmail"] as const;
      const switchKeys = ["sendSignup", "sendPayment", "notifyPayment", "notifySignup", "notifyFailed", "callAfterSignup", "callAfterPayment", "idleSignout"] as const;
      const values: Partial<Record<keyof Settings, string | boolean>> = {};
      // Each settings tab posts its own fields; _fields says which, so unticked switches read as off.
      for (const key of text("_fields", 500).split(",")) {
        if ((textKeys as readonly string[]).includes(key)) {
          const value = text(key, 200);
          if (key.toLowerCase().includes("email") && !EMAIL.test(value)) return { error: "Check the email addresses" };
          if (!value) return { error: "Fill in every field" };
          values[key as keyof Settings] = value;
        }
        if ((switchKeys as readonly string[]).includes(key)) values[key as keyof Settings] = form.get(key) === "on";
      }
      await saveSettings(values as Partial<typeof DEFAULTS>);
      await audit(user.name, "changed settings", { icon: "settings", ip });
      return "Settings saved";
    },
  },
  "profile.save": {
    allow: any,
    run: async ({ text, user, ip }) => {
      const email = text("email", 254).toLowerCase();
      if (!text("name", 100) || !EMAIL.test(email)) return { error: "Enter your name and a valid email" };
      if (await one("select 1 from admin_users where lower(email) = $1 and id <> $2", [email, user.id])) return { error: "That email is already in use" };
      await pool.query("update admin_users set name = $2, email = $3, title = $4 where id = $1", [user.id, text("name", 100), email, text("title", 100)]);
      await audit(user.name, "updated their profile", { icon: "user", ip });
      return "Profile saved";
    },
  },
  "profile.password": {
    allow: any,
    run: async ({ form, user, ip }) => {
      const current = String(form.get("current") ?? "");
      const next = String(form.get("next") ?? "");
      if (!checkPassword(current, user.password_hash)) return { error: "Your current password is not right" };
      if (next.length < 10) return { error: "Use at least 10 characters" };
      await pool.query("update admin_users set password_hash = $2 where id = $1", [user.id, hashPassword(next)]);
      await pool.query("delete from admin_sessions where user_id = $1 and hash <> $2", [user.id, user.sessionHash]);
      await audit(user.name, "changed their password", { icon: "lock", ip });
      return "Password changed";
    },
  },
  "session.revoke": {
    allow: any,
    run: async ({ text, user }) => {
      await pool.query("delete from admin_sessions where hash = $1 and user_id = $2", [text("hash"), user.id]);
      return "Session signed out";
    },
  },
  "notifications.read": {
    allow: any,
    run: async ({ user }) => {
      await pool.query("update admin_users set notifications_seen_at = now() where id = $1", [user.id]);
      return "";
    },
  },
};

/** Only pages inside the admin, so a crafted form cannot redirect elsewhere. */
function backPath(value: string): string {
  return /^\/admin(\/[\w\-/]*)?(\?[\w=&-]*)?$/.test(value) ? value : "/admin/dashboard";
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new Response("Cross-site request refused", { status: 403 });
  const form = await req.formData();
  const fetched = req.headers.get("x-requested-with") === "fetch";
  const name = formText(form, "_action");

  if (name === "signout") {
    await endSession();
    return seeOther("/admin/login");
  }

  const user = await currentUser();
  if (!user) return fetched ? Response.json({ error: "Signed out" }, { status: 401 }) : seeOther("/admin/session-expired");

  const action = ACTIONS[name];
  if (!action) return new Response("Unknown action", { status: 400 });
  if (!action.allow(user)) return fetched ? Response.json({ error: "Not allowed" }, { status: 403 }) : seeOther("/admin/permission-denied");

  const result = await action.run({ form, user, ip: await clientIp(), text: (key, max = 500) => formText(form, key, max) });
  const failed = typeof result !== "string";
  if (fetched) return Response.json(failed ? result : { ok: true }, { status: failed ? 400 : 200 });
  if (failed) await flash(result.error, "destructive");
  else if (result) await flash(result);
  return seeOther(backPath(formText(form, "_back", 200)));
}
