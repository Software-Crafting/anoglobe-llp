// Payment mock: brand detection, Luhn and expiry checks, and a simulated charge.
// Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. No real gateway calls.
(() => {
  const BRANDS = [
    ["Amex", /^3[47]/, 15, 4],
    ["Visa", /^4/, 16, 3],
    ["Mastercard", /^(5[1-5]|2[2-7])/, 16, 3],
    ["Discover", /^6(011|5)/, 16, 3],
  ];
  const DECLINED = "4000000000000002";

  const digits = (value) => value.replace(/\D/g, "");
  const brandOf = (number) => BRANDS.find(([, pattern]) => pattern.test(number)) || null;

  function luhn(number) {
    let sum = 0;
    [...number].reverse().forEach((char, index) => {
      let digit = Number(char);
      if (index % 2) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
      sum += digit;
    });
    return number.length >= 13 && sum % 10 === 0;
  }

  // Returns { field: message } for the card element inside root.
  function cardErrors(root, today = new Date()) {
    const number = digits(root.querySelector("[data-mask=card]").value);
    const [month, year] = root.querySelector("[data-mask=expiry]").value.split("/").map((part) => Number(part.trim()));
    const cvc = digits(root.querySelector("[data-mask=cvc]").value);
    const brand = brandOf(number);
    const errors = {};
    if (!number) errors.card = "Enter your card number.";
    else if (!luhn(number)) errors.card = "Check the card number. It does not look complete or valid.";
    if (!month || !year) errors.expiry = "Enter the expiry date as MM / YY.";
    else if (month < 1 || month > 12) errors.expiry = "Enter a month from 01 to 12.";
    else if (new Date(2000 + year, month, 1) <= new Date(today.getFullYear(), today.getMonth(), 1)) errors.expiry = "This card has expired. Use a different card.";
    const cvcLength = brand ? brand[3] : 3;
    if (cvc.length !== cvcLength) errors.cvc = `Enter the ${cvcLength} digit security code.`;
    return errors;
  }

  function showCardErrors(root, errors) {
    const slot = root.closest(".a-card-field").querySelector("[data-card-error]");
    for (const [key, selector] of [["card", "[data-mask=card]"], ["expiry", "[data-mask=expiry]"], ["cvc", "[data-mask=cvc]"]]) {
      const input = root.querySelector(selector);
      if (errors[key]) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
    const first = Object.values(errors)[0];
    slot.innerHTML = first ? `<svg class="a-icon" aria-hidden="true"><use href="#alert-triangle"></use></svg><span>${first}</span>` : "";
  }

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (input.dataset.mask !== "card") return;
    const brand = brandOf(digits(input.value));
    const badge = input.closest("[data-card-element]").querySelector(".a-card-brand");
    badge.dataset.brand = brand ? brand[0] : "";
    badge.querySelector("[data-brand-name]").textContent = brand ? brand[0] : "";
    input.closest("[data-card-element]").querySelector("[data-mask=cvc]").maxLength = brand?.[0] === "Amex" ? 4 : 3;
  });

  // <form data-payment-form> with [data-card-element], [data-pay-state] panels: form, processing, success, declined.
  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-payment-form]");
    if (!form) return;
    event.preventDefault();
    const element = form.querySelector("[data-card-element]");
    const errors = cardErrors(element);
    showCardErrors(element, errors);
    const fieldsValid = window.Anoglobe?.validate ? window.Anoglobe.validate(form) : true;
    if (Object.keys(errors).length) {
      element.querySelector("[aria-invalid=true]").focus();
      return;
    }
    if (!fieldsValid) return;
    const host = form.closest("[data-pay-flow]");
    const show = (state) => {
      for (const panel of host.querySelectorAll("[data-pay-state]")) panel.hidden = panel.dataset.payState !== state;
      const heading = host.querySelector(`[data-pay-state="${state}"] [tabindex="-1"]`);
      heading?.focus();
    };
    const button = form.querySelector("[type=submit]");
    button.setAttribute("aria-busy", "true");
    show("processing");
    const declined = digits(element.querySelector("[data-mask=card]").value) === DECLINED;
    setTimeout(() => {
      button.removeAttribute("aria-busy");
      show(declined ? "declined" : "success");
      host.dispatchEvent(new CustomEvent(declined ? "a-payment-declined" : "a-payment-success", { bubbles: true }));
    }, 1800);
  });

  document.addEventListener("click", (event) => {
    const retry = event.target.closest("[data-pay-retry]");
    if (!retry) return;
    const host = retry.closest("[data-pay-flow]");
    for (const panel of host.querySelectorAll("[data-pay-state]")) panel.hidden = panel.dataset.payState !== "form";
    const number = host.querySelector("[data-mask=card]");
    number.value = "";
    number.dispatchEvent(new Event("input", { bubbles: true }));
    number.focus();
  });

  window.Anoglobe = Object.assign(window.Anoglobe || {}, { cardErrors, luhn });
})();
