import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DesignJs } from "@/components/design-js";
import { Field, TextField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/admin/dashboard");
  const { error } = await searchParams;
  return (
    <main id="main" className="a-auth">
      <div className="a-auth__card">
        <img className="a-logo" src="/assets/img/logo.svg" width={223} height={28} alt="Anoglobe Bookkeeping" />
        <div className="a-auth__head"><h1>Sign in to Anoglobe Admin</h1><p>For the Anoglobe team only.</p></div>
        {error === "wrong" && <div className="a-alert a-alert--destructive" role="alert"><Icon name="x-circle" /><p className="a-alert__title">That email and password do not match</p><p className="a-alert__body">Check both and try again. After 5 attempts the account locks for 15 minutes.</p></div>}
        {error === "locked" && <div className="a-alert a-alert--destructive" role="alert"><Icon name="lock" /><p className="a-alert__title">This account is locked for 15 minutes</p><p className="a-alert__body">Too many attempts. Try again later or reset your password.</p></div>}
        <form className="a-form-grid" method="post" action="/api/admin/auth/login" data-validate-form="" noValidate>
          <TextField name="login-email" label="Work email" type="email" required msgRequired="Enter your work email" msgPattern="Enter an email like name@company.com" autoComplete="username" />
          <Field id="login-password" label="Password" msgRequired="Enter your password">
            <div data-password="" className="a-input-group">
              <input className="a-input" id="login-password" name="login-password" type="password" autoComplete="current-password" required aria-describedby="login-password-error" />
              <button type="button" className="a-input-group__action" data-password-toggle="" aria-pressed="false" aria-label="Show password"><Icon name="eye" className="a-password__show" /><Icon name="eye-off" className="a-password__hide" /></button>
            </div>
          </Field>
          <p className="a-small"><a href="/admin/forgot-password">Forgot password?</a></p>
          <label className="a-check"><input className="a-check__input" type="checkbox" id="login-remember" name="login-remember" /><span className="a-check__label">Keep me signed in for 7 days</span></label>
          <button type="submit" className="a-btn a-btn--primary a-btn--block">Sign in</button>
        </form>
      </div>
      <div className="a-toast-region" data-icons="check-circle x-circle info alert-triangle close" />
      <DesignJs />
    </main>
  );
}
