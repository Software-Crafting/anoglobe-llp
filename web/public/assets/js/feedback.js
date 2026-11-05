// Feedback: toast stack, loading overlays, optimistic row updates and animated icon swaps.
// Toast icons are inlined from the shell's toast region (data-icons).
(() => {
  const ICONS = { success: "check-circle", destructive: "x-circle", warning: "alert-triangle", info: "info", neutral: "info" };
  const DURATION_MS = 5000;
  const MAX_TOASTS = 3;
  const icon = (name, className = "") => `<svg class="a-icon ${className}" aria-hidden="true"><use href="#${name}"></use></svg>`;

  function region() {
    let element = document.querySelector(".a-toast-region");
    if (!element) {
      element = document.createElement("div");
      element.className = "a-toast-region";
      document.body.append(element);
    }
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", "Notifications");
    return element;
  }

  // toast("Saved", "success", { action: { label: "Undo", onClick } })
  function toast(message, variant = "success", { action, duration = DURATION_MS } = {}) {
    const host = region();
    const item = document.createElement("div");
    item.className = `a-toast a-toast--${variant}`;
    item.setAttribute("role", variant === "destructive" ? "alert" : "status");
    item.innerHTML = `${icon(ICONS[variant] || "info")}<p class="a-toast__message"></p>
      <div class="a-toast__actions">${action ? `<button type="button" class="a-btn a-btn--outline a-btn--sm" data-toast-action>${action.label}</button>` : ""}<button type="button" class="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-toast-close aria-label="Dismiss notification">${icon("close")}</button></div>`;
    item.querySelector(".a-toast__message").textContent = message;
    host.append(item);
    while (host.children.length > MAX_TOASTS) host.firstElementChild.remove();

    let remaining = duration;
    let started = Date.now();
    let timer = setTimeout(() => dismiss(item), remaining);
    const pause = () => {
      clearTimeout(timer);
      remaining -= Date.now() - started;
    };
    const resume = () => {
      started = Date.now();
      clearTimeout(timer);
      timer = setTimeout(() => dismiss(item), Math.max(1500, remaining));
    };
    item.addEventListener("pointerenter", pause);
    item.addEventListener("pointerleave", resume);
    item.addEventListener("focusin", pause);
    item.addEventListener("focusout", resume);
    item.querySelector("[data-toast-close]").addEventListener("click", () => dismiss(item));
    if (action) {
      item.querySelector("[data-toast-action]").addEventListener("click", () => {
        action.onClick();
        dismiss(item);
      });
    }
    return item;
  }

  function dismiss(item) {
    if (!item.isConnected || item.classList.contains("is-leaving")) return;
    item.classList.add("is-leaving");
    const remove = () => item.remove();
    item.addEventListener("animationend", remove, { once: true });
    setTimeout(remove, 400);
  }

  // Loading overlay: <button data-loading-demo="target-id"> shows a spinner over the target for a moment.
  function showLoading(target, label = "Loading", ms = 1600) {
    target.classList.add("a-loading-host");
    target.setAttribute("aria-busy", "true");
    const overlay = document.createElement("div");
    overlay.className = "a-loading-overlay";
    overlay.setAttribute("role", "status");
    overlay.innerHTML = `<span class="a-spinner a-spinner--lg" aria-hidden="true"></span><span>${label}</span>`;
    target.append(overlay);
    return new Promise((resolve) =>
      setTimeout(() => {
        overlay.remove();
        target.removeAttribute("aria-busy");
        resolve();
      }, ms),
    );
  }

  // Optimistic update: <button data-optimistic data-status="Reviewed" data-fail="true|false">
  // updates the row's status right away, then confirms or rolls back.
  function optimistic(button) {
    const row = button.closest("[data-row]");
    const status = row.querySelector(".a-status");
    const before = { text: status.textContent, className: status.className };
    status.textContent = button.dataset.status;
    status.className = `a-status a-status--${button.dataset.statusVariant || "success"}`;
    row.classList.add("is-pending");
    button.disabled = true;
    setTimeout(() => {
      row.classList.remove("is-pending");
      if (button.dataset.fail === "true") {
        status.textContent = before.text;
        status.className = before.className;
        button.disabled = false;
        toast(`Could not update ${row.dataset.row}. The change was undone.`, "destructive");
        return;
      }
      toast(`${row.dataset.row} marked ${button.dataset.status.toLowerCase()}`, "success", {
        action: {
          label: "Undo",
          onClick: () => {
            status.textContent = before.text;
            status.className = before.className;
            button.disabled = false;
            window.Anoglobe?.announce?.("Change undone");
          },
        },
      });
    }, 900);
  }

  document.addEventListener("click", (event) => {
    const toastButton = event.target.closest("[data-toast-demo]");
    if (toastButton) toast(toastButton.dataset.toastDemo, toastButton.dataset.variant || "success");
    const loading = event.target.closest("[data-loading-demo]");
    if (loading) showLoading(document.getElementById(loading.dataset.loadingDemo), loading.dataset.label);
    const optimisticButton = event.target.closest("[data-optimistic]");
    if (optimisticButton) optimistic(optimisticButton);
    const swap = event.target.closest("[data-swap]");
    if (swap) {
      const target = swap.querySelector(".a-swap");
      target.classList.toggle("is-on");
      swap.setAttribute("aria-pressed", String(target.classList.contains("is-on")));
    }
    const replay = event.target.closest("[data-replay]");
    if (replay) {
      const target = document.getElementById(replay.dataset.replay);
      const clone = target.cloneNode(true);
      target.replaceWith(clone);
    }
    const progress = event.target.closest("[data-progress-demo]");
    if (progress) {
      const ring = document.getElementById(progress.dataset.progressDemo);
      let value = 0;
      progress.disabled = true;
      const timer = setInterval(() => {
        value = Math.min(100, value + 10);
        ring.style.setProperty("--value", value);
        ring.closest(".a-progress-ring-wrap").querySelector(".a-progress-ring-wrap__label").textContent = `${value}%`;
        ring.setAttribute("aria-valuenow", String(value));
        if (value === 100) {
          clearInterval(timer);
          progress.disabled = false;
        }
      }, 220);
    }
  });

  // "Link sent" forms: <div data-resume> with [data-resume-state=form|sent] panels.
  document.addEventListener("a-valid-submit", (event) => {
    if (!event.target.matches("[data-resume-form]")) return;
    const root = event.target.closest("[data-resume]");
    root.querySelector('[data-resume-state="form"]').hidden = true;
    const sent = root.querySelector('[data-resume-state="sent"]');
    sent.hidden = false;
    sent.querySelector("[tabindex='-1']").focus();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-resend]")) toast("A new link is on its way", "success");
    if (event.target.closest("[data-print]")) window.print();
  });

  // Offline banner: shown while the browser reports no connection.
  function offlineBanner(show) {
    let banner = document.querySelector("[data-offline-banner]");
    if (!banner && show) {
      banner = document.createElement("div");
      banner.className = "a-banner a-banner--warning";
      banner.dataset.offlineBanner = "";
      banner.setAttribute("role", "status");
      banner.textContent = "You are offline. Changes will save when the connection returns.";
      document.body.prepend(banner);
    }
    if (banner) banner.hidden = !show;
    if (!show && banner) toast("Back online", "success");
  }
  window.addEventListener("offline", () => offlineBanner(true));
  window.addEventListener("online", () => offlineBanner(false));

  window.Anoglobe = Object.assign(window.Anoglobe || {}, { toast, showLoading });
})();
