import type { Metadata } from "next";
import { StatePage } from "@/components/state-page";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "You were signed out" };

export default function SessionExpiredPage() {
  return <StatePage code="SESSION EXPIRED" title="You were signed out" illus="illus-documents" text="For security, the admin signs you out after 30 minutes without activity. Sign in again to continue where you left off." home="/admin/login" actions={<a className="a-btn a-btn--primary" href="/admin/login"><Icon name="lock" />Sign in again</a>} />;
}
