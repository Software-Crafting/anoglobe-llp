// Public site: mobile navigation toggle. Escape and outside clicks close it; focus returns to the button.
(() => {
  function setOpen(button, open) {
    const nav = document.getElementById(button.getAttribute("aria-controls"));
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Menu");
    button.querySelector("use")?.setAttribute("href", open ? "#close" : "#menu");
    if (open) nav.querySelector("a")?.focus();
  }

  document.addEventListener("click", (event) => {
    const button = document.querySelector("[data-site-menu]");
    if (!button) return;
    if (event.target.closest("[data-site-menu]")) return setOpen(button, button.getAttribute("aria-expanded") !== "true");
    if (button.getAttribute("aria-expanded") === "true" && !event.target.closest("[data-site-nav]")) setOpen(button, false);
  });

  document.addEventListener("keydown", (event) => {
    const button = document.querySelector("[data-site-menu]");
    if (event.key === "Escape" && button?.getAttribute("aria-expanded") === "true") {
      setOpen(button, false);
      button.focus();
    }
  });

  window.matchMedia("(min-width: 1024px)").addEventListener("change", () => {
    const button = document.querySelector("[data-site-menu]");
    if (button) setOpen(button, false);
  });
})();

// Legal pages and the v2 reasons bar: highlight the [data-toc] link for the last section whose top has
// scrolled above ACTIVE_LINE (just below the sticky bars, which land anchors within it), or the last link
// once the page cannot scroll further. Keeps that link visible when the row scrolls sideways.
const ACTIVE_LINE = 140;
document.addEventListener("DOMContentLoaded", () => {
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;
  const targets = [...toc.querySelectorAll("a")]
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(({ section }) => section);
  let current = null;
  let frame = 0;

  function update() {
    frame = 0;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const passed = targets.filter(({ section }) => section.getBoundingClientRect().top <= ACTIVE_LINE);
    const active = (atEnd && passed.length ? targets.at(-1) : passed.at(-1))?.link ?? null;
    if (active === current) return;
    current?.removeAttribute("aria-current");
    current = active;
    if (!active) return;
    active.setAttribute("aria-current", "true");
    const row = active.closest("ul, ol");
    if (row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
    }
  }

  window.addEventListener("scroll", () => { frame ||= requestAnimationFrame(update); }, { passive: true });
  update();
});
