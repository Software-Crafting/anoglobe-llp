"use client";

import { StatePage } from "@/components/state-page";

export default function AdminError({ reset }: { reset: () => void }) {
  return <StatePage code="ERROR 500" title="Something went wrong on our side" text="Your information is safe. Try again in a minute; if it keeps happening, email us and include the time." home="/admin/dashboard" actions={<><button type="button" className="a-btn a-btn--primary" onClick={reset}>Try again</button><a className="a-btn a-btn--outline" href="/admin/dashboard">Back to dashboard</a></>} />;
}
