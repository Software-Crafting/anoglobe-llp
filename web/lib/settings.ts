import { many, pool } from "./db";

// Every toggle here changes real behaviour. Secrets stay in .env.local and are never stored or shown.
export const DEFAULTS = {
  businessName: "Anoglobe LLP",
  brandName: "Anoglobe Bookkeeping",
  supportEmail: "hello@anoglobebookkeeping.com",
  senderName: "Anoglobe Bookkeeping",
  fromEmail: "hello@anoglobebookkeeping.com",
  teamEmail: "team@anoglobebookkeeping.com",
  sendSignup: true,
  sendPayment: true,
  notifyPayment: true,
  notifySignup: true,
  notifyFailed: true,
  callAfterSignup: true,
  callAfterPayment: true,
  idleSignout: true,
};

export type Settings = typeof DEFAULTS;

export async function getSettings(): Promise<Settings> {
  const rows = await many<{ key: string; value: unknown }>("select key, value from settings");
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
}

export async function saveSettings(values: Partial<Settings>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULTS)) continue;
    await pool.query("insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = $2", [key, JSON.stringify(value)]);
  }
}
