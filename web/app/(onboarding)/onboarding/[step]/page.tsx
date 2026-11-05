import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DesignJs } from "@/components/design-js";
import { Field, SelectField, TextField } from "@/components/fields";
import { OrderSummary } from "@/components/order-summary";
import { Icon } from "@/components/ui";
import type { Row } from "@/lib/db";
import { fileSize, KINDS, money } from "@/lib/format";
import { currentRegistration, entityLabel, isOpen, label, OPTIONS, registrationDocuments, STEP_LABELS, STEP_TITLES, STEPS, type Step } from "@/lib/onboarding";
import { authText, CATCHUP_MONTH_CENTS, MONTHLY_CENTS, quote } from "@/lib/plans";

type Props = { params: Promise<{ step: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  return { title: STEP_TITLES[step as Step] ?? "Get started" };
}

const INTRO: Record<Step, string> = {
  account: "Tell us who you are. This takes about 10 minutes in total.",
  business: "We use this to set up your books and file-ready records.",
  services: "Choose services and tell us about your books today.",
  documents: "Statements help us review your books before the welcome call.",
  plan: "One flat monthly fee, or catch-up work billed by the month.",
  review: "Check everything before you pay. You can edit any section.",
  payment: "Pay securely. Your card is charged only when you click Pay.",
};

export default async function StepPage({ params, searchParams }: Props) {
  const { step: raw } = await params;
  const { error } = await searchParams;
  if (!STEPS.includes(raw as Step)) notFound();
  const step = raw as Step;
  const reg = await currentRegistration();
  if (!reg && step !== "account") redirect("/onboarding/account");
  if (reg && !isOpen(reg) && step !== "documents") redirect("/onboarding/success");

  const d: Row = reg?.data ?? {};
  const index = STEPS.indexOf(step);
  const quoted = quote(reg?.plan, reg?.catchup_months);

  return (
    <div className="a-onb">
      <OrderSummary reg={reg} />
      <main id="main" className="a-onb__main">
        <div className="a-onb__progress">
          <div className="a-onb__progress-label"><span>Step {index + 1} of {STEPS.length}</span>{reg && <a href="/onboarding/resume">Save and continue later</a>}</div>
          <ol className="a-steps" aria-label="Onboarding progress">
            {STEPS.map((name, i) => (
              <li className={`a-steps__item${i < index ? " is-complete" : ""}`} aria-current={i === index ? "step" : undefined} key={name}>
                <span className="a-steps__bar" /><span className="a-steps__label"><span className="a-steps__text">{STEP_LABELS[name]}</span></span>
              </li>
            ))}
          </ol>
        </div>
        <div className="a-onb__card">
          <div className="a-onb__head"><h1 tabIndex={-1}>{STEP_TITLES[step]}</h1><p>{INTRO[step]}</p></div>
          {error && <div className="a-alert a-alert--destructive" role="alert"><Icon name="x-circle" /><p className="a-alert__title">{error}</p></div>}
          {step === "account" && <AccountStep d={d} reg={reg} />}
          {step === "business" && <BusinessStep d={d} hasEin={Boolean(reg?.ein_enc)} />}
          {step === "services" && <ServicesStep d={d} />}
          {step === "documents" && <DocumentsStep reg={reg!} />}
          {step === "plan" && <PlanStep reg={reg!} />}
          {step === "review" && <ReviewStep reg={reg!} />}
          {step === "payment" && <PaymentStep reg={reg!} amount={money(quoted?.amountCents)} />}
        </div>
      </main>
      <DesignJs />
    </div>
  );
}

function Actions({ step, submit = "Continue", showLater = true }: { step: Step; submit?: string; showLater?: boolean }) {
  const previous = STEPS[STEPS.indexOf(step) - 1];
  return (
    <div className="a-form-actions">
      {previous ? <a className="a-btn a-btn--ghost" href={`/onboarding/${previous}`}><Icon name="arrow-left" />Back</a> : <a className="a-btn a-btn--ghost" href="/"><Icon name="arrow-left" />Back to website</a>}
      <div className="a-form-actions__end">
        {showLater && <button type="button" className="a-btn a-btn--outline" data-save-later>Save for later</button>}
        <button type="submit" className="a-btn a-btn--primary">{submit}<Icon name="arrow-right" /></button>
      </div>
    </div>
  );
}

const stepForm = (step: Step) => ({ className: "a-form-grid", method: "post" as const, action: `/api/onboarding/${step}`, "data-validate-form": "", noValidate: true });

function AccountStep({ d, reg }: { d: Row; reg: Row | null }) {
  return (
    <form {...stepForm("account")}>
      <div className="a-form-grid a-form-grid--2">
        <TextField name="first-name" label="First name" required msgRequired="Enter your first name" autoComplete="given-name" defaultValue={d["first-name"]} />
        <TextField name="last-name" label="Last name" required msgRequired="Enter your last name" autoComplete="family-name" defaultValue={d["last-name"]} />
        <TextField name="email" label="Work email" type="email" full required msgRequired="Enter your work email" msgPattern="Enter an email like name@company.com" placeholder="you@company.com" autoComplete="email" hint="We send your confirmation and receipts here." defaultValue={d.email} />
        <TextField name="phone" id="phone-number" label="Phone" type="tel" full required mask="phone" msgRequired="Enter your phone number" msgPattern="Enter a 10 digit US phone number" placeholder="(415) 555-0132" inputMode="tel" autoComplete="tel-national" hint="Our onboarding assistant calls this number to confirm your details." defaultValue={d.phone} />
        <SelectField name="role" label="Your role" full required msgRequired="Choose your role" placeholder="Choose your role" options={OPTIONS.roles} value={d.role} />
      </div>
      <Actions step="account" showLater={Boolean(reg)} />
    </form>
  );
}

function BusinessStep({ d, hasEin }: { d: Row; hasEin: boolean }) {
  return (
    <form {...stepForm("business")}>
      <div className="a-form-grid a-form-grid--2">
        <TextField name="legal-name" label="Legal business name" full required msgRequired="Enter your legal business name" hint="As registered with the IRS." defaultValue={d["legal-name"]} />
        <TextField name="dba" label="Doing business as" full optional defaultValue={d.dba} />
        <SelectField name="entity" label="Entity type" required msgRequired="Choose your entity type" placeholder="Choose entity type" groups={OPTIONS.entities} value={d.entity} />
        <TextField name="ein" label="EIN" required mask="ein" inputMode="numeric" msgRequired="Enter your EIN" msgPattern="Use 9 digits, like 12-3456789" hint={hasEin ? "Saved and encrypted. Enter it again to continue." : "9 digits, like 12-3456789"} autoComplete="off" />
        <SelectField name="industry" label="Industry" required search msgRequired="Choose your industry" placeholder="Choose industry" options={OPTIONS.industries} value={d.industry} />
        <SelectField name="formation-state" label="State of formation" required search msgRequired="Choose a state" placeholder="Choose a state" options={OPTIONS.states} value={d["formation-state"]} />
      </div>
      <fieldset className="a-fieldset">
        <legend>Business address</legend>
        <div className="a-form-grid a-form-grid--2">
          <TextField name="biz-line1" label="Street address" full required msgRequired="Enter your street address" autoComplete="address-line1" defaultValue={d["biz-line1"]} />
          <TextField name="biz-line2" label="Suite, unit or floor" full optional autoComplete="address-line2" defaultValue={d["biz-line2"]} />
          <TextField name="biz-city" label="City" required msgRequired="Enter your city" autoComplete="address-level2" defaultValue={d["biz-city"]} />
          <SelectField name="biz-state" label="State" required search msgRequired="Choose a state" placeholder="Choose a state" options={OPTIONS.states} value={d["biz-state"]} />
          <TextField name="biz-zip" label="ZIP code" required mask="zip" inputMode="numeric" msgRequired="Enter your ZIP code" msgPattern="Use 5 digits, like 78704" autoComplete="postal-code" defaultValue={d["biz-zip"]} />
          <TextField name="website" label="Website" optional validate="url" msgPattern="Enter a web address like yourcompany.com" placeholder="yourcompany.com" autoComplete="url" defaultValue={d.website} />
        </div>
      </fieldset>
      <fieldset className="a-fieldset">
        <legend>Team size</legend>
        <div className="a-segmented">
          {OPTIONS.team.map(([value, text]) => (
            <label className="a-segmented__option" key={value}><input type="radio" name="team" value={value} defaultChecked={(d.team ?? "1") === value} /><span>{text}</span></label>
          ))}
        </div>
      </fieldset>
      <Actions step="business" />
    </form>
  );
}

function ServicesStep({ d }: { d: Row }) {
  const chosen: string[] = d.services ?? ["monthly"];
  return (
    <form {...stepForm("services")}>
      <fieldset className="a-fieldset" data-required-group data-msg-required="Choose at least one service">
        <legend>Which services do you need?</legend>
        <p className="a-hint">Choose all that apply. You can change this later.</p>
        <div className="a-choice-cards">
          {OPTIONS.services.map(([value, icon, title, text]) => (
            <label className="a-choice-card" key={value}>
              <input className="a-check__input" type="checkbox" id={`svc-${value}`} name="services" value={value} defaultChecked={chosen.includes(value)} />
              <span className="a-choice-card__icon"><Icon name={icon} className="a-icon--32" /></span>
              <span className="a-choice-card__title">{title}</span>
              <span className="a-choice-card__text">{text}</span>
            </label>
          ))}
        </div>
        <p className="a-error" id="services-error" />
      </fieldset>
      <div className="a-form-grid a-form-grid--2">
        <SelectField name="software" label="Accounting software" required msgRequired="Choose your accounting software" placeholder="Choose software" options={OPTIONS.software} value={d.software} />
        <SelectField name="months-behind" label="Months behind" placeholder="Up to date" options={OPTIONS.behind} value={d["months-behind"] ?? "0"} />
      </div>
      <div className="a-slider" data-slider data-format="transactions">
        <div className="a-slider__head"><label htmlFor="volume">Monthly transactions, roughly</label><output className="a-slider__value" htmlFor="volume" data-slider-output /></div>
        <div className="a-slider__track"><span className="a-slider__rail" /><input className="a-range" id="volume" name="volume" type="range" min={0} max={1000} step={25} defaultValue={d.volume ?? 250} /></div>
        <div className="a-slider__scale" aria-hidden="true"><span>0</span><span>500</span><span>1,000+</span></div>
      </div>
      <div className="a-form-grid a-form-grid--2">
        <div className="a-field">
          <label className="a-label" htmlFor="accounts">Bank and card accounts</label>
          <div className="a-number" data-number>
            <button type="button" className="a-number__btn" data-step="-1" aria-label="Decrease"><Icon name="minus" /></button>
            <input className="a-input" id="accounts" name="accounts" type="number" min={1} max={25} defaultValue={d.accounts ?? 3} inputMode="numeric" />
            <button type="button" className="a-number__btn" data-step="1" aria-label="Increase"><Icon name="plus" /></button>
          </div>
        </div>
        <Field id="start-date" label="Preferred start date" required msgRequired="Choose a start date" msgPattern="Enter a date as MM/DD/YYYY" hint="We need about 3 business days to set up.">
          <div className="a-datepicker" data-datepicker data-min="today" data-icons="chevron-left chevron-right chevron-down">
            <div className="a-input-group">
              <input className="a-input" type="text" inputMode="numeric" data-mask="date" placeholder="MM/DD/YYYY" autoComplete="off" id="start-date" name="start-date" required aria-describedby="start-date-hint start-date-error" defaultValue={d["start-date"]} />
              <button type="button" className="a-input-group__action" data-datepicker-open aria-haspopup="dialog" aria-expanded="false" aria-label="Choose date"><Icon name="calendar" /></button>
            </div>
          </div>
        </Field>
      </div>
      <div className="a-field">
        <label className="a-label" htmlFor="notes"><span>Anything we should know?</span><span className="a-label__optional">Optional</span></label>
        <textarea className="a-textarea" id="notes" name="notes" maxLength={1000} placeholder="Prior bookkeeper, deadlines, anything unusual" defaultValue={d.notes} />
      </div>
      <Actions step="services" />
    </form>
  );
}

const UPLOADS: { kind: string; title: string; hint: string }[] = [
  { kind: "bank-statement", title: "Bank and card statements, last 3 months", hint: "PDF or CSV, up to 25 MB each" },
  { kind: "tax-return", title: "Most recent business tax return", hint: "PDF, up to 25 MB" },
  { kind: "chart-of-accounts", title: "Chart of accounts, if you have one", hint: "XLSX, CSV or PDF, up to 25 MB" },
];

async function DocumentsStep({ reg }: { reg: Row }) {
  const docs = await registrationDocuments(reg.id);
  return (
    <form {...stepForm("documents")}>
      <div className="a-alert a-alert--info" role="note"><Icon name="lock" /><p className="a-alert__title">Uploads are encrypted</p><p className="a-alert__body">Only the bookkeepers working on your account can open these files.</p></div>
      {UPLOADS.map(({ kind, title, hint }) => (
        <div className="a-field" key={kind}>
          <p className="a-label" id={`${kind}-label`}>{title}</p>
          <div className="a-dropzone" data-upload-zone={`${kind}-files`} data-kind={kind}>
            <span className="a-dropzone__icon"><Icon name="file-upload-duo" /></span>
            <p className="a-dropzone__title">Drag files here or <span>browse</span></p>
            <p className="a-dropzone__hint">{hint}</p>
            <input className="a-dropzone__input" type="file" multiple accept=".pdf,.csv,.xlsx,.jpg,.png" aria-labelledby={`${kind}-label`} />
          </div>
          <ul className="a-file-list" id={`${kind}-files`} aria-label={`${title}, uploaded files`}>
            {docs.filter((doc) => doc.kind === kind).map((doc) => (
              <li className="a-file is-done" key={doc.id}>
                <Icon name="file-text" />
                <span className="a-file__name">{doc.filename}</span>
                <span className="a-file__meta">{fileSize(Number(doc.size_bytes))}, {KINDS[doc.kind].toLowerCase()}</span>
                <span className="a-file__actions"><button type="button" className="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-remove-file={doc.id} aria-label={`Remove ${doc.filename}`}><Icon name="trash" /></button></span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {isOpen(reg) && (
        <label className="a-check">
          <input className="a-check__input" type="checkbox" id="upload-later" name="upload-later" defaultChecked={reg.data?.["upload-later"] === "on"} aria-describedby="upload-later-hint" />
          <span className="a-check__label">I will upload documents later</span>
          <span className="a-check__hint" id="upload-later-hint">Your bookkeeping starts once we have them. Use the link in your email to come back.</span>
        </label>
      )}
      {isOpen(reg) ? <Actions step="documents" /> : <div className="a-form-actions"><a className="a-btn a-btn--ghost" href="/onboarding/success"><Icon name="arrow-left" />Back</a><button type="submit" className="a-btn a-btn--primary">Done<Icon name="arrow-right" /></button></div>}
    </form>
  );
}

function PlanStep({ reg }: { reg: Row }) {
  const plan = reg.plan ?? (reg.data?.services?.includes("monthly") === false ? "catchup" : "monthly");
  return (
    <form {...stepForm("plan")}>
      <div className="a-choice-cards">
        <label className="a-choice-card">
          <input className="a-radio__input" type="radio" name="plan" value="monthly" defaultChecked={plan === "monthly"} required />
          <span className="a-choice-card__title">Monthly bookkeeping</span>
          <span className="a-plan-price">{money(MONTHLY_CENTS).replace(".00", "")}<span> per month</span></span>
          <ul className="a-plan-features" role="list">
            {["One flat monthly fee", "No hidden charges", "No confusing pricing tiers", "CFO-level reports and a simple review"].map((item) => <li key={item}><Icon name="check" />{item}</li>)}
          </ul>
        </label>
        <label className="a-choice-card">
          <input className="a-radio__input" type="radio" name="plan" value="catchup" defaultChecked={plan === "catchup"} required />
          <span className="a-choice-card__title">Catch-up bookkeeping</span>
          <span className="a-plan-price">{money(CATCHUP_MONTH_CENTS).replace(".00", "")}<span> per month of catch-up</span></span>
          <ul className="a-plan-features" role="list">
            {["18.5% off our regular monthly fee", "New file set up, or your existing QuickBooks reviewed", "Billed once for the months you need"].map((item) => <li key={item}><Icon name="check" />{item}</li>)}
          </ul>
        </label>
      </div>
      <div data-show-when="plan=catchup">
        <TextField name="catchup-months" label="How many months need catching up?" type="number" min={1} max={120} inputMode="numeric" required msgRequired="Enter the number of months" hint="A month that is mostly complete, with fewer than 20 transactions to enter, may qualify for $120 after our review." defaultValue={reg.catchup_months ?? undefined} />
      </div>
      <p className="a-small a-muted">Prices in US dollars. Monthly bookkeeping renews each month until you cancel. Catch-up work is billed once.</p>
      <Actions step="plan" submit="Review and pay" />
    </form>
  );
}

async function ReviewStep({ reg }: { reg: Row }) {
  const d: Row = reg.data ?? {};
  const docs = await registrationDocuments(reg.id);
  const q = quote(reg.plan, reg.catchup_months);
  const address = [d["biz-line1"], d["biz-line2"], d["biz-city"], `${label(OPTIONS.states, d["biz-state"])} ${d["biz-zip"] ?? ""}`.trim()].filter(Boolean).join(", ");
  const sections: [string, Step, [string, string][]][] = [
    ["Account", "account", [["Name", `${reg.first_name} ${reg.last_name}`], ["Email", reg.email], ["Phone", reg.phone], ["Role", label(OPTIONS.roles, reg.role)]]],
    ["Business", "business", [["Legal name", reg.business_name ?? ""], ["Entity", entityLabel(d.entity)], ["EIN", reg.ein_enc ? "Saved, encrypted" : "Missing"], ["Industry", d.industry ?? ""], ["Address", address]]],
    ["Services", "services", [["Services", (d.services ?? []).map((s: string) => OPTIONS.services.find(([v]) => v === s)?.[2]).join(", ")], ["Software", d.software ?? ""], ["Volume", `About ${d.volume ?? 0} transactions a month`], ["Start date", d["start-date"] ?? ""]]],
    ["Documents", "documents", [["Uploads", docs.length ? docs.map((doc) => doc.filename).join(", ") : "None yet, you can upload later"]]],
    ["Plan", "plan", [["Plan", q?.name ?? "Not chosen"], ["Billing", q?.billing ?? ""], ["Amount", q ? money(q.amountCents) : ""]]],
  ];
  return (
    <form {...stepForm("review")}>
      <div className="a-choice-list">
        {sections.map(([title, target, rows]) => (
          <section className="a-card" aria-label={title} key={title}>
            <div className="a-card__header"><h2 className="a-card__title">{title}</h2><a className="a-btn a-btn--link a-btn--sm" href={`/onboarding/${target}`}>Edit<span className="a-visually-hidden"> {title.toLowerCase()}</span></a></div>
            <div className="a-card__content"><dl className="a-dl">{rows.map(([name, value]) => <div key={name} style={{ display: "contents" }}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></div>
          </section>
        ))}
      </div>
      <div className="a-field" data-msg-required="Agree to the terms to continue">
        <label className="a-check">
          <input className="a-check__input" type="checkbox" id="terms" name="terms" required defaultChecked={Boolean(reg.terms_at)} />
          <span className="a-check__label">I agree to the <a href="/terms" target="_blank">terms of service</a> and <a href="/privacy" target="_blank">privacy policy</a></span>
        </label>
        <p className="a-error" id="terms-error" />
      </div>
      <Actions step="review" submit="Continue to payment" />
    </form>
  );
}

function PaymentStep({ reg, amount }: { reg: Row; amount: string }) {
  const q = quote(reg.plan, reg.catchup_months);
  if (!q) redirect("/onboarding/plan");
  const testMode = process.env.PAYMENTS_MODE === "test";
  const authName = q.recurring ? "auth-monthly" : "auth-onetime";
  return (
    <div data-pay-flow="">
      <div data-pay-state="form">
        <form className="a-form-grid" method="post" action="/api/onboarding/pay" data-payment-form="" noValidate>
          {testMode
            ? <div className="a-test-mode" role="note"><strong>Test mode.</strong> No real charge is made. Use <code>4242 4242 4242 4242</code> to succeed or <code>4000 0000 0000 0002</code> to see a decline, any future date and any CVC.</div>
            : <div className="a-alert a-alert--warning" role="alert"><Icon name="alert-triangle" /><p className="a-alert__title">Payments are not set up yet</p><p className="a-alert__body">Your answers are saved. We will email you when you can finish.</p></div>}
          <div className="a-card-field">
            <p className="a-label" id="pay-card-label">Card details</p>
            <div className="a-card-element" data-card-element="" role="group" aria-labelledby="pay-card-label" data-icons="alert-triangle">
              {/* These inputs have no name, so the browser cannot post them. */}
              <div className="a-card-element__number"><span className="a-card-brand" data-brand=""><Icon name="credit-card" /><span data-brand-name="" /></span><input className="a-input" id="pay-number" type="text" inputMode="numeric" autoComplete="cc-number" data-mask="card" placeholder="1234 1234 1234 1234" aria-label="Card number" aria-describedby="pay-card-error" /></div>
              <input className="a-input" id="pay-expiry" type="text" inputMode="numeric" autoComplete="cc-exp" data-mask="expiry" placeholder="MM / YY" aria-label="Expiry date" aria-describedby="pay-card-error" />
              <input className="a-input" id="pay-cvc" type="text" inputMode="numeric" autoComplete="cc-csc" data-mask="cvc" maxLength={3} placeholder="CVC" aria-label="Security code" aria-describedby="pay-card-error" />
            </div>
            <p className="a-error" id="pay-card-error" data-card-error="" />
            <p className="a-gateway-note"><Icon name="lock" />Card details are never sent to or stored by Anoglobe.</p>
          </div>
          <input type="hidden" name="card-last4" />
          <input type="hidden" name="card-exp" />
          <fieldset className="a-fieldset">
            <legend>Billing address</legend>
            <div className="a-form-grid a-form-grid--2">
              <TextField name="bill-name" label="Name on card" full required msgRequired="Enter the name on your card" autoComplete="cc-name" />
              <TextField name="bill-line1" label="Street address" full required msgRequired="Enter your street address" autoComplete="billing address-line1" defaultValue={reg.data?.["biz-line1"]} />
              <TextField name="bill-line2" label="Suite, unit or floor" full optional autoComplete="billing address-line2" defaultValue={reg.data?.["biz-line2"]} />
              <TextField name="bill-city" label="City" required msgRequired="Enter your city" autoComplete="billing address-level2" defaultValue={reg.data?.["biz-city"]} />
              <SelectField name="bill-state" label="State" required search msgRequired="Choose a state" placeholder="Choose a state" options={OPTIONS.states} value={reg.data?.["biz-state"]} />
              <TextField name="bill-zip" label="ZIP code" required mask="zip" inputMode="numeric" msgRequired="Enter your ZIP code" msgPattern="Use 5 digits, like 78704" autoComplete="billing postal-code" defaultValue={reg.data?.["biz-zip"]} />
            </div>
          </fieldset>
          <div className="a-field" data-msg-required="Check the authorization box to continue">
            <p className="a-label">Billing authorization</p>
            <div className="a-legal" data-scroll-area tabIndex={0} role="region" aria-label={`${q.name} billing terms`}>
              <span className="a-badge a-badge--warning a-legal__flag">Sample wording, pending legal review</span>
              {q.recurring ? (
                <>
                  <p>By checking the box below, I authorize Anoglobe LLP to charge the card above {amount} today and {amount} on the same day of each following month for {q.name}, until I cancel.</p>
                  <p>I can cancel at any time before the next billing date by emailing billing@anoglobebookkeeping.com. Charges already made are not refundable except as stated in the Terms of Service.</p>
                  <p>All amounts are in US dollars. Anoglobe LLP will email a receipt after each charge and give at least 30 days notice before any price change.</p>
                </>
              ) : (
                <>
                  <p>By checking the box below, I authorize Anoglobe LLP to charge the card above a one-time amount of {amount} for {q.name}. This is a single charge. No recurring payments will be made unless I sign up for a monthly plan separately.</p>
                  <p>All amounts are in US dollars. Anoglobe LLP will email a receipt after the charge.</p>
                </>
              )}
            </div>
            <label className="a-check"><input className="a-check__input" type="checkbox" id={authName} name={authName} required /><span className="a-check__label">{authText(q, amount)}</span></label>
            <p className="a-error" id={`${authName}-error`} />
          </div>
          <button type="submit" className="a-btn a-btn--primary a-btn--lg a-btn--block" disabled={!testMode}><Icon name="lock" />Pay {amount}</button>
          <div className="a-form-actions"><a className="a-btn a-btn--ghost" href="/onboarding/review"><Icon name="arrow-left" />Back to review</a></div>
        </form>
      </div>
      <div data-pay-state="processing" hidden><div className="a-processing" role="status"><span className="a-spinner a-spinner--lg" aria-hidden="true" /><p className="a-h4" tabIndex={-1}>Processing your payment</p><p className="a-processing__text">This takes a few seconds. Please keep this page open.</p></div></div>
      <div data-pay-state="success" hidden><div className="a-result" role="status"><span><svg className="a-anim-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" pathLength={1} /><path d="M8.2 12.3l2.6 2.6 5-5.2" pathLength={1} /></svg></span><h2 className="a-result__title" tabIndex={-1}>Payment successful</h2><p className="a-result__text">Taking you to your confirmation.</p></div></div>
      <div data-pay-state="declined" hidden><div className="a-result" role="alert"><h2 className="a-result__title" tabIndex={-1}>Card declined</h2><p className="a-result__text">Taking you to your options.</p></div></div>
    </div>
  );
}
