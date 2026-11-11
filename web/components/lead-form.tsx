"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { formatPhone, type LeadErrors, type LeadField, validateLead } from "@/lib/lead";
import { Icon } from "./ui";

const FIELDS: { name: LeadField; label: string; type: string; autoComplete: string; placeholder?: string }[] = [
  { name: "lead-first-name", label: "First Name", type: "text", autoComplete: "given-name" },
  { name: "lead-last-name", label: "Last Name", type: "text", autoComplete: "family-name" },
  { name: "lead-email", label: "Email", type: "email", autoComplete: "email" },
  { name: "lead-phone", label: "Phone Number", type: "tel", autoComplete: "tel-national", placeholder: "(415) 555-0132" },
];

export function LeadForm({ idPrefix = "" }: { idPrefix?: string }) {
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "failed" | "sent">("idle");
  const sentHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === "sent") sentHeading.current?.focus();
  }, [status]);

  function showErrors(form: HTMLFormElement, found: LeadErrors) {
    setErrors(found);
    const first = FIELDS.find(({ name }) => found[name]);
    if (first) form.querySelector<HTMLInputElement>(`[name="${first.name}"]`)?.focus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const { errors: found } = validateLead(values);
    if (found) return showErrors(form, found);

    setErrors({});
    setStatus("sending");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.ok) return setStatus("sent");
      const body = await response.json().catch(() => null);
      if (response.status === 400 && body?.errors) {
        setStatus("idle");
        return showErrors(form, body.errors);
      }
      setStatus("failed");
    } catch {
      setStatus("failed");
    }
  }

  // After a failed submit, a field's message clears as soon as its value is right.
  function onInput(event: FormEvent<HTMLFormElement>) {
    const input = event.target as HTMLInputElement;
    if (input.name === "lead-phone") input.value = formatPhone(input.value);
    if (!errors[input.name as LeadField]) return;
    const { errors: found } = validateLead(Object.fromEntries(new FormData(event.currentTarget)));
    setErrors((current) => ({ ...current, [input.name]: found?.[input.name as LeadField] }));
  }

  if (status === "sent") {
    return (
      <div className="v2-lead-sent">
        <Icon name="check-circle-duo" className="a-icon--48" />
        <h3 tabIndex={-1} ref={sentHeading}>Thanks, we’ll be in touch soon</h3>
        <p>Want to skip ahead? You can start onboarding now.</p>
        <a className="a-btn a-btn--primary" href="/onboarding/account">Start onboarding</a>
      </div>
    );
  }

  return (
    <form className="a-form-grid a-form-grid--2" onSubmit={onSubmit} onInput={onInput} noValidate>
      {FIELDS.map(({ name, label, type, autoComplete, placeholder }) => (
        <div className="a-field" key={name}>
          <label className="a-label" htmlFor={`${idPrefix}${name}`}>
            <span>{label}<span className="a-label__required" aria-hidden="true">*</span></span>
          </label>
          <input
            className="a-input"
            id={`${idPrefix}${name}`}
            name={name}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            inputMode={type === "tel" ? "tel" : undefined}
            required
            aria-invalid={errors[name] ? true : undefined}
            aria-describedby={`${idPrefix}${name}-error`}
          />
          <p className="a-error" id={`${idPrefix}${name}-error`}>
            {errors[name] && <><Icon name="alert-triangle" /><span>{errors[name]}</span></>}
          </p>
        </div>
      ))}
      <div className="v2-hp" aria-hidden="true">
        <label>Company<input name="company" type="text" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className="a-error a-field--full" role="alert">
        {status === "failed" && <><Icon name="alert-triangle" /><span>We couldn’t send your details. Please try again in a moment.</span></>}
      </p>
      <div className="a-field--full">
        <button type="submit" className="a-btn a-btn--primary a-btn--lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Get Started"}<Icon name="arrow-right" />
        </button>
      </div>
    </form>
  );
}
