import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell, crumbsFromDashboard, PageHeader } from "@/components/admin-ui";
import { TextField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { canManage, requireUser } from "@/lib/auth";
import { getSettings, type Settings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

const TABS: [string, string, string][] = [["general", "settings", "General"], ["gateway", "credit-card", "Payment gateway"], ["email", "mail", "Email"], ["calling", "phone-call", "AI calling"], ["alerts", "bell", "Notifications"], ["security", "shield-check", "Security"]];

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="a-settings-section" aria-label={title}>
      <div className="a-settings-section__intro"><h2 className="a-settings-section__title">{title}</h2><p className="a-settings-section__text">{text}</p></div>
      <div className="a-card"><div className="a-card__content a-form-grid">{children}</div></div>
    </section>
  );
}

function SaveForm({ fields, children }: { fields: (keyof Settings)[]; children: ReactNode }) {
  return (
    <form method="post" action="/api/admin" data-dirty-form="">
      <input type="hidden" name="_action" value="settings.save" />
      <input type="hidden" name="_back" value="/admin/settings" />
      <input type="hidden" name="_fields" value={fields.join(",")} />
      {children}
      <div className="a-save-bar" data-save-bar="" hidden role="region" aria-label="Unsaved changes">
        <span>You have unsaved changes</span>
        <div className="a-save-bar__actions"><button type="button" className="a-btn a-btn--ghost a-btn--sm" data-discard="">Discard</button><button type="submit" className="a-btn a-btn--primary a-btn--sm">Save changes</button></div>
      </div>
    </form>
  );
}

const Switch = ({ name, label, on }: { name: keyof Settings; label: string; on: boolean }) => (
  <label className="a-switch"><input className="a-switch__input" type="checkbox" role="switch" name={name} defaultChecked={on} />{label}</label>
);

const ConfigRow = ({ label, on, onText, offText }: { label: string; on: boolean; onText: string; offText: string }) => (
  <div className="a-field"><p className="a-label">{label}</p><p><span className={`a-status a-status--${on ? "success" : "warning"}`}>{on ? onText : offText}</span></p></div>
);

export default async function SettingsPage() {
  const user = await requireUser(canManage);
  const s = await getSettings();
  const testMode = process.env.PAYMENTS_MODE === "test";
  return (
    <AdminShell user={user} active="settings">
      <PageHeader title="Settings" crumbs={crumbsFromDashboard} description="Business details, integrations and notifications." />
      <div className="a-tabs a-page-tabs" data-tabs="">
        <div role="tablist" className="a-tabs__list" data-scroll-area="" aria-label="Settings sections">
          {TABS.map(([tab, icon, text], index) => <button type="button" role="tab" className="a-tabs__tab" id={`st-${tab}`} aria-controls={`sp-${tab}`} aria-selected={index === 0} key={tab}><Icon name={icon} />{text}</button>)}
        </div>
        <div role="tabpanel" className="a-tabs__panel" id="sp-general" aria-labelledby="st-general" tabIndex={0}>
          <SaveForm fields={["businessName", "brandName", "supportEmail"]}>
            <Section title="Business" text="Shown on receipts and emails.">
              <TextField name="businessName" label="Business name" defaultValue={s.businessName} />
              <TextField name="brandName" label="Brand name" defaultValue={s.brandName} />
              <TextField name="supportEmail" label="Support email" type="email" defaultValue={s.supportEmail} />
            </Section>
          </SaveForm>
        </div>
        <div role="tabpanel" className="a-tabs__panel" id="sp-gateway" aria-labelledby="st-gateway" tabIndex={0} hidden>
          <Section title="Payment gateway" text="Keys live in the server's .env.local and are never shown here.">
            {testMode && <div className="a-alert a-alert--warning" role="note"><Icon name="alert-triangle" /><p className="a-alert__title">Test mode</p><p className="a-alert__body">No real charges are made until Stripe is connected.</p></div>}
            <ConfigRow label="Mode" on={testMode} onText="Test" offText="Payments off" />
            <ConfigRow label="Stripe keys" on={Boolean(process.env.STRIPE_SECRET_KEY)} onText="Added" offText="Not added" />
          </Section>
        </div>
        <div role="tabpanel" className="a-tabs__panel" id="sp-email" aria-labelledby="st-email" tabIndex={0} hidden>
          <SaveForm fields={["senderName", "fromEmail", "teamEmail", "sendSignup", "sendPayment", "notifyPayment"]}>
            <Section title="Sending" text="Signup and payment emails go out from this address.">
              <ConfigRow label="Mail server" on={Boolean(process.env.SMTP_URL)} onText="Connected" offText="Not set up, emails are kept but not sent" />
              <TextField name="senderName" label="Sender name" defaultValue={s.senderName} />
              <TextField name="fromEmail" label="From address" type="email" defaultValue={s.fromEmail} />
              <TextField name="teamEmail" label="Team notification address" type="email" defaultValue={s.teamEmail} />
              <Switch name="sendSignup" label="Send signup confirmation" on={s.sendSignup} />
              <Switch name="sendPayment" label="Send payment confirmation" on={s.sendPayment} />
              <Switch name="notifyPayment" label="Notify the team on new payments" on={s.notifyPayment} />
            </Section>
          </SaveForm>
        </div>
        <div role="tabpanel" className="a-tabs__panel" id="sp-calling" aria-labelledby="st-calling" tabIndex={0} hidden>
          <SaveForm fields={["callAfterSignup", "callAfterPayment"]}>
            <Section title="Calling provider" text="Scripts and voice are managed in the provider account.">
              <ConfigRow label="Provider" on={false} onText="Connected" offText="Not connected, calls wait in the queue" />
              <Switch name="callAfterSignup" label="Call after signup" on={s.callAfterSignup} />
              <Switch name="callAfterPayment" label="Call after successful payment" on={s.callAfterPayment} />
            </Section>
          </SaveForm>
          <p className="a-small"><a href="/admin/ai-calls">Go to AI calls to place a test call</a></p>
        </div>
        <div role="tabpanel" className="a-tabs__panel" id="sp-alerts" aria-labelledby="st-alerts" tabIndex={0} hidden>
          <SaveForm fields={["notifySignup", "notifyFailed"]}>
            <Section title="Team alerts" text="Choose what the team hears about.">
              <Switch name="notifySignup" label="New signup" on={s.notifySignup} />
              <Switch name="notifyFailed" label="Payment failed" on={s.notifyFailed} />
            </Section>
          </SaveForm>
        </div>
        <div role="tabpanel" className="a-tabs__panel" id="sp-security" aria-labelledby="st-security" tabIndex={0} hidden>
          <SaveForm fields={["idleSignout"]}>
            <Section title="Access" text="Sign-in rules for the admin panel.">
              <Switch name="idleSignout" label="Sign out after 30 minutes idle" on={s.idleSignout} />
              <p className="a-small a-muted">Accounts lock for 15 minutes after 5 wrong passwords.</p>
            </Section>
          </SaveForm>
        </div>
      </div>
    </AdminShell>
  );
}
