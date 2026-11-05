import type { Metadata } from "next";
import { StatePage } from "@/components/state-page";
import { currentUser } from "@/lib/auth";
import { ROLES } from "@/lib/format";

export const metadata: Metadata = { title: "You do not have access" };

export default async function PermissionDeniedPage() {
  const user = await currentUser();
  return <StatePage code="ERROR 403" title="You do not have access to this page" text={`Your role is ${user ? ROLES[user.role] : "unknown"}. Ask an admin to change your role if you need to manage payments or settings.`} home="/admin/dashboard" actions={<a className="a-btn a-btn--primary" href="/admin/dashboard">Back to dashboard</a>} />;
}
