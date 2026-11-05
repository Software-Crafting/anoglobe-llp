import type { Metadata } from "next";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Back shortly" };

// Shown when MAINTENANCE_MODE=1 (see proxy.ts). The site's header and footer stay around it.
export default function MaintenancePage() {
  return (
    <main id="main" className="a-onb a-onb--single">
      <div className="a-onb__main"><div className="a-onb__card"><div className="a-result">
        <svg className="a-illus a-illus--96" aria-hidden="true"><use href="#illus-documents" /></svg>
        <p className="a-state__code">MAINTENANCE</p>
        <h1 className="a-result__title">Back shortly</h1>
        <p className="a-result__text">We are updating the system. Payments and signups are paused during this time. No data is affected.</p>
        <a className="a-btn a-btn--outline" href="mailto:hello@anoglobebookkeeping.com"><Icon name="mail" />Email us</a>
      </div></div></div>
    </main>
  );
}
