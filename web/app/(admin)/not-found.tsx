import { StatePage } from "@/components/state-page";

export const metadata = { title: "Page not found" };

export default function AdminNotFound() {
  return <StatePage code="ERROR 404" title="We cannot find that page" text="The link may be old or mistyped." home="/admin/dashboard" actions={<a className="a-btn a-btn--primary" href="/admin/dashboard">Back to dashboard</a>} />;
}
