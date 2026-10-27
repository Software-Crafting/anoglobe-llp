// Theme switch. Load synchronously in <head> so a saved theme applies before first paint.
// With no saved choice, tokens.css follows the OS through color-scheme, so no attribute is set.
// Toggle buttons: <button type="button" data-theme-toggle>. aria-pressed is true while dark.
(() => {
  const STORAGE_KEY = "anoglobe-theme";
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function readSaved() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the choice still applies for this page view.
    }
  }

  function currentTheme() {
    return root.dataset.theme || (systemDark.matches ? "dark" : "light");
  }

  function syncToggles() {
    const isDark = currentTheme() === "dark";
    for (const toggle of document.querySelectorAll("[data-theme-toggle]")) {
      toggle.setAttribute("aria-pressed", String(isDark));
    }
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    save(theme);
    syncToggles();
  }

  const saved = readSaved();
  if (saved) root.dataset.theme = saved;

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-theme-toggle]")) {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    }
  });
  systemDark.addEventListener("change", syncToggles);
  document.addEventListener("DOMContentLoaded", syncToggles);

  window.AnoglobeTheme = { get: currentTheme, set: setTheme };
})();
