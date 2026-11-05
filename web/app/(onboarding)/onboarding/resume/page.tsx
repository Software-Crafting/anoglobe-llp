import type { Metadata } from "next";
import { DesignJs } from "@/components/design-js";
import { TextField } from "@/components/fields";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Save and continue later" };

export default async function ResumePage({ searchParams }: { searchParams: Promise<{ sent?: string; saved?: string; expired?: string }> }) {
  const { sent, saved, expired } = await searchParams;
  return (
    <main id="main" className="a-onb a-onb--single">
      <div className="a-onb__main">
        <div className="a-onb__card">
          {sent ? (
            <>
              <div className="a-result">
                <svg className="a-illus a-illus--96" aria-hidden="true"><use href="#illus-documents" /></svg>
                <h1 className="a-result__title" tabIndex={-1}>Check your email</h1>
                <p className="a-result__text">If an application exists for that address, a link is on its way. It can take a minute to arrive.</p>
              </div>
              <div className="a-form-actions"><a className="a-btn a-btn--ghost" href="/onboarding/resume">Send it again</a><a className="a-btn a-btn--primary" href="/onboarding">Return to signup</a></div>
            </>
          ) : (
            <>
              <div className="a-onb__head">
                <h1>Save and continue later</h1>
                <p>{saved ? "Your answers are saved. " : ""}We will email you a secure link that brings you back to where you left off. Links last 7 days.</p>
              </div>
              {expired && <div className="a-alert a-alert--warning" role="alert"><Icon name="alert-triangle" /><p className="a-alert__title">That link has expired</p><p className="a-alert__body">Enter your email for a new one.</p></div>}
              <form className="a-form-grid" method="post" action="/api/onboarding/resume" data-validate-form="" noValidate>
                <TextField name="resume-email" label="Email" type="email" required msgRequired="Enter the email you signed up with" msgPattern="Enter an email like name@company.com" placeholder="you@company.com" autoComplete="email" />
                <div className="a-form-actions">
                  <a className="a-btn a-btn--ghost" href="/onboarding"><Icon name="arrow-left" />Back to signup</a>
                  <button type="submit" className="a-btn a-btn--primary"><Icon name="send" />Email me a link</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <DesignJs />
    </main>
  );
}
