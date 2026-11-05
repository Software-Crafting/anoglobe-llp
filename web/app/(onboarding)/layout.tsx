import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHtml } from "@/components/app-html";
import { Icon } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "Get started | Anoglobe Bookkeeping", template: "%s | Anoglobe Bookkeeping" },
  icons: { icon: { url: "/assets/img/favicon.svg", type: "image/svg+xml" } },
  robots: { index: false },
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <AppHtml>
      <a className="a-skip-link" href="#main">Skip to content</a>
      <header className="a-onb-header">
        <a className="a-onb-header__brand" href="/"><img className="a-logo" src="/assets/img/logo.svg" width={223} height={28} alt="Anoglobe Bookkeeping" /></a>
        <div className="a-onb-header__tools">
          <span className="a-badge a-badge--success a-onb-header__secure"><Icon name="lock" />Secure signup</span>
          <a className="a-btn a-btn--ghost a-btn--sm" href="mailto:hello@anoglobebookkeeping.com"><Icon name="help-circle" /><span className="a-onb-header__help-text">Help</span></a>
        </div>
      </header>
      <div className="a-toast-region" data-icons="check-circle x-circle info alert-triangle close" />
      {children}
      <footer className="a-onb-footer">
        <p className="a-small a-muted">Your information is encrypted in transit. Card details go directly to our payment processor and are never stored by Anoglobe.</p>
      </footer>
    </AppHtml>
  );
}
