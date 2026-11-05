import { login, startSession } from "@/lib/auth";
import { one, pool } from "@/lib/db";
import { audit } from "@/lib/events";
import { clientIp, flash, formText, isSameOrigin, seeOther, siteUrl } from "@/lib/http";
import { renderSimple, sendEmail } from "@/lib/mail";
import { hashPassword, hashToken, newToken } from "@/lib/secure";

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!isSameOrigin(req)) return new Response("Cross-site request refused", { status: 403 });
  const { action } = await params;
  const form = await req.formData();

  if (action === "login") {
    const result = await login(formText(form, "login-email", 254), String(form.get("login-password") ?? ""), form.get("login-remember") === "on");
    return seeOther(result === "ok" ? "/admin/dashboard" : `/admin/login?error=${result}`);
  }

  // Same answer whether or not the account exists.
  if (action === "forgot") {
    const user = await one("select * from admin_users where lower(email) = lower($1) and status = 'active'", [formText(form, "reset-email", 254)]);
    if (user) {
      const token = newToken();
      await pool.query("update admin_users set reset_hash = $2, reset_expires = now() + interval '30 minutes' where id = $1", [user.id, hashToken(token)]);
      await sendEmail({ template: "team-access", to: user.email, subject: "Reset your Anoglobe Admin password", html: renderSimple("Reset your password", "This link lasts 30 minutes.", "Choose a new password", `${await siteUrl()}/admin/reset-password?token=${token}`) });
    }
    return seeOther("/admin/forgot-password?sent=1");
  }

  if (action === "reset") {
    const token = formText(form, "token", 200);
    const password = String(form.get("password") ?? "");
    if (password.length < 10) return seeOther(`/admin/reset-password?token=${encodeURIComponent(token)}&error=short`);
    if (password !== String(form.get("password-confirm") ?? "")) return seeOther(`/admin/reset-password?token=${encodeURIComponent(token)}&error=match`);
    const user = await one(
      "update admin_users set password_hash = $2, status = 'active', reset_hash = null, reset_expires = null, failed_attempts = 0, locked_until = null where reset_hash = $1 and reset_expires > now() and status <> 'disabled' returning id, name",
      [hashToken(token), hashPassword(password)],
    );
    if (!user) return seeOther("/admin/reset-password?error=expired");
    await pool.query("delete from admin_sessions where user_id = $1", [user.id]);
    await startSession(user.id, false);
    await audit(user.name, "set a new password", { icon: "lock", ip: await clientIp() });
    await flash("Password saved. You are signed in.");
    return seeOther("/admin/dashboard");
  }

  return new Response("Not found", { status: 404 });
}
