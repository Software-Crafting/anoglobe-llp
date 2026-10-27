// PROTOTYPE ONLY. Remove this file and its <script> tag in development.
// Adds a "Skip validation" switch so reviewers can click through the onboarding flow without
// typing every field. It wraps the validators from outside; component code has no bypass.
(() => {
  const KEY = "anoglobe-skip-validation";
  const read = () => {
    try {
      return sessionStorage.getItem(KEY) === "on";
    } catch {
      return false;
    }
  };
  const write = (on) => {
    try {
      sessionStorage.setItem(KEY, on ? "on" : "off");
    } catch {
      // Storage blocked: the switch still works on this page.
    }
  };
  let skip = read();

  document.addEventListener("DOMContentLoaded", () => {
    const api = window.Anoglobe;
    const validate = api.validate;
    const cardErrors = api.cardErrors;
    api.validate = (container) => (skip ? true : validate(container));
    if (cardErrors) api.cardErrors = (root) => (skip ? {} : cardErrors(root));

    const bar = document.createElement("div");
    bar.className = "a-proto-toggle";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Prototype tools");
    bar.innerHTML = `<label class="a-switch"><input class="a-switch__input" type="checkbox" role="switch"${skip ? " checked" : ""}><span>Skip validation</span></label><span class="a-proto-toggle__tag">Prototype only</span>`;
    bar.querySelector("input").addEventListener("change", (event) => {
      skip = event.target.checked;
      write(skip);
      if (skip) {
        for (const error of document.querySelectorAll(".a-error")) error.innerHTML = "";
        for (const field of document.querySelectorAll("[aria-invalid]")) field.removeAttribute("aria-invalid");
      }
      api.announce?.(skip ? "Validation is off for this prototype" : "Validation is on");
    });
    document.body.append(bar);
  });
})();
