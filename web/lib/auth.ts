import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { many, one, pool, type Row } from "./db";
import { audit } from "./events";
import { clientIp, isHttps } from "./http";
import { checkPassword, hashToken, newToken } from "./secure";
import { getSettings } from "./settings";

const COOKIE = "anoglobe_admin";
const IDLE_MS = 30 * 60 * 1000;
const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;
const WORK_DAY_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type AdminUser = Row & { id: string; name: string; email: string; role: "owner" | "admin" | "bookkeeper" | "viewer" };

/** Who can change what. Viewers read only; bookkeepers work with clients; payments, team and settings are for owner and admin. */
export const canManage = (user: AdminUser) => user.role === "owner" || user.role === "admin";
export const canEditClients = (user: AdminUser) => user.role !== "viewer";

export async function login(email: string, password: string, remember: boolean): Promise<"ok" | "locked" | "wrong"> {
  const user = await one<AdminUser>("select * from admin_users where lower(email) = lower($1)", [email]);
  const ip = await clientIp();
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    checkPassword(password, null); // Same timing as a real check.
    return "locked";
  }
  const usable = user?.status === "active" ? user.password_hash : null;
  if (!checkPassword(password, usable)) {
    if (user) {
      const updated = await one("update admin_users set failed_attempts = failed_attempts + 1, locked_until = case when failed_attempts + 1 >= $2 then now() + interval '15 minutes' else null end where id = $1 returning failed_attempts", [user.id, MAX_ATTEMPTS]);
      await audit(user.name, `failed sign-in attempt ${updated?.failed_attempts}`, { icon: "lock", ip });
    }
    return "wrong";
  }
  await pool.query("update admin_users set failed_attempts = 0, locked_until = null, last_active_at = now() where id = $1", [user!.id]);
  await startSession(user!.id, remember);
  await audit(user!.name, "signed in", { icon: "user", ip });
  return "ok";
}

export async function startSession(userId: string, remember: boolean) {
  const token = newToken();
  const ms = remember ? REMEMBER_MS : WORK_DAY_MS;
  await pool.query("insert into admin_sessions (hash, user_id, user_agent, ip, remember, expires_at) values ($1, $2, $3, $4, $5, now() + $6 * interval '1 millisecond')", [
    hashToken(token),
    userId,
    (await headers()).get("user-agent")?.slice(0, 300) ?? "",
    await clientIp(),
    remember,
    ms,
  ]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: await isHttps(), path: "/", maxAge: ms / 1000 });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await pool.query("delete from admin_sessions where hash = $1", [hashToken(token)]);
  store.delete(COOKIE);
}

/** The signed-in user, or null. A session idle past the limit is deleted, unless "keep me signed in" was ticked. */
export async function currentUser(): Promise<(AdminUser & { sessionHash: string }) | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const hash = hashToken(token);
  const row = await one<AdminUser & { sessionHash: string; expires_at: Date; last_seen_at: Date; remember: boolean }>(
    `select u.*, s.hash as "sessionHash", s.expires_at, s.last_seen_at, s.remember from admin_sessions s join admin_users u on u.id = s.user_id where s.hash = $1 and u.status = 'active'`,
    [hash],
  );
  if (!row) return null;
  const { idleSignout } = await getSettings();
  const idle = idleSignout && !row.remember && Date.now() - new Date(row.last_seen_at).getTime() > IDLE_MS;
  if (idle || new Date(row.expires_at) < new Date()) {
    await pool.query("delete from admin_sessions where hash = $1", [hash]);
    return null;
  }
  // Light write: at most once a minute per session.
  if (Date.now() - new Date(row.last_seen_at).getTime() > 60_000) {
    await pool.query("update admin_sessions set last_seen_at = now() where hash = $1", [hash]);
    await pool.query("update admin_users set last_active_at = now() where id = $1", [row.id]);
  }
  return row;
}

/** For admin pages. No cookie goes to sign in; a dead session explains why. */
export async function requireUser(allow?: (user: AdminUser) => boolean) {
  const user = await currentUser();
  if (!user) redirect((await cookies()).get(COOKIE) ? "/admin/session-expired" : "/admin/login");
  if (allow && !allow(user)) redirect("/admin/permission-denied");
  return user;
}

export async function userSessions(userId: string) {
  return many("select hash, user_agent, ip, last_seen_at from admin_sessions where user_id = $1 and expires_at > now() order by last_seen_at desc", [userId]);
}
