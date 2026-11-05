import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { seeOther, siteUrl } from "@/lib/http";
import { renderTemplate, type TemplateName } from "@/lib/mail";

const SAMPLE: Record<string, string> = {
  firstName: "Maria", business: "Harbor Lane Dental, LLC", phone: "(512) 555-0186", firstClose: "Jan 10, 2027", planName: "Monthly bookkeeping", billing: "monthly", date: "Nov 5, 2026", receipt: "AG-10001-9001", method: "Visa ending 4242", amount: "$270.00",
  nextLine: "Your next charge of $270.00 is on Dec 5, 2026. You can cancel any time before then.", longDate: "Wednesday, Nov 11, 2026", time: "2:00 PM ET", shortWhen: "Nov 11 at 2:00 PM ET", preheader: "$270.00 paid", contact: "Maria Robles", email: "m.robles@example.com", planLine: "Monthly bookkeeping, $270.00 per month", paymentLine: "Paid, Visa ending 4242", documentsLine: "2 uploaded", callLine: "Queued", uploadUrl: "#", receiptUrl: "#", payUrl: "#", adminUrl: "#",
};
const TEMPLATES = ["signup-confirmation", "payment-confirmation", "team-notification", "payment-failed", "call-scheduled"];

/** A sent email by id, or a template with sample values. Sandboxed, since stored HTML holds client-typed text. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return seeOther("/admin/login");
  const { id } = await params;
  let html: string | undefined;
  if (TEMPLATES.includes(id)) html = renderTemplate(id as TemplateName, { ...SAMPLE, siteUrl: await siteUrl() });
  else if (/^\d+$/.test(id)) html = (await one("select html from emails where id = $1", [id]))?.html;
  if (!html) return new Response("Not found", { status: 404 });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "sandbox; default-src 'none'; img-src * data:; style-src 'unsafe-inline'", "Cache-Control": "private, no-store" } });
}
