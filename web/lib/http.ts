import { cookies, headers } from "next/headers";

/** Redirect after a form post. The relative Location works behind any proxy or port. */
export function seeOther(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}

/** One-shot toast shown on the next page by public/assets/js/app.js. */
export async function flash(message: string, variant: "success" | "info" | "destructive" = "success") {
  (await cookies()).set("flash", JSON.stringify({ message, variant }), { path: "/", maxAge: 60, sameSite: "lax" }); // Next URL-encodes the value.
}

/** Rejects cross-site posts. Cookies are SameSite=Lax as well; this covers older browsers and same-site subdomains. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function isHttps(): Promise<boolean> {
  return (await headers()).get("x-forwarded-proto") === "https";
}

export async function siteUrl(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export const maintenanceOn = () => process.env.MAINTENANCE_MODE === "1";

export function formText(form: FormData, name: string, max = 500): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
