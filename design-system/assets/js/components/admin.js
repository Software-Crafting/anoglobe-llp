// Admin shell: sidebar collapse (remembered), mobile drawer, inline edit, unsaved changes bar,
// secret reveal. Works on any page with <div class="a-admin" data-admin>.
(() => {
  const STORAGE_KEY = "anoglobe-sidebar";
  const announce = (message) => window.Anoglobe?.announce?.(message);
  const toast = (message, variant) => window.Anoglobe?.toast?.(message, variant);

  function readCollapsed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "collapsed";
    } catch {
      return false;
    }
  }

  function saveCollapsed(collapsed) {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      // Storage blocked: the state still applies for this page view.
    }
  }

  function setCollapsed(shell, collapsed) {
    shell.classList.toggle("is-collapsed", collapsed);
    const button = shell.querySelector("[data-sidebar-collapse]");
    if (!button) return;
    button.setAttribute("aria-pressed", String(collapsed));
    button.querySelector(".a-admin-nav__text").textContent = collapsed ? "Expand" : "Collapse";
    button.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  }

  // Mobile drawer
  function openDrawer(shell) {
    shell.classList.add("is-drawer-open");
    shell.querySelector("[data-sidebar-scrim]").hidden = false;
    shell.querySelector("[data-sidebar-open]").setAttribute("aria-expanded", "true");
    shell.querySelector(".a-admin-nav__link")?.focus();
  }

  function closeDrawer(shell, returnFocus = true) {
    if (!shell.classList.contains("is-drawer-open")) return;
    shell.classList.remove("is-drawer-open");
    shell.querySelector("[data-sidebar-scrim]").hidden = true;
    const opener = shell.querySelector("[data-sidebar-open]");
    opener.setAttribute("aria-expanded", "false");
    if (returnFocus) opener.focus();
  }

  // Inline edit: [data-inline-edit] with .a-inline-edit__value and a hidden form
  function startEdit(root) {
    const value = root.querySelector(".a-inline-edit__value");
    const form = root.querySelector(".a-inline-edit__form");
    const input = form.querySelector("input");
    input.value = value.textContent.trim();
    value.hidden = true;
    root.querySelector("[data-inline-start]").hidden = true;
    form.hidden = false;
    input.focus();
    input.select();
  }

  function endEdit(root, save) {
    const value = root.querySelector(".a-inline-edit__value");
    const form = root.querySelector(".a-inline-edit__form");
    const input = form.querySelector("input");
    if (save) {
      if (!input.value.trim()) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      value.textContent = input.value.trim();
      toast(`${root.dataset.inlineEdit} updated`, "success");
    }
    input.removeAttribute("aria-invalid");
    form.hidden = true;
    value.hidden = false;
    const start = root.querySelector("[data-inline-start]");
    start.hidden = false;
    start.focus();
  }

  // Unsaved changes: <form data-dirty-form> shows its [data-save-bar] after the first change.
  function snapshot(form) {
    return JSON.stringify([...form.querySelectorAll("input, textarea")].map((input) => (input.type === "checkbox" || input.type === "radio" ? input.checked : input.value)));
  }

  document.addEventListener("DOMContentLoaded", () => {
    for (const shell of document.querySelectorAll("[data-admin]")) {
      if (!shell.classList.contains("a-admin--demo")) setCollapsed(shell, readCollapsed());
    }
    for (const form of document.querySelectorAll("[data-dirty-form]")) form.dataset.initial = snapshot(form);
  });

  function syncDirty(form) {
    const bar = form.querySelector("[data-save-bar]");
    const dirty = snapshot(form) !== form.dataset.initial;
    if (bar.hidden === dirty) {
      bar.hidden = !dirty;
      if (dirty) announce("You have unsaved changes");
    }
  }

  document.addEventListener("input", (event) => {
    const form = event.target.closest("[data-dirty-form]");
    if (form) syncDirty(form);
  });
  document.addEventListener("change", (event) => {
    const form = event.target.closest("[data-dirty-form]");
    if (form) syncDirty(form);
  });

  document.addEventListener("click", (event) => {
    const shell = event.target.closest("[data-admin]");
    const collapse = event.target.closest("[data-sidebar-collapse]");
    if (collapse && shell) {
      const collapsed = !shell.classList.contains("is-collapsed");
      setCollapsed(shell, collapsed);
      if (!shell.classList.contains("a-admin--demo")) saveCollapsed(collapsed);
    }
    const open = event.target.closest("[data-sidebar-open]");
    if (open && shell) openDrawer(shell);
    if (event.target.closest("[data-sidebar-scrim]") && shell) closeDrawer(shell);

    const start = event.target.closest("[data-inline-start]");
    if (start) startEdit(start.closest("[data-inline-edit]"));
    const save = event.target.closest("[data-inline-save]");
    if (save) endEdit(save.closest("[data-inline-edit]"), true);
    const cancel = event.target.closest("[data-inline-cancel]");
    if (cancel) endEdit(cancel.closest("[data-inline-edit]"), false);

    const discard = event.target.closest("[data-discard]");
    if (discard) {
      const form = discard.closest("[data-dirty-form]");
      form.reset();
      requestAnimationFrame(() => {
        form.querySelector("[data-save-bar]").hidden = true;
        toast("Changes discarded", "info");
      });
    }

    const reveal = event.target.closest("[data-secret-reveal]");
    if (reveal) {
      const input = reveal.closest(".a-secret").querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      reveal.setAttribute("aria-pressed", String(show));
      reveal.setAttribute("aria-label", show ? "Hide key" : "Show key");
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-dirty-form]");
    if (!form) return;
    event.preventDefault();
    form.dataset.initial = snapshot(form);
    form.querySelector("[data-save-bar]").hidden = true;
    toast(form.dataset.saveMessage || "Settings saved", "success");
  });

  document.addEventListener("keydown", (event) => {
    const inline = event.target.closest?.("[data-inline-edit] .a-inline-edit__form");
    if (inline && event.key === "Enter") {
      event.preventDefault();
      endEdit(inline.closest("[data-inline-edit]"), true);
    }
    if (inline && event.key === "Escape") {
      event.preventDefault();
      endEdit(inline.closest("[data-inline-edit]"), false);
    }
    if (event.key === "Escape") {
      for (const shell of document.querySelectorAll("[data-admin].is-drawer-open")) closeDrawer(shell);
    }
    // Keep focus inside the open drawer on small screens.
    const drawer = document.querySelector("[data-admin].is-drawer-open .a-admin-sidebar");
    if (drawer && event.key === "Tab") {
      const focusable = [...drawer.querySelectorAll("a[href], button:not([disabled])")].filter((el) => el.offsetParent);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Login demo: any password signs in, "wrong" shows the error state.
  document.addEventListener("a-valid-submit", (event) => {
    const form = event.target.closest("[data-login-form]");
    if (!form) return;
    const error = document.querySelector("[data-login-error]");
    if (form.querySelector("input[type=password], input[autocomplete=current-password]").value === "wrong") {
      error.hidden = false;
      form.querySelector("input[autocomplete=current-password]").setAttribute("aria-invalid", "true");
      form.querySelector("input[autocomplete=current-password]").focus();
      return;
    }
    window.location.href = "dashboard.html";
  });

  window.matchMedia("(min-width: 1024px)").addEventListener("change", (query) => {
    if (query.matches) for (const shell of document.querySelectorAll("[data-admin]")) closeDrawer(shell, false);
  });
})();
