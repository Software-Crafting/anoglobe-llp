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

// Hides the floating contact buttons while the lead form or footer is on screen, so they neither compete nor cover links.
function initContact() {
  const widget = document.querySelector<HTMLElement>("[data-contact]");
  if (!widget) return () => {};
  const onScreen = new Set<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) onScreen.add(target);
      else onScreen.delete(target);
    }
    widget.toggleAttribute("data-hidden", onScreen.size > 0);
  });
  document.querySelectorAll("#get-started, .v2-footer").forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}

// Opens the contact form once the reader scrolls to Pricing, or past it.
// ponytail: once per page load, so a full reload shows it again. Use sessionStorage if that annoys real visitors.
const POPUP_DELAY_MS = 600;
let popupShown = false;

function initContactPopup() {
  const dialog = document.getElementById("contact-dialog") as HTMLDialogElement | null;
  const pricing = document.getElementById("pricing");
  if (!dialog || !pricing || popupShown) return () => {};

  let timer = 0;
  const onScroll = () => {
    if (timer || pricing.getBoundingClientRect().top > innerHeight / 2) return;
    timer = window.setTimeout(() => {
      timer = 0;
      // Another dialog is open or the page's own form is on screen: try again on the next scroll.
      if (document.querySelector("dialog[open], [data-contact][data-hidden]")) return;
      popupShown = true;
      window.removeEventListener("scroll", onScroll);
      if (!document.querySelector(".v2-lead-sent")) dialog.showModal();
    }, POPUP_DELAY_MS);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener("scroll", onScroll);
    clearTimeout(timer);
  };
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement;


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
    const stopPopup = initContactPopup();
    return () => {
      stopMotion();
      stopToc();
      stopContact();
      stopPopup();
    };
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
