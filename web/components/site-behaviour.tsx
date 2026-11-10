"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Page motion and small interactions from the template, driven by data attributes so pages stay server-rendered.
// Motion only runs when html[data-motion] is set (see layout.tsx); otherwise the page is static and fully visible.
const ACTIVE_LINE = 140;

function onVisible(elements: Iterable<Element>, threshold: number, callback: (element: HTMLElement) => void) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        callback(entry.target as HTMLElement);
      }
    },
    { threshold, rootMargin: "0px 0px -40px 0px" },
  );
  for (const element of elements) observer.observe(element);
  return () => observer.disconnect();
}

function initMotion() {
  const reveals = document.querySelectorAll("[data-reveal]");
  if (!document.documentElement.dataset.motion) {
    reveals.forEach((element) => element.classList.add("is-revealed"));
    return () => {};
  }
  const stopReveals = onVisible(reveals, 0.1, (element) => element.classList.add("is-revealed"));
  const stopCounters = onVisible(document.querySelectorAll("[data-count-to]"), 0.6, (element) => {
    const target = Number(element.dataset.countTo);
    const prefix = element.dataset.countPrefix ?? "";
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 1200);
      element.textContent = `${prefix}${Math.round(target * (1 - (1 - progress) ** 3))}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return () => {
    stopReveals();
    stopCounters();
  };
}

// Highlights the [data-toc] link for the last section scrolled past, and keeps it visible when the row scrolls sideways.
function initToc() {
  const toc = document.querySelector("[data-toc]");
  if (!toc) return () => {};
  const targets = [...toc.querySelectorAll("a")]
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(({ section }) => section);
  let current: HTMLAnchorElement | null = null;
  let frame = 0;

  const update = () => {
    frame = 0;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const passed = targets.filter(({ section }) => section!.getBoundingClientRect().top <= ACTIVE_LINE);
    const active = (atEnd && passed.length ? targets.at(-1) : passed.at(-1))?.link ?? null;
    if (active === current) return;
    current?.removeAttribute("aria-current");
    current = active;
    if (!active) return;
    active.setAttribute("aria-current", "true");
    const row = active.closest("ul, ol")!;
    if (row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
    }
  };
  const onScroll = () => {
    frame ||= requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  update();
  return () => {
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
  };
}

// Hides the floating contact button while the lead form is on screen, so the two do not compete.
function initContact() {
  const widget = document.querySelector<HTMLElement>("[data-contact]");
  const form = document.getElementById("get-started");
  if (!widget || !form) return () => widget?.removeAttribute("data-hidden");
  const observer = new IntersectionObserver(([entry]) => widget.toggleAttribute("data-hidden", entry.isIntersecting));
  observer.observe(form);
  return () => observer.disconnect();
}

// Tooltip ported from the design system (components/tooltip/tooltip.js): data-ds-tooltip="Text", optional
// data-ds-tooltip-side (top, right, bottom, left) and data-ds-tooltip-when (media query, e.g. only while a label is hidden).
// Shows after a short delay on hover, at once on keyboard focus; hides on leave, blur, press or Esc. Touch never shows it.
function initTooltip() {
  const DELAY_MS = 500;
  const GAP = 8;
  const tip = document.createElement("div");
  tip.className = "ds-tooltip";
  tip.id = "ds-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.setAttribute("popover", "manual");
  document.body.append(tip);
  let current: HTMLElement | null = null;
  let timer = 0;
  let warmUntil = 0;

  const place = (trigger: HTMLElement) => {
    const r = trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = tip; // offset size ignores the entry scale
    const side = trigger.dataset.dsTooltipSide || "top";
    let x = r.left + (r.width - width) / 2;
    let y = r.top - height - GAP;
    if (side === "bottom") y = r.bottom + GAP;
    if (side === "left" || side === "right") {
      x = side === "left" ? r.left - width - GAP : r.right + GAP;
      y = r.top + (r.height - height) / 2;
    }
    tip.style.left = `${Math.max(GAP, Math.min(x, innerWidth - width - GAP))}px`;
    tip.style.top = `${Math.max(GAP, Math.min(y, innerHeight - height - GAP))}px`;
    tip.dataset.side = side;
  };
  const panelOpen = (trigger: HTMLElement) => {
    const id = trigger.getAttribute("popovertarget");
    return trigger.getAttribute("aria-expanded") === "true" || !!(id && document.getElementById(id)?.matches(":popover-open"));
  };
  const show = (trigger: HTMLElement) => {
    clearTimeout(timer);
    const when = trigger.dataset.dsTooltipWhen;
    if (!trigger.isConnected || panelOpen(trigger) || (when && !matchMedia(when).matches)) return;
    current = trigger;
    tip.textContent = trigger.dataset.dsTooltip!;
    if (!tip.matches(":popover-open")) tip.showPopover();
    place(trigger);
    const name = trigger.getAttribute("aria-label") ?? trigger.textContent?.trim();
    if (name !== trigger.dataset.dsTooltip) trigger.setAttribute("aria-describedby", tip.id);
  };
  const hide = () => {
    clearTimeout(timer);
    if (current?.getAttribute("aria-describedby") === tip.id) current.removeAttribute("aria-describedby");
    if (current) warmUntil = Date.now() + 300;
    current = null;
    if (tip.matches(":popover-open")) tip.hidePopover();
  };
  const triggerOf = (event: Event) => (event.target as Element).closest?.<HTMLElement>("[data-ds-tooltip]") ?? null;

  const onOver = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const trigger = triggerOf(event);
    if (!trigger || trigger === current) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => show(trigger), Date.now() < warmUntil ? 0 : DELAY_MS);
  };
  const onOut = (event: PointerEvent) => {
    const trigger = triggerOf(event);
    if (trigger && !trigger.contains(event.relatedTarget as Node)) hide();
  };
  const onFocusIn = (event: FocusEvent) => {
    const trigger = triggerOf(event);
    if (!trigger || !trigger.matches(":focus-visible")) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => { if (document.activeElement === trigger) show(trigger); }, 0);
  };
  const onFocusOut = (event: FocusEvent) => { if (triggerOf(event)) hide(); };
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && current) hide(); };
  // Another popover opening (the contact panel) takes over
  const onToggle = (event: Event) => { if (event.target !== tip && (event as ToggleEvent).newState === "open" && current) hide(); };
  const listeners: [string, EventListener, boolean?][] = [
    ["pointerover", onOver as EventListener], ["pointerout", onOut as EventListener], ["focusin", onFocusIn as EventListener],
    ["focusout", onFocusOut as EventListener], ["keydown", onKey as EventListener], ["pointerdown", hide], ["scroll", hide],
    ["toggle", onToggle, true],
  ];
  for (const [type, fn, capture] of listeners) document.addEventListener(type, fn, capture);
  return () => {
    for (const [type, fn, capture] of listeners) document.removeEventListener(type, fn, capture);
    clearTimeout(timer);
    tip.remove();
  };
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  // A link inside a popover (contact panel) closes it, since the page may only scroll.
  const popoverLink = target.closest("[popover] a");
  if (popoverLink) popoverLink.closest<HTMLElement>("[popover]")!.hidePopover();

  const opener = target.closest<HTMLElement>("[data-dialog-open]");
  if (opener) return (document.getElementById(opener.dataset.dialogOpen!) as HTMLDialogElement).showModal();

  const closer = target.closest("[data-dialog-close]");
  if (closer) return closer.closest("dialog")!.close();
  if (target instanceof HTMLDialogElement) return target.close(); // Click on the backdrop.

  const toggle = target.closest<HTMLElement>("[data-marquee-toggle]");
  if (toggle) {
    const paused = toggle.closest("[data-marquee]")!.classList.toggle("is-paused");
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.querySelector("span")!.textContent = paused ? "Play reviews" : "Pause reviews";
    toggle.querySelector("use")!.setAttribute("href", paused ? "#play" : "#paused");
  }
}

export function SiteBehaviour() {
  const pathname = usePathname();

  useEffect(() => {
    const stopMotion = initMotion();
    const stopToc = initToc();
    const stopContact = initContact();
    return () => {
      stopMotion();
      stopToc();
      stopContact();
    };
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("click", onClick);
    const stopTooltip = initTooltip();
    return () => {
      document.removeEventListener("click", onClick);
      stopTooltip();
    };
  }, []);

  return null;
}
