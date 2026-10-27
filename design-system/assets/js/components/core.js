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

  // Scroll area: wraps an element marked data-scroll-area and draws our own scrollbars. The element
  // keeps native scrolling (wheel, touch, keyboard); the bars mirror it and can be dragged or clicked.
  const MIN_THUMB = 24;
  const AXES = {
    y: { size: "clientHeight", total: "scrollHeight", pos: "scrollTop", track: "clientHeight", pointer: "clientY", rect: "top" },
    x: { size: "clientWidth", total: "scrollWidth", pos: "scrollLeft", track: "clientWidth", pointer: "clientX", rect: "left" },
  };

  function enhanceScroll(viewport) {
    if (viewport.closest(".a-scroll-area") === viewport.parentElement && viewport.parentElement.classList.contains("a-scroll-area")) return;
    const area = document.createElement("div");
    area.className = `a-scroll-area ${viewport.dataset.scrollArea || ""}`.trim();
    viewport.before(area);
    area.append(viewport);
    viewport.classList.add("a-scroll-area__viewport");
    const bars = {};
    for (const axis of Object.keys(AXES)) {
      const bar = document.createElement("div");
      bar.className = `a-scrollbar a-scrollbar--${axis}`;
      bar.setAttribute("aria-hidden", "true");
      bar.innerHTML = '<div class="a-scrollbar__thumb"></div>';
      area.append(bar);
      bars[axis] = bar;
      bindBar(viewport, bar, axis);
    }

    let frame = 0;
    let idleTimer = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const overflowing = {};
        for (const [axis, keys] of Object.entries(AXES)) {
          const bar = bars[axis];
          const overflow = viewport[keys.total] - viewport[keys.size];
          overflowing[axis] = overflow > 1;
          bar.hidden = !overflowing[axis];
          if (!overflowing[axis]) continue;
          const track = bar[keys.track] - 4;
          const thumb = Math.max(MIN_THUMB, (viewport[keys.size] / viewport[keys.total]) * track);
          const offset = (viewport[keys.pos] / overflow) * (track - thumb);
          bar.style.setProperty("--thumb-size", `${thumb}px`);
          bar.style.setProperty("--thumb-offset", `${offset}px`);
        }
        area.classList.toggle("has-both", overflowing.x && overflowing.y);
      });
    };
    viewport.addEventListener("scroll", () => {
      update();
      area.classList.add("is-scrolling");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => area.classList.remove("is-scrolling"), 900);
    }, { passive: true });
    new ResizeObserver(update).observe(viewport);
    new MutationObserver(update).observe(viewport, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    viewport.scrollArea = { update };
    update();
  }

  function bindBar(viewport, bar, axis) {
    const keys = AXES[axis];
    const thumb = bar.firstElementChild;
    bar.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const overflow = viewport[keys.total] - viewport[keys.size];
      const track = bar[keys.track] - 4;
      const thumbSize = thumb.getBoundingClientRect()[axis === "y" ? "height" : "width"];
      if (event.target !== thumb) {
        // Click on the track pages toward the pointer.
        const thumbStart = thumb.getBoundingClientRect()[keys.rect];
        const direction = event[keys.pointer] < thumbStart ? -1 : 1;
        viewport.scrollBy({ [axis === "y" ? "top" : "left"]: direction * viewport[keys.size] * 0.9, behavior: "smooth" });
        return;
      }
      const startPointer = event[keys.pointer];
      const startScroll = viewport[keys.pos];
      const ratio = overflow / Math.max(1, track - thumbSize);
      bar.classList.add("is-dragging");
      bar.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        viewport[keys.pos] = startScroll + (moveEvent[keys.pointer] - startPointer) * ratio;
      };
      const end = () => {
        bar.classList.remove("is-dragging");
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", end);
        bar.removeEventListener("pointercancel", end);
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", end);
      bar.addEventListener("pointercancel", end);
    });
  }

  function initScrollAreas(root = document) {
    for (const element of root.querySelectorAll("[data-scroll-area]")) enhanceScroll(element);
  }

  document.addEventListener("keydown", onTabKey);
  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initScrollAreas();
  });

  window.Anoglobe = Object.assign(window.Anoglobe || {}, { announce, initTabs, selectTab, initScrollAreas });
})();
