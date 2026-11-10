import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContactWidget } from "@/components/contact";
import { SiteBehaviour } from "@/components/site-behaviour";
import { SPRITE } from "@/components/sprite";
import { Icon } from "@/components/ui";
// Template stylesheets, in the template's order; site.css holds the live site's additions.
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/layout.css";
import "../styles/components/foundations.css";
import "../styles/components/forms.css";
import "../styles/components/overlays.css";
import "../styles/pages.css";
import "../styles/site-v2.css";
import "../styles/site-v2-plus.css";
import "../styles/site.css";

const title = "Anoglobe Bookkeeping | Bookkeeping for US small businesses";
const description = "Bookkeeping for US small businesses by real people. Perfect rating, CFO-level reports, simple review, $270 a month with no hidden fees.";

export const metadata: Metadata = {
  title: { default: title, template: "%s | Anoglobe Bookkeeping" },
  description,
  icons: { icon: { url: "/assets/img/favicon.svg", type: "image/svg+xml" } },
  openGraph: { type: "website", title, description, siteName: "Anoglobe Bookkeeping" },
};

// Runs before first paint so revealed content never flashes. Without JS or with reduced motion the page stays static.
const MOTION_GATE = `if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.motion="on"`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      </head>
      <body className="v2 v2-plus v2--polished">
        <a className="a-skip-link" href="#main">Skip to content</a>
        <header className="v2-wrap v2-header">
          <Link href="/"><img className="a-logo" src="/assets/img/logo.svg" width={223} height={28} alt="Anoglobe Bookkeeping" /></Link>
          <div className="v2-header__actions">
            <a className="a-btn a-btn--lg v2-btn-outline" href="/#how"><Icon name="play" />How It Works</a>
            <a className="a-btn a-btn--primary a-btn--lg" href="/#get-started">Ready to Work With Us?<Icon name="arrow-right" /></a>
          </div>
        </header>
        {children}
        <footer className="v2-footer" data-theme="dark">
          <div className="v2-wrap">
            <img className="a-logo" src="/assets/img/logo-reversed.svg" width={223} height={28} alt="Anoglobe Bookkeeping" />
            <p>&copy; 2026 Anoglobe LLP. All rights reserved.</p>
            <ul role="list">
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><a href="#main">Back to top</a></li>
            </ul>
          </div>
        </footer>
        <ContactWidget />
        <svg className="a-sprite" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: SPRITE }} />
        <SiteBehaviour />
      </body>
    </html>
  );
}
