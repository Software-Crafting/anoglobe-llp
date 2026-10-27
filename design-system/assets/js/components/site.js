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

// Legal pages: highlight the table of contents entry for the section in view.
document.addEventListener("DOMContentLoaded", () => {
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;
  const links = new Map([...toc.querySelectorAll("a")].map((link) => [link.hash.slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links.values()) link.removeAttribute("aria-current");
        links.get(entry.target.id)?.setAttribute("aria-current", "true");
      }
    },
    { rootMargin: "-80px 0px -70% 0px" },
  );
  for (const id of links.keys()) {
    const heading = document.getElementById(id);
    if (heading) observer.observe(heading);
  }
});
