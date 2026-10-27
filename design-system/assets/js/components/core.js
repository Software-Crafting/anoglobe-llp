// Core component behaviour: live announcements, copy to clipboard, tabs, accordion, dismiss.
// Initialised from data-* attributes; every component works with keyboard alone.
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

  // Tabs: [data-tabs] > [role=tablist] > [role=tab][aria-controls], panels [role=tabpanel].
  // Roving tabindex, arrow keys move and activate, Home and End jump to the ends.
  function selectTab(tab, focus = true) {
    const list = tab.closest("[role=tablist]");
    for (const other of list.querySelectorAll("[role=tab]")) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
    }
    if (focus) tab.focus();
    tab.dispatchEvent(new CustomEvent("a-tab-change", { bubbles: true }));
  }

  function onTabKey(event) {
    const tab = event.target.closest("[role=tab]");
    if (!tab) return;
    const tabs = [...tab.closest("[role=tablist]").querySelectorAll("[role=tab]:not([disabled])")];
    const index = tabs.indexOf(tab);
    const vertical = tab.closest("[role=tablist]").getAttribute("aria-orientation") === "vertical";
    const keys = {
      [vertical ? "ArrowDown" : "ArrowRight"]: tabs[(index + 1) % tabs.length],
      [vertical ? "ArrowUp" : "ArrowLeft"]: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    };
    if (keys[event.key]) {
      event.preventDefault();
      selectTab(keys[event.key]);
    }
  }

  function initTabs(root = document) {
    for (const list of root.querySelectorAll("[role=tablist]")) {
      const tabs = [...list.querySelectorAll("[role=tab]")];
      const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
      if (selected) selectTab(selected, false);
    }
  }

  // Accordion: <button aria-expanded aria-controls="panel"> toggles the panel's hidden attribute.
  function toggleDisclosure(trigger) {
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!expanded));
    document.getElementById(trigger.getAttribute("aria-controls")).hidden = expanded;
  }

  document.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) copy(copyButton);

    const tab = event.target.closest("[role=tab]");
    if (tab) selectTab(tab);

    const disclosure = event.target.closest("[data-disclosure]");
    if (disclosure) toggleDisclosure(disclosure);

    // Dismiss: <button data-dismiss> removes its closest [data-dismissible] element.
    const dismiss = event.target.closest("[data-dismiss]");
    if (dismiss) {
      const target = dismiss.closest("[data-dismissible]");
      const label = target.dataset.dismissible;
      const next = target.nextElementSibling?.querySelector("button, a") || target.parentElement.closest("[tabindex], section, main");
      target.remove();
      if (label) announce(`${label} removed`);
      next?.focus?.();
    }
  });

  document.addEventListener("keydown", onTabKey);
  document.addEventListener("DOMContentLoaded", () => initTabs());

  window.Anoglobe = Object.assign(window.Anoglobe || {}, { announce, initTabs, selectTab });
})();
