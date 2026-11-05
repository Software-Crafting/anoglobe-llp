import { cookies } from "next/headers";
import { many, one, pool, type Row } from "./db";
import { isHttps } from "./http";
import { encryptText, hashToken, newToken } from "./secure";

export const STEPS = ["account", "business", "services", "documents", "plan", "review", "payment"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = { account: "Account", business: "Business", services: "Services", documents: "Documents", plan: "Plan", review: "Review", payment: "Payment" };

export const STEP_TITLES: Record<Step, string> = { account: "Create your account", business: "About your business", services: "What you need", documents: "Share documents", plan: "Choose a plan", review: "Review your details", payment: "Payment" };

const COOKIE = "anoglobe_signup";
const WEEK_S = 7 * 24 * 60 * 60;

export const nextStep = (step: Step): Step => STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)];

/** Signup answers can no longer change once the client has paid. */
export const isOpen = (reg: Row) => reg.status === "draft" || reg.status === "failed";

export async function issueToken(registrationId: number | string): Promise<string> {
  const token = newToken();
  await pool.query("insert into registration_tokens (hash, registration_id, expires_at) values ($1, $2, now() + interval '7 days')", [hashToken(token), registrationId]);
  await pool.query("delete from registration_tokens where expires_at < now()");
  return token;
}

export async function setSignupCookie(token: string) {
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: await isHttps(), path: "/", maxAge: WEEK_S });
}

export async function registrationFromToken(token: string): Promise<Row | null> {
  return one("select r.* from registration_tokens t join registrations r on r.id = t.registration_id where t.hash = $1 and t.expires_at > now()", [hashToken(token)]);
}

export async function currentRegistration(): Promise<Row | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? registrationFromToken(token) : null;
}

export const registrationDocuments = (id: string | number) => many("select * from documents where registration_id = $1 order by created_at", [id]);

// ---------- Answers: validated here on every step, whatever the browser checked ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\(\d{3}\) \d{3}-\d{4}$/;
const EIN = /^\d{2}-\d{7}$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export type Fields = Record<string, string | string[]>;

const str = (fields: Fields, name: string) => (typeof fields[name] === "string" ? (fields[name] as string).trim() : "");

export function formFields(form: FormData): Fields {
  const fields: Fields = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("_") || key.startsWith("$")) continue;
    const values = form.getAll(key).filter((v): v is string => typeof v === "string").map((v) => v.slice(0, 2000));
    fields[key] = key === "services" ? values : (values[0] ?? "");
  }
  return fields;
}

export function realDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return d.getMonth() === Number(m[1]) - 1 && d.getDate() === Number(m[2]);
}

export function validateStep(step: Step, f: Fields): string | null {
  const required = (names: string[]) => names.every((name) => str(f, name));
  switch (step) {
    case "account":
      if (!required(["first-name", "last-name", "email", "phone", "role"])) return "Fill in every required field.";
      if (!EMAIL.test(str(f, "email"))) return "Enter an email like name@company.com.";
      if (!PHONE.test(str(f, "phone"))) return "Enter a 10 digit US phone number.";
      return null;
    case "business":
      if (!required(["legal-name", "entity", "ein", "industry", "formation-state", "biz-line1", "biz-city", "biz-state", "biz-zip"])) return "Fill in every required field.";
      if (!EIN.test(str(f, "ein"))) return "Enter an EIN with 9 digits, like 12-3456789.";
      if (!ZIP.test(str(f, "biz-zip"))) return "Enter a 5 digit ZIP code.";
      return null;
    case "services":
      if (!Array.isArray(f.services) || f.services.length === 0) return "Choose at least one service.";
      if (!str(f, "software")) return "Choose your accounting software.";
      if (!realDate(str(f, "start-date"))) return "Enter a real start date as MM/DD/YYYY.";
      return null;
    default:
      return null;
  }
}

/** Saves one step. Validated steps land in their columns; a partial "save for later" only goes into data. */
export async function saveStep(reg: Row, step: Step, f: Fields) {
  const { ein, ...rest } = f;
  await pool.query("update registrations set data = data || $2::jsonb, updated_at = now() where id = $1", [reg.id, JSON.stringify(rest)]);
  if (typeof ein === "string" && ein) await pool.query("update registrations set ein_enc = $2 where id = $1", [reg.id, encryptText(ein.trim())]);
  if (step === "account" && !validateStep("account", f)) {
    await pool.query("update registrations set first_name = $2, last_name = $3, email = $4, phone = $5, role = $6 where id = $1", [reg.id, str(f, "first-name"), str(f, "last-name"), str(f, "email").toLowerCase(), str(f, "phone"), str(f, "role")]);
  }
  if (step === "business") {
    await pool.query("update registrations set business_name = coalesce(nullif($2, ''), business_name), state = coalesce(nullif($3, ''), state) where id = $1", [reg.id, str(f, "legal-name"), str(f, "biz-state")]);
  }
}

/** Everything the review page and the charge rely on. Returns the first step that is not done. */
export function firstIncomplete(reg: Row): Step | null {
  const d = (reg.data ?? {}) as Fields;
  if (validateStep("account", d)) return "account";
  if (!reg.ein_enc) return "business";
  if (validateStep("business", { ...d, ein: "12-3456789" })) return "business";
  if (validateStep("services", d)) return "services";
  if (!reg.plan) return "plan";
  return null;
}

export const OPTIONS = {
  roles: [["owner", "Owner or partner"], ["finance", "Finance or office manager"], ["accountant", "Outside accountant"], ["other", "Other"]],
  entities: [
    ["Corporations", [["c-corp", "C corporation"], ["s-corp", "S corporation"]]],
    ["Partnerships", [["llc-multi", "Multi-member LLC"], ["partnership", "General partnership"]]],
    ["Single owner", [["llc-single", "Single-member LLC"], ["sole-prop", "Sole proprietorship"]]],
    ["Other", [["nonprofit", "Nonprofit"]]],
  ] as [string, string[][]][],
  industries: ["Dental practice", "Medical practice", "Ecommerce", "Construction", "Restaurant and food service", "Real estate", "Marketing agency", "Software and SaaS", "Law firm", "Retail", "Logistics", "Fitness", "Nonprofit", "Other"].map((name) => [name, name]),
  software: ["QuickBooks Online", "Xero", "QuickBooks Desktop", "FreshBooks", "Wave", "Spreadsheets", "None yet"].map((name) => [name, name]),
  behind: [["0", "Up to date"], ["1-3", "1 to 3 months"], ["4-6", "4 to 6 months"], ["7-12", "7 to 12 months"], ["12+", "More than 12 months"]],
  team: [["1", "Just me"], ["2-10", "2 to 10"], ["11-50", "11 to 50"], ["51+", "51 or more"]],
  services: [
    ["monthly", "ledger-book-duo", "Monthly bookkeeping", "Every transaction categorized, every account reconciled, and your month closed by the 10th."],
    ["catchup", "clock-play-duo", "Catch-up bookkeeping", "Behind by a few months or a few years? We bring your books current, month by month."],
    ["cleanup", "reconcile-duo", "Books cleanup", "Fix miscategorized transactions, duplicates and messy charts of accounts."],
    ["payables", "invoice-duo", "Payables and receivables", "Track what you owe and what you are owed, so cash flow never surprises you."],
    ["payroll", "payroll-duo", "Payroll support", "Payroll journal entries and reconciliation, matched to your payroll provider."],
    ["reporting", "bar-chart-duo", "Financial reporting", "Clear monthly reports and a short summary of what changed and why."],
  ],
  states: Object.entries({ AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" }),
};

export const label = (list: string[][], value: unknown) => list.find(([v]) => v === value)?.[1] ?? "";
export const entityLabel = (value: unknown) => OPTIONS.entities.flatMap(([, items]) => items).find(([v]) => v === value)?.[1] ?? "";
