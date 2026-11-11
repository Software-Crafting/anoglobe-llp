import { LeadForm } from "@/components/lead-form";
import { Icon } from "@/components/ui";

// Static placeholders: replace both with the client's real details before going live.
const PHONE = "(415) 555-0132";
const BOOKING_URL = "https://calendly.com/";

const FAB = "a-btn a-btn--primary v2-fab";
const fabIcon = (name: string) => <span className="v2-fab__icon" aria-hidden="true"><Icon name={name} /></span>;

/** Two floating buttons, bottom right on every site page, and the contact form popup. site-behaviour.tsx opens it on scroll. */
export function ContactWidget() {
  return (
    <>
      <div className="v2-fabs" data-contact="">
        <a className={FAB} href={`tel:+1${PHONE.replace(/\D/g, "")}`}>
          {fabIcon("phone-call")}Call Us
          {/* A desktop usually cannot place the call, so it also shows the number */}
          <span className="v2-fab__number">{PHONE}</span>
        </a>
        <a className={FAB} href={BOOKING_URL} target="_blank" rel="noopener">
          {fabIcon("calendar")}Book a Call
          <span className="a-visually-hidden"> (opens in a new tab)</span>
        </a>
      </div>
      <dialog className="a-dialog v2-contact-dialog" id="contact-dialog" aria-labelledby="contact-title" aria-describedby="contact-desc">
        <div className="a-dialog__header">
          <div>
            <h2 className="a-dialog__title" id="contact-title">Talk to a real person</h2>
            <p className="a-dialog__description" id="contact-desc">Tell us how to reach you and we’ll get right back to you.</p>
          </div>
          <button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="a-dialog__body"><LeadForm idPrefix="popup-" /></div>
      </dialog>
    </>
  );
}
