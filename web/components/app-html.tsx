import type { ReactNode } from "react";
import { SPRITE } from "./sprite-app";
// Design system stylesheets, in its own order.
import "@/app/styles/tokens.css";
import "@/app/styles/base.css";
import "@/app/styles/layout.css";
import "@/app/styles/components/foundations.css";
import "@/app/styles/components/forms.css";
import "@/app/styles/components/overlays.css";
import "@/app/styles/components/data.css";
import "@/app/styles/components/payment.css";
import "@/app/styles/components/admin.css";
import "@/app/styles/components/feedback.css";
import "@/app/styles/pages.css";
import "@/app/styles/app.css";

/** Root document for onboarding, admin and the state pages. */
export function AppHtml({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <svg className="a-sprite" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: SPRITE }} />
      </body>
    </html>
  );
}
