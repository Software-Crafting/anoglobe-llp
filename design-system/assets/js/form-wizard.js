// Onboarding wizard. Step pages (form[data-step-form]) and the single page flow ([data-wizard]) share
// one store in sessionStorage, so answers survive moving between pages. Values are restored into
// real inputs and our custom selects, and the summary panel and review page update from the store.
(() => {
  const STORE_KEY = "anoglobe-onboarding";
  const announce = (message) => window.Anoglobe?.announce?.(message);
  const usd = (value) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function load() {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  }

  let memory = load();
  function save(values) {
    memory = { ...memory, ...values };
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(memory));
    } catch {
      // Storage blocked: answers stay in memory for this page.
    }
  }

  // Collect named fields. Checkbox groups become arrays, selects also store their visible label.
  function collect(form) {
    const values = {};
    for (const input of form.querySelectorAll("input[name], textarea[name]")) {
      // Never keep passwords or files in browser storage.
      if (input.type === "file" || input.type === "password" || input.dataset.password !== undefined) continue;
      if (input.type === "checkbox") {
        const group = form.querySelectorAll(`input[type=checkbox][name="${input.name}"]`);
        values[input.name] = group.length > 1 ? [...group].filter((box) => box.checked).map((box) => box.value) : input.checked;
      } else if (input.type === "radio") {
        if (input.checked) values[input.name] = input.value;
      } else {
        values[input.name] = input.value;
      }
      if (input.type === "hidden" && input.closest("[data-listbox]")) {
        const label = input.closest("[data-listbox]").querySelector(".a-select__value");
        values[`${input.name}__label`] = label && !label.classList.contains("is-placeholder") ? label.textContent : input.value;
      }
    }
    const plan = form.querySelector("input[name=plan]:checked");
    if (plan) {
      values.planName = plan.dataset.planName;
      values.planPrice = plan.dataset.price;
      values.planRecurring = plan.dataset.recurring;
    }
    return values;
  }

  function restore(root) {
    for (const input of root.querySelectorAll("input[name], textarea[name]")) {
      const value = memory[input.name];
      if (value === undefined || input.type === "file") continue;
      if (input.type === "checkbox") input.checked = Array.isArray(value) ? value.includes(input.value) : Boolean(value);
      else if (input.type === "radio") input.checked = input.value === value;
      else input.value = value;
      if (input.type === "hidden" && input.closest("[data-listbox]") && value) {
        const box = input.closest("[data-listbox]");
        const label = box.querySelector(".a-select__value");
        for (const option of box.querySelectorAll("[role=option]")) option.setAttribute("aria-selected", String(option.dataset.value === value));
        if (label) {
          label.textContent = memory[`${input.name}__label`] || value;
          label.classList.remove("is-placeholder");
        }
      }
    }
    for (const textarea of root.querySelectorAll("textarea")) textarea.dispatchEvent(new Event("input", { bubbles: true }));
    for (const range of root.querySelectorAll(".a-range")) range.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Conditional fields: data-show-when="name=value" (checkbox groups match when the value is checked).
  function applyConditions(root = document) {
    for (const element of root.querySelectorAll("[data-show-when]")) {
      const [name, expected] = element.dataset.showWhen.split("=");
      const inputs = [...document.querySelectorAll(`[name="${name}"]`)];
      const live = inputs.some((input) => (input.type === "checkbox" || input.type === "radio" ? input.checked && input.value === expected : input.value === expected));
      const stored = memory[name];
      const matches = inputs.length ? live : Array.isArray(stored) ? stored.includes(expected) : stored === expected;
      element.hidden = !matches;
    }
  }

  // Summary panel and review fields
  function current() {
    return { ...memory, ...(document.querySelector("[data-step-form], [data-wizard]") ? collectAll() : {}) };
  }

  function collectAll() {
    const values = {};
    for (const form of document.querySelectorAll("[data-step-form], [data-wizard] form")) Object.assign(values, collect(form));
    return values;
  }

  const SERVICE_LABELS = { monthly: "Monthly bookkeeping", catchup: "Catch-up bookkeeping", cleanup: "Books cleanup", payables: "Payables and receivables", payroll: "Payroll support", reporting: "Financial reporting" };

  function display(key, data) {
    const value = data[`${key}__label`] ?? data[key];
    if (key === "services") return (data.services || []).map((service) => SERVICE_LABELS[service] || service).join(", ");
    if (key === "address") return [data["biz-line1"], data["biz-line2"], data["biz-city"], [data["biz-state__label"] || data["biz-state"], data["biz-zip"]].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    if (key === "name") return [data["first-name"], data["last-name"]].filter(Boolean).join(" ");
    if (key === "documents") return data["upload-later"] ? "Uploading later" : "Bank statements, prior return";
    if (key === "planRecurring") return data.planRecurring === undefined ? "" : data.planRecurring === "true" ? "Monthly, renews until cancelled" : "One-time charge";
    if (key === "volume") return data.volume ? `About ${Number(data.volume).toLocaleString("en-US")} transactions a month` : "";
    return Array.isArray(value) ? value.join(", ") : value;
  }

  function updateSummary() {
    const data = current();
    const recurring = (data.planRecurring ?? "true") === "true";
    const price = Number(data.planPrice || 499);
    const texts = {
      plan: data.planName || "Growth",
      price: recurring ? `${usd(price)} per month` : `${usd(price)} one time`,
      due: usd(price),
      billing: recurring ? "Monthly, cancel any time" : "One-time charge",
      next: recurring ? `Then ${usd(price)} on this date each month.` : "No recurring charges.",
      business: data["legal-name"] || "Your business",
      services: display("services", data) || "Not chosen yet",
    };
    for (const element of document.querySelectorAll("[data-summary]")) {
      const text = texts[element.dataset.summary];
      if (text !== undefined) element.textContent = text;
    }
    for (const element of document.querySelectorAll("[data-billing]")) element.hidden = element.dataset.billing !== (recurring ? "monthly" : "onetime");
    for (const element of document.querySelectorAll("[data-review]")) {
      const text = display(element.dataset.review, data);
      element.textContent = text || "Not provided";
      element.classList.toggle("a-muted", !text);
    }
    // Authorization checkboxes for the variant that is hidden must not block payment.
    for (const box of document.querySelectorAll("[data-billing] input[type=checkbox]")) box.required = !box.closest("[data-billing]").hidden;
  }

  /* ---------- Step pages ---------- */
  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-step-form]");
    if (!form) return;
    event.preventDefault();
    if (!window.Anoglobe.validate(form)) return;
    save(collect(form));
    window.location.href = form.dataset.next;
  });

  document.addEventListener("click", (event) => {
    const later = event.target.closest("[data-save-later]");
    if (later) {
      const form = later.closest("form");
      if (form) save(collect(form));
    }
    const summaryToggle = event.target.closest("[data-summary-toggle]");
    if (summaryToggle) {
      const panel = document.getElementById(summaryToggle.getAttribute("aria-controls"));
      const open = summaryToggle.getAttribute("aria-expanded") !== "true";
      summaryToggle.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    }
  });

  document.addEventListener("change", (event) => {
    applyConditions();
    if (event.target.closest("[data-step-form], [data-wizard]")) updateSummary();
  });
  document.addEventListener("input", (event) => {
    if (event.target.closest("[data-step-form], [data-wizard]")) updateSummary();
  });

  // Payment step: redirect after the mock gateway answers.
  document.addEventListener("a-payment-success", (event) => {
    save({ paid: true, paidAt: new Date().toISOString() });
    const target = event.target.closest("[data-pay-flow]").dataset.successHref;
    if (target) setTimeout(() => (window.location.href = target), 1400);
    else document.dispatchEvent(new CustomEvent("a-wizard-paid"));
  });
  document.addEventListener("a-payment-declined", (event) => {
    const target = event.target.closest("[data-pay-flow]").dataset.declinedHref;
    if (target) setTimeout(() => (window.location.href = target), 1200);
  });

  /* ---------- Single page flow ---------- */
  function initWizard(wizard) {
    const steps = [...wizard.querySelectorAll("[data-wizard-step]")];
    const stepper = [...document.querySelectorAll("[data-wizard-stepper] .a-steps__item")];
    const label = document.querySelector("[data-wizard-label]");
    let index = Math.min(Number(memory.wizardStep || 0), steps.length - 1);

    const show = (next, focus = true) => {
      index = next;
      steps.forEach((step, i) => (step.hidden = i !== index));
      stepper.forEach((item, i) => {
        item.classList.toggle("is-complete", i < index);
        if (i === index) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
        const done = item.querySelector(".a-steps__done");
        if (done) done.hidden = i >= index;
      });
      if (label) label.textContent = `Step ${Math.min(index + 1, steps.length)} of ${steps.length}`;
      save({ wizardStep: index });
      updateSummary();
      applyConditions();
      if (focus) {
        const heading = steps[index].querySelector("h1, h2");
        heading?.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
        announce(`${heading?.textContent}, step ${index + 1} of ${steps.length}`);
      }
    };

    wizard.addEventListener("submit", (event) => {
      const form = event.target;
      if (form.matches("[data-payment-form]")) return;
      event.preventDefault();
      if (!window.Anoglobe.validate(form)) return;
      save(collect(form));
      show(index + 1);
    });
    wizard.addEventListener("click", (event) => {
      const back = event.target.closest("[data-wizard-back]");
      if (back) {
        event.preventDefault();
        show(Math.max(0, index - 1));
      }
      const go = event.target.closest("[data-wizard-go]");
      if (go) {
        event.preventDefault();
        show(Number(go.dataset.wizardGo));
      }
    });
    document.addEventListener("a-wizard-paid", () => {
      const done = wizard.querySelector("[data-wizard-done]");
      steps.forEach((step) => (step.hidden = true));
      done.hidden = false;
      stepper.forEach((item) => {
        item.classList.add("is-complete");
        item.removeAttribute("aria-current");
      });
      if (label) label.textContent = "Complete";
      done.querySelector("h1, h2")?.focus();
    });
    show(index, false);
  }

  // Resume page: show the sent state after a valid email.
  document.addEventListener("a-valid-submit", (event) => {
    if (!event.target.matches("[data-resume-form]")) return;
    const root = event.target.closest("[data-resume]");
    root.querySelector('[data-resume-state="form"]').hidden = true;
    const sent = root.querySelector('[data-resume-state="sent"]');
    sent.hidden = false;
    sent.querySelector("[tabindex='-1']").focus();
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-resend]")) window.Anoglobe?.toast?.("A new link is on its way", "success");
    if (event.target.closest("[data-print]")) window.print();
  });

  document.addEventListener("DOMContentLoaded", () => {
    for (const form of document.querySelectorAll("[data-step-form], [data-wizard] form")) restore(form);
    applyConditions();
    updateSummary();
    const wizard = document.querySelector("[data-wizard]");
    if (wizard) initWizard(wizard);
    const reset = document.querySelector("[data-wizard-reset]");
    reset?.addEventListener("click", () => {
      try {
        sessionStorage.removeItem(STORE_KEY);
      } catch {
        // Nothing stored.
      }
      window.location.reload();
    });
  });
})();
