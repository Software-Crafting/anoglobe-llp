const TZ = "America/New_York";

export const money = (cents: number | null | undefined) =>
  cents == null ? "" : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const shortDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }) : "";

export const dateTime = (d: Date | string | null | undefined) =>
  d ? `${new Date(d).toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} ET` : "";

/** Sort key for data-sort attributes. */
export const isoDate = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : "");

/** "11/20/2026" and "14:30" typed as Eastern Time, as a real instant. Null if the date does not exist. */
export function easternTime(date: string, time: string): Date | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const guess = new Date(Date.UTC(Number(d[3]), Number(d[1]) - 1, Number(d[2]), Number(t[1]), Number(t[2])));
  if (guess.getUTCMonth() !== Number(d[1]) - 1 || guess.getUTCDate() !== Number(d[2])) return null;
  const inZone = (zone: string) => new Date(guess.toLocaleString("en-US", { timeZone: zone })).getTime();
  return new Date(guess.getTime() + inZone("UTC") - inZone(TZ));
}

export const duration = (seconds: number | null | undefined) => (seconds == null ? "" : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`);

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function initials(name: string | null | undefined): string {
  const words = (name ?? "").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

type Tone = "success" | "warning" | "destructive" | "info" | "neutral";

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "In progress", tone: "neutral" },
  pending: { label: "Pending documents", tone: "warning" },
  review: { label: "In review", tone: "info" },
  active: { label: "Active", tone: "success" },
  failed: { label: "Payment failed", tone: "destructive" },
  paused: { label: "Paused", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  succeeded: { label: "Succeeded", tone: "success" },
  refunded: { label: "Refunded", tone: "neutral" },
  queued: { label: "Queued", tone: "info" },
  ringing: { label: "Ringing", tone: "info" },
  answered: { label: "Answered", tone: "success" },
  noanswer: { label: "No answer", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  not_sent: { label: "Not sent", tone: "warning" },
  invited: { label: "Invited", tone: "info" },
  disabled: { label: "No access", tone: "neutral" },
};

export const TRIGGERS: Record<string, string> = { signup: "After signup", payment: "After payment", manual: "Manual", test: "Test call", scheduled: "Scheduled" };

export const TEMPLATES: Record<string, string> = {
  "signup-confirmation": "Signup confirmation",
  "payment-confirmation": "Payment confirmation",
  "team-notification": "Team notification",
  "payment-failed": "Payment failed",
  "call-scheduled": "Call scheduled",
  "team-access": "Team access",
  "resume-link": "Resume link",
};

export const KINDS: Record<string, string> = { "bank-statement": "Bank statement", "tax-return": "Tax return", "chart-of-accounts": "Chart of accounts" };

export const ROLES: Record<string, string> = { owner: "Owner", admin: "Admin", bookkeeper: "Bookkeeper", viewer: "Viewer" };
