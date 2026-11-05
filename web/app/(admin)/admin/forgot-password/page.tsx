import type { Metadata } from "next";
import { DesignJs } from "@/components/design-js";
import { TextField } from "@/components/fields";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <main id="main" className="a-auth">
      <div className="a-auth__card">
        <img className="a-logo" src="/assets/img/logo.svg" width={223} height={28} alt="Anoglobe Bookkeeping" />
        {sent ? (
          <div className="a-result">
            <svg className="a-illus a-illus--96" aria-hidden="true"><use href="#illus-documents" /></svg>
            <h1 className="a-result__title" tabIndex={-1}>Check your email</h1>
            <p className="a-result__text">If that address belongs to a team account, a reset link is on its way.</p>
          </div>
        ) : (
          <div className="a-form-grid">
            <div className="a-auth__head"><h1>Reset your password</h1><p>Enter your work email and we will send a reset link that lasts 30 minutes.</p></div>
            <form className="a-form-grid" method="post" action="/api/admin/auth/forgot" data-validate-form="" noValidate>
              <TextField name="reset-email" label="Work email" type="email" required msgRequired="Enter your work email" msgPattern="Enter an email like name@company.com" autoComplete="username" />
              <button type="submit" className="a-btn a-btn--primary a-btn--block">Send reset link</button>
            </form>
          </div>
        )}
        <p className="a-auth__foot"><a href="/admin/login">Back to sign in</a></p>
      </div>
      <DesignJs />
    </main>
  );
}
