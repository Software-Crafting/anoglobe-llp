// Real prices, from the home page. Change them here; the onboarding screens and the charge both read this file.
export const MONTHLY_CENTS = 27000;
export const CATCHUP_MONTH_CENTS = 22000;

export type Quote = { plan: "monthly" | "catchup"; name: string; billing: string; amountCents: number; recurring: boolean; months: number | null };

export function quote(plan: string | null | undefined, months: number | null | undefined): Quote | null {
  if (plan === "monthly") return { plan, name: "Monthly bookkeeping", billing: "Monthly, cancel any time", amountCents: MONTHLY_CENTS, recurring: true, months: null };
  if (plan === "catchup" && months && months >= 1 && months <= 120) {
    return { plan, name: "Catch-up bookkeeping", billing: `One time, ${months} ${months === 1 ? "month" : "months"} of catch-up`, amountCents: CATCHUP_MONTH_CENTS * months, recurring: false, months };
  }
  return null;
}

export const authText = (q: Quote, amount: string) =>
  q.recurring ? `I authorize Anoglobe LLP to charge ${amount} today and ${amount} every month until I cancel.` : `I authorize Anoglobe LLP to charge ${amount} one time for ${q.name}.`;
