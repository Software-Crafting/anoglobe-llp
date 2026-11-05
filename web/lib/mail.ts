import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { pool } from "./db";
import { getSettings } from "./settings";

const TEMPLATE_DIR = path.join(process.cwd(), "lib", "email-templates");

export type TemplateName = "signup-confirmation" | "payment-confirmation" | "payment-failed" | "call-scheduled" | "team-notification";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderTemplate(name: TemplateName, vars: Record<string, string>): string {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ TEMPLATE_DIR, `${name}.html`), "utf8").replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ""));
}

/** Plain message in the same look, for links that have no design template (resume link, team access). */
export function renderSimple(heading: string, text: string, buttonLabel: string, url: string): string {
  return `<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f9fafb;font-family:Inter,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0e1517">
<table role="presentation" style="max-width:520px;margin:auto;background:#fff;border:1px solid #dce5e6;border-radius:12px;padding:32px"><tr><td>
<h1 style="margin:0 0 12px;font-size:22px;color:#134e4a">${escapeHtml(heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6">${escapeHtml(text)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(buttonLabel)}</a>
<p style="margin:24px 0 0;font-size:13px;color:#4f676b">If you did not ask for this, ignore this email.</p>
</td></tr></table></body></html>`;
}

/** The transport comes from SMTP_URL. Without it the email is kept with status not_sent, so nothing is silently lost. */
export async function sendEmail(opts: { registrationId?: number | string | null; template: string; to: string; subject: string; html: string }) {
  const settings = await getSettings();
  let status = "not_sent";
  let error: string | null = "SMTP_URL is not set";
  if (process.env.SMTP_URL) {
    try {
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
        from: `"${settings.senderName.replace(/"/g, "")}" <${settings.fromEmail}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      status = "delivered";
      error = null;
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message.slice(0, 300) : "Send failed";
      console.error("Email failed:", error);
    }
  }
  await pool.query("insert into emails (registration_id, template, to_email, subject, html, status, error) values ($1, $2, $3, $4, $5, $6, $7)", [
    opts.registrationId ?? null,
    opts.template,
    opts.to,
    opts.subject,
    opts.html,
    status,
    error,
  ]);
  return status;
}
