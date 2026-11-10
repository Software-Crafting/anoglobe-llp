import { Icon } from "@/components/ui";

// Fill these in when the client sends them. An empty value shows a marked placeholder instead of a link.
const PHONE: string = ""; // US number as it should be shown, e.g. "(555) 123-4567"
const HOURS: string = ""; // e.g. "Monday to Friday, 9 AM to 5 PM ET"
const BOOKING_URL: string = ""; // Calendly link

const PANEL_ID = "contact-panel";

function Option({ href, icon, title, text, external }: { href: string; icon: string; title: string; text: string; external?: boolean }) {
  const body = (
    <>
      <span className="v2-contact__icon" aria-hidden="true"><Icon name={icon} /></span>
      <span><strong>{title}</strong><span>{text}</span></span>
    </>
  );
  if (!href) return <li><p className="v2-contact__option" aria-disabled="true">{body}</p></li>;
  return (
    <li>
      <a className="v2-contact__option" href={href} {...(external && { target: "_blank", rel: "noopener" })}>
        {body}
        {external && <span className="a-visually-hidden"> (opens in a new tab)</span>}
      </a>
    </li>
  );
}

/** Floating "Talk to Us" button, bottom right on every site page. Native popover: no script for open, close, Esc or outside click. */
export function ContactWidget() {
  const tel = PHONE && `tel:+1${PHONE.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}`;
  return (
    <div className="v2-contact" data-contact="">
      <button type="button" className="a-btn a-btn--primary v2-contact__toggle" popoverTarget={PANEL_ID} data-ds-tooltip="Talk to Us" data-ds-tooltip-side="left" data-ds-tooltip-when="(max-width: 639px)">
        <Icon name="phone-call" />
        <span className="v2-contact__label">Talk to Us</span>
      </button>
      <div className="a-popover v2-contact__panel" id={PANEL_ID} popover="auto" role="dialog" aria-labelledby="contact-title">
        <div className="a-popover__header">
          <h2 className="v2-contact__title" id="contact-title">Talk to a real person</h2>
          <button type="button" className="a-btn a-btn--ghost a-btn--icon a-btn--sm" popoverTarget={PANEL_ID} popoverTargetAction="hide" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <ul className="v2-contact__options" role="list">
          <Option href={tel} icon="phone-call" title={PHONE ? `Call ${PHONE}` : "Call us"} text={PHONE ? HOURS : "[Phone number and calling hours]"} />
          <Option href={BOOKING_URL} icon="calendar" title="Book a call" text={BOOKING_URL ? "Pick a time that suits you" : "[Calendly link]"} external />
          <Option href="/#get-started" icon="message" title="Send a message" text="We’ll get right back to you" />
        </ul>
      </div>
    </div>
  );
}

/** Inline prompt at the end of a section; opens the same panel. */
export function ContactPrompt({ title, text }: { title: string; text: string }) {
  return (
    <div className="v2-contact-prompt" data-reveal="">
      <p><strong>{title}</strong><span>{text}</span></p>
      <button type="button" className="a-btn a-btn--outline a-btn--lg" popoverTarget={PANEL_ID}><Icon name="phone-call" />Talk to Us</button>
    </div>
  );
}
