import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { audit } from "@/lib/events";
import { clientIp, seeOther } from "@/lib/http";
import { readFile } from "@/lib/uploads";

const VIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png"]);

/** Signed-in team only. Files are decrypted here and never served from a public path. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return seeOther("/admin/login");
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  const doc = await one("select * from documents where id = $1", [id]);
  if (!doc) return new Response("Not found", { status: 404 });
  const inline = new URL(req.url).searchParams.has("view") && VIEWABLE.has(doc.mime);
  let body: Buffer;
  try {
    body = await readFile(doc.storage_key);
  } catch {
    return new Response("That file is missing from storage.", { status: 410 });
  }
  await audit(user.name, `opened ${doc.filename}`, { registrationId: doc.registration_id, icon: "download", ip: await clientIp() });
  const safeName = String(doc.filename).replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "Cache-Control": "private, no-store",
    },
  });
}
