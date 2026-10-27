// Component behaviour, initialised from data-* attributes. Groups are added module by module (plan/05).
(() => {
  const RESET_AFTER_MS = 1600;

  let liveRegion;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.className = "a-visually-hidden";
      liveRegion.setAttribute("aria-live", "polite");
      document.body.append(liveRegion);
    }
    liveRegion.textContent = "";
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  // Copy to clipboard: <button type="button" class="a-copy" data-copy="value"><span data-copy-label>Copy</span></button>
  async function copy(button) {
    const label = button.querySelector("[data-copy-label]");
    const idleText = button.dataset.copyIdle || label.textContent;
    button.dataset.copyIdle = idleText;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.dataset.state = "copied";
      label.textContent = "Copied";
      announce(`Copied ${button.dataset.copy}`);
    } catch {
      button.dataset.state = "failed";
      label.textContent = "Copy failed";
      announce("Copy failed. Select the value and copy it manually.");
    }
    clearTimeout(button.copyTimer);
    button.copyTimer = setTimeout(() => {
      delete button.dataset.state;
      label.textContent = idleText;
    }, RESET_AFTER_MS);
  }

  document.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) copy(copyButton);
  });
})();
