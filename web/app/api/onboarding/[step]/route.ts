import { one, pool, transaction } from "@/lib/db";
import { afterPaymentFailure, afterPaymentSuccess, afterSignup, audit } from "@/lib/events";
import { money } from "@/lib/format";
import { clientIp, flash, formText, isSameOrigin, maintenanceOn, seeOther, siteUrl } from "@/lib/http";
import { renderSimple, sendEmail } from "@/lib/mail";
import {
  currentRegistration, firstIncomplete, formFields, isOpen, issueToken, nextStep, registrationDocuments, saveStep, setSignupCookie, STEPS, validateStep, type Step,
} from "@/lib/onboarding";
import { authText, quote } from "@/lib/plans";
import { FILE_TYPES, fileExtension, MAX_FILE_BYTES, removeFile, storeFile } from "@/lib/uploads";

const MAX_FILES_PER_SIGNUP = 30;
const SIGNUPS_PER_MINUTE = 30;
const TEST_CARDS: Record<string, { brand: string; approved: boolean }> = { "4242": { brand: "Visa", approved: true }, "0002": { brand: "Visa", approved: false } };

const back = (step: string, message: string) => seeOther(`/onboarding/${step}?error=${encodeURIComponent(message)}`);

export async function POST(req: Request, { params }: { params: Promise<{ step: string }> }) {
  if (!isSameOrigin(req)) return new Response("Cross-site request refused", { status: 403 });
  if (maintenanceOn()) return seeOther("/maintenance");
  const { step } = await params;

  if (step === "resume") return requestResumeLink(req);
  if (step === "upload") return upload(req);
  if (step === "remove-file") return removeUpload(req);
  if (step === "pay") return pay(req);
  if (!STEPS.includes(step as Step)) return new Response("Not found", { status: 404 });
  return saveAnswers(req, step as Step);
}

async function saveAnswers(req: Request, step: Step) {
  const form = await req.formData();
  const later = form.get("_later") === "1";
  const fields = formFields(form);
  let reg = await currentRegistration();

  if (reg && !isOpen(reg) && step !== "documents") return seeOther("/onboarding/success");
  if (!reg && step !== "account") return seeOther("/onboarding/account");

  if (later && !reg) return seeOther("/onboarding/resume");
  if (!later) {
    const problem = validateStep(step, fields);
    if (problem) return back(step, problem);
  }

  if (!reg) {
    const recent = await one<{ n: number }>("select count(*)::int as n from registrations where created_at > now() - interval '1 minute'");
    if ((recent?.n ?? 0) >= SIGNUPS_PER_MINUTE) return back(step, "We are very busy right now. Please try again in a minute.");
    reg = await one("insert into registrations (first_name, last_name, email, phone) values ($1, $2, $3, $4) returning *", [formText(form, "first-name", 100), formText(form, "last-name", 100), formText(form, "email", 254).toLowerCase(), formText(form, "phone", 20)]);
    await setSignupCookie(await issueToken(reg!.id));
    await audit(`${reg!.first_name} ${reg!.last_name}`, `started signup, ${reg!.ref}`, { registrationId: reg!.id, icon: "user", ip: await clientIp() });
  }
  await saveStep(reg!, step, fields);

  if (step === "plan" && !later) {
    const q = quote(formText(form, "plan"), Number(formText(form, "catchup-months")) || null);
    if (!q) return back("plan", "Choose a plan. For catch-up, enter how many months need catching up.");
    await pool.query("update registrations set plan = $2, plan_amount_cents = $3, catchup_months = $4 where id = $1", [reg!.id, q.plan, q.amountCents, q.months]);
  }
  if (step === "documents" && !isOpen(reg!)) {
    await flash("Documents saved");
    return seeOther("/onboarding/success");
  }
  if (step === "review" && !later) {
    if (form.get("terms") !== "on") return back("review", "Agree to the terms to continue.");
    const fresh = await one("select * from registrations where id = $1", [reg!.id]);
    const missing = firstIncomplete(fresh!);
    if (missing) return back(missing, "Finish this step before you pay.");
    await pool.query("update registrations set terms_at = now(), terms_ip = $2 where id = $1", [reg!.id, await clientIp()]);
    if (!fresh!.terms_at) {
      await audit(`${fresh!.first_name} ${fresh!.last_name}`, `completed signup for ${fresh!.business_name}`, { registrationId: fresh!.id, icon: "check", ip: await clientIp() });
      await afterSignup(fresh!, await siteUrl());
    }
  }

  const next = later ? step : nextStep(step);
  await pool.query("update registrations set step = $2 where id = $1", [reg!.id, next]);
  if (later) return seeOther("/onboarding/resume?saved=1");
  return seeOther(`/onboarding/${next}`);
}

/** Same answer whether or not the email exists, so the form cannot be used to look up clients. */
async function requestResumeLink(req: Request) {
  const form = await req.formData();
  const email = formText(form, "resume-email", 254).toLowerCase();
  const reg = email ? await one("select * from registrations where lower(email) = $1 order by created_at desc limit 1", [email]) : null;
  if (reg) {
    const sentRecently = await one("select 1 from emails where registration_id = $1 and template = 'resume-link' and created_at > now() - interval '1 minute'", [reg.id]);
    if (!sentRecently) {
      const url = `${await siteUrl()}/onboarding/continue/${await issueToken(reg.id)}`;
      await sendEmail({
        registrationId: reg.id,
        template: "resume-link",
        to: reg.email,
        subject: "Continue your Anoglobe signup",
        html: renderSimple("Continue your signup", "This secure link brings you back to where you left off. It lasts 7 days.", "Continue signup", url),
      });
    }
  }
  return seeOther("/onboarding/resume?sent=1");
}

async function upload(req: Request) {
  const reg = await currentRegistration();
  if (!reg) return Response.json({ error: "Your signup has expired. Please start again." }, { status: 401 });
  if (Number(req.headers.get("content-length")) > MAX_FILE_BYTES + 1024 * 1024) return Response.json({ error: "The limit is 25 MB." }, { status: 413 });

  const form = await req.formData();
  const file = form.get("file");
  const kind = formText(form, "kind");
  if (!(file instanceof File) || !["bank-statement", "tax-return", "chart-of-accounts"].includes(kind)) return Response.json({ error: "Choose a file." }, { status: 400 });
  const mime = FILE_TYPES[fileExtension(file.name)];
  if (!mime) return Response.json({ error: "Use a PDF, CSV, XLSX, JPG or PNG file." }, { status: 415 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: "The limit is 25 MB." }, { status: 413 });
  if (file.size === 0) return Response.json({ error: "That file is empty." }, { status: 400 });
  if ((await registrationDocuments(reg.id)).length >= MAX_FILES_PER_SIGNUP) return Response.json({ error: "That is the maximum number of files. Email us the rest." }, { status: 409 });

  const key = await storeFile(Buffer.from(await file.arrayBuffer()));
  const who = `${reg.first_name} ${reg.last_name}`;
  const doc = await one("insert into documents (registration_id, kind, filename, mime, size_bytes, storage_key, uploaded_by) values ($1, $2, $3, $4, $5, $6, $7) returning id", [reg.id, kind, file.name.replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 200), mime, file.size, key, who]);
  await audit(who, `uploaded ${file.name.slice(0, 80)}`, { registrationId: reg.id, icon: "upload", ip: await clientIp() });
  return Response.json({ id: doc!.id });
}

async function removeUpload(req: Request) {
  const reg = await currentRegistration();
  if (!reg) return Response.json({ error: "Your signup has expired." }, { status: 401 });
  const form = await req.formData();
  const doc = await one("delete from documents where id = $1 and registration_id = $2 returning storage_key", [formText(form, "id"), reg.id]);
  if (doc) await removeFile(doc.storage_key);
  return Response.json({ ok: true });
}

/**
 * Test gateway. Card digits never reach this server: the browser sends only the last four, and only the two test cards count.
 * ponytail: Stripe goes here once keys exist (PAYMENTS_MODE=stripe, Payment Element, webhook). Live charging refuses until then.
 */
async function pay(req: Request) {
  if (process.env.PAYMENTS_MODE !== "test") return back("payment", "Payments are not set up yet. Your answers are saved.");
  const reg = await currentRegistration();
  if (!reg) return seeOther("/onboarding/account");
  if (!isOpen(reg)) return seeOther("/onboarding/success");
  const missing = firstIncomplete(reg);
  if (missing) return back(missing, "Finish this step before you pay.");
  if (!reg.terms_at) return back("review", "Agree to the terms to continue.");

  const form = await req.formData();
  const q = quote(reg.plan, reg.catchup_months)!;
  const amount = money(q.amountCents);
  if (form.get(q.recurring ? "auth-monthly" : "auth-onetime") !== "on") return back("payment", "Check the authorization box to continue.");
  if (!formText(form, "bill-name") || !formText(form, "bill-line1") || !formText(form, "bill-city") || !formText(form, "bill-state") || !/^\d{5}(-\d{4})?$/.test(formText(form, "bill-zip"))) return back("payment", "Fill in your billing address.");

  const last4 = formText(form, "card-last4");
  const card = TEST_CARDS[last4];
  if (!card) return back("payment", "Test mode only accepts the two test cards shown.");
  const who = `${reg.first_name} ${reg.last_name}`;
  const ip = await clientIp();
  const nextCharge = q.recurring && card.approved ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

  const payment = await transaction(async (db) => {
    const { rows } = await db.query(
      `insert into payments (registration_id, kind, description, amount_cents, status, brand, last4, exp, gateway, gateway_id, failure_reason, auth_text, auth_by, auth_at, auth_ip)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'test', $9, $10, $11, $12, now(), $13) returning *`,
      [reg.id, q.recurring ? "recurring" : "one-time", q.name, q.amountCents, card.approved ? "succeeded" : "failed", card.brand, last4, formText(form, "card-exp", 7), `test_${crypto.randomUUID()}`, card.approved ? null : "card declined", authText(q, amount), who, ip],
    );
    const docCount = (await db.query("select count(*)::int as n from documents where registration_id = $1", [reg.id])).rows[0].n;
    const status = card.approved ? (docCount > 0 ? "active" : "pending") : "failed";
    await db.query("update registrations set status = $2, step = 'payment', completed_at = case when $3 then now() else completed_at end, data = data || $4::jsonb, updated_at = now() where id = $1", [
      reg.id, status, card.approved,
      JSON.stringify({ billing: { name: formText(form, "bill-name"), line1: formText(form, "bill-line1"), line2: formText(form, "bill-line2"), city: formText(form, "bill-city"), state: formText(form, "bill-state"), zip: formText(form, "bill-zip") } }),
    ]);
    if (nextCharge) await db.query("insert into subscriptions (registration_id, plan, amount_cents, status, next_charge_at) values ($1, $2, $3, 'active', $4)", [reg.id, q.name, q.amountCents, nextCharge]);
    return rows[0];
  });

  await audit(who, `payment of ${amount} ${card.approved ? "succeeded" : "was declined"}, test mode`, { registrationId: reg.id, icon: card.approved ? "credit-card" : "x-circle", ip });
  const base = await siteUrl();
  if (!card.approved) {
    await afterPaymentFailure(reg, payment, base);
    return seeOther("/onboarding/payment-failed");
  }
  await afterPaymentSuccess(reg, payment, nextCharge, base);
  return seeOther("/onboarding/success");
}
