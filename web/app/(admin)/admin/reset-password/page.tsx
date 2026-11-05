import type { Metadata } from "next";
import { DesignJs } from "@/components/design-js";
import { TextField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { one } from "@/lib/db";
import { hashToken } from "@/lib/secure";

export const metadata: Metadata = { title: "Choose a password" };

const PROBLEMS: Record<string, string> = { short: "Use at least 10 characters.", match: "The passwords do not match." };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const valid = token ? await one("select name from admin_users where reset_hash = $1 and reset_expires > now() and status <> 'disabled'", [hashToken(token)]) : null;
  return (
    <main id="main" className="a-auth">
      <div className="a-auth__card">
        <img className="a-logo" src="/assets/img/logo.svg" width={223} height={28} alt="Anoglobe Bookkeeping" />
        {valid ? (
          <>
            <div className="a-auth__head"><h1>Choose a password</h1><p>For {valid.name}.</p></div>
            {error && PROBLEMS[error] && <div className="a-alert a-alert--destructive" role="alert"><Icon name="x-circle" /><p className="a-alert__title">{PROBLEMS[error]}</p></div>}
            <form className="a-form-grid" method="post" action="/api/admin/auth/reset" data-validate-form="" noValidate>
              <input type="hidden" name="token" value={token} />
              <TextField name="password" label="New password" type="password" required minLength={10} msgRequired="Choose a password" autoComplete="new-password" hint="At least 10 characters." />
              <TextField name="password-confirm" label="Repeat password" type="password" required msgRequired="Repeat your password" autoComplete="new-password" />
              <button type="submit" className="a-btn a-btn--primary a-btn--block">Save password</button>
            </form>
          </>
        ) : (
          <div className="a-result">
            <h1 className="a-result__title">That link has expired</h1>
            <p className="a-result__text">Reset links last 30 minutes. Ask for a new one.</p>
            <a className="a-btn a-btn--primary" href="/admin/forgot-password">Send a new link</a>
          </div>
        )}
      </div>
      <DesignJs />
    </main>
  );
}
