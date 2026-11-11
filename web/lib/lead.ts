// Lead form rules, shared by the browser form and the API route. The API's check is the one that counts.

export type Lead = { firstName: string; lastName: string; email: string; phone: string };
export type LeadErrors = Partial<Record<LeadField, string>>;
export type LeadField = "lead-first-name" | "lead-last-name" | "lead-email" | "lead-phone";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\(\d{3}\) \d{3}-\d{4}$/;

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return d.length ? `(${d}` : "";
}

export function validateLead(input: unknown): { lead: Lead; errors: null } | { lead: null; errors: LeadErrors } {
  const body = (input ?? {}) as Record<string, unknown>;
  const text = (name: LeadField) => (typeof body[name] === "string" ? body[name].trim() : "");

  const firstName = text("lead-first-name");
  const lastName = text("lead-last-name");
  const email = text("lead-email");
  const phone = text("lead-phone");

  const errors: LeadErrors = {};
  if (!firstName) errors["lead-first-name"] = "Enter your first name";
  else if (firstName.length > 100) errors["lead-first-name"] = "Use 100 characters or fewer";
  if (!lastName) errors["lead-last-name"] = "Enter your last name";
  else if (lastName.length > 100) errors["lead-last-name"] = "Use 100 characters or fewer";
  if (!email) errors["lead-email"] = "Enter your email";
  else if (email.length > 254 || !EMAIL.test(email)) errors["lead-email"] = "Enter an email like name@company.com";
  if (!phone) errors["lead-phone"] = "Enter your phone number";
  else if (!PHONE.test(phone)) errors["lead-phone"] = "Enter a phone number like (415) 555-0132";

  if (Object.keys(errors).length > 0) return { lead: null, errors };
  return { lead: { firstName, lastName, email, phone }, errors: null };
}
