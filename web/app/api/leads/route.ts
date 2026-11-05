import { pool } from "@/lib/db";
import { validateLead } from "@/lib/lead";

const MAX_BODY_BYTES = 8 * 1024;
const LEADS_PER_MINUTE = 30;

const json = (status: number, body: object) => Response.json(body, { status });

// Stops reading at the limit, so a body without a Content-Length cannot fill memory.
async function readBody(req: Request): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.length;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

export async function POST(req: Request) {
  if (!/^application\/json\b/.test(req.headers.get("content-type") ?? "")) return json(415, { error: "Send JSON" });

  const text = await readBody(req);
  if (text === null) return json(413, { error: "Too large" });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  // Honeypot: bots fill the hidden field, get a success, and nothing is saved.
  if ((body as { company?: unknown } | null)?.company) return json(201, { ok: true });

  const { lead, errors } = validateLead(body);
  if (!lead) return json(400, { errors });

  try {
    // ponytail: one site-wide cap keeps a flood out of the table. Per-IP limits need trusted proxy headers, add with the real host.
    const { rows } = await pool.query("select count(*)::int as n from leads where created_at > now() - interval '1 minute'");
    if (rows[0].n >= LEADS_PER_MINUTE) return json(429, { error: "Try again soon" });

    await pool.query("insert into leads (first_name, last_name, email, phone) values ($1, $2, $3, $4)", [lead.firstName, lead.lastName, lead.email, lead.phone]);
  } catch (error) {
    console.error("Could not save lead:", error instanceof Error ? error.message : error);
    return json(500, { error: "Could not save" });
  }
  return json(201, { ok: true });
}
