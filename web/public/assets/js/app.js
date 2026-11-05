// Live-site glue on top of the design system's component scripts: real form posts, uploads, toasts.
// Loaded by components/design-js.tsx after React has hydrated, so these DOM changes never fight it.
(() => {
  const api = () => window.Anoglobe;

  // One-shot toast set by the server (lib/http.ts).
  function showFlash() {
    const match = document.cookie.match(/(?:^|; )flash=([^;]+)/);
    if (!match) return;
    document.cookie = "flash=; path=/; max-age=0";
    try {
      const { message, variant } = JSON.parse(decodeURIComponent(match[1]));
      api().toast?.(message, variant);
    } catch {
      // A broken cookie only costs a toast.
    }
  }

  // forms.js validates; a valid form then posts natively and the server redirects back.
  document.addEventListener("a-valid-submit", (event) => {
    const form = event.target;
    const button = form.querySelector("[type=submit]");
    if (button) button.disabled = true;
    form.submit();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;

    // Save for later: keeps what is on the page without validating it.
    const later = target.closest("[data-save-later]");
    if (later && later.form) {
      event.preventDefault();
      const flag = document.createElement("input");
      flag.type = "hidden";
      flag.name = "_later";
      flag.value = "1";
      later.form.append(flag);
      later.form.submit();
      return;
    }

    // Order summary on phones.
    const summary = target.closest("[data-summary-toggle]");
    if (summary) {
      const panel = document.getElementById(summary.getAttribute("aria-controls"));
      const open = summary.getAttribute("aria-expanded") !== "true";
      summary.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      return;
    }

    // Destructive actions ask first, in the design system's dialog.
    const confirmed = target.closest("[data-confirm]");
    if (confirmed) {
      event.preventDefault();
      askConfirm(confirmed);
      return;
    }

    // Inline edit on the registration page: admin.js swaps the text, this saves it.
    const save = target.closest("[data-inline-save]");
    if (save) {
      const box = save.closest("[data-inline-edit]");
      const input = box.querySelector("input");
      const body = new URLSearchParams({ _action: "registration.field", id: box.dataset.reg, field: box.dataset.field, value: input.value });
      fetch("/api/admin", { method: "POST", body, headers: { "X-Requested-With": "fetch" } }).then((response) => {
        if (!response.ok) api().toast?.("That could not be saved. Check the value and try again.", "destructive");
      });
      return;
    }

    // Bulk export: the selected rows go to the CSV route.
    const bulk = target.closest("[data-bulk-export]");
    if (bulk) {
      const table = document.getElementById(bulk.dataset.bulkExport);
      const ids = [...table.querySelectorAll("tr[data-row]")].filter((row) => row.querySelector("[data-select-row]")?.checked).map((row) => row.dataset.id);
      if (ids.length) window.location.href = `/api/admin/export?table=${bulk.dataset.table}&ids=${ids.join(",")}`;
    }
  });

  let confirmDialog;
  function askConfirm(button) {
    if (!confirmDialog) {
      confirmDialog = document.createElement("dialog");
      confirmDialog.className = "a-dialog";
      confirmDialog.setAttribute("aria-labelledby", "confirm-title");
      confirmDialog.innerHTML = `<div class="a-dialog__header"><h2 class="a-dialog__title" id="confirm-title">Are you sure?</h2></div><div class="a-dialog__body"><p data-confirm-text></p></div><div class="a-dialog__footer"><button type="button" class="a-btn a-btn--ghost" data-dialog-close autofocus>Keep it</button><button type="button" class="a-btn a-btn--destructive" data-confirm-yes>Confirm</button></div>`;
      document.body.append(confirmDialog);
    }
    confirmDialog.querySelector("[data-confirm-text]").textContent = button.dataset.confirm;
    confirmDialog.querySelector("[data-confirm-yes]").onclick = () => button.form.submit();
    confirmDialog.showModal();
  }

  // [data-show-when="name=value"] sections follow a radio or select in the same form.
  function syncConditional(root = document) {
    for (const el of root.querySelectorAll("[data-show-when]")) {
      const [name, value] = el.dataset.showWhen.split("=");
      const form = el.closest("form");
      const controls = [...form.querySelectorAll(`[name="${name}"]`)];
      const current = controls.find((c) => c.type !== "radio" && c.type !== "checkbox" ? true : c.checked)?.value;
      const on = current === value;
      el.hidden = !on;
      for (const input of el.querySelectorAll("input")) {
        if (input.dataset.wasRequired === undefined) input.dataset.wasRequired = input.required ? "1" : "";
        input.required = on && input.dataset.wasRequired === "1";
      }
    }
  }
  document.addEventListener("change", (event) => {
    if (event.target.closest("form")?.querySelector("[data-show-when]")) syncConditional();
  });

  // ---------- Document uploads: each file posts as soon as it is chosen ----------
  const icon = (name) => `<svg class="a-icon" aria-hidden="true"><use href="#${name}"></use></svg>`;
  const formatSize = (bytes) => (bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

  function addRow(list, file) {
    const item = document.createElement("li");
    item.className = "a-file";
    item.innerHTML = `${icon("file-text")}<span class="a-file__name"></span><span class="a-file__meta" aria-live="polite"></span><span class="a-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="a-progress__bar"></span></span><span class="a-file__actions"></span>`;
    item.querySelector(".a-file__name").textContent = file.name;
    item.querySelector(".a-file__meta").textContent = `${formatSize(file.size)}, uploading 0%`;
    item.querySelector(".a-progress").setAttribute("aria-label", `Upload progress for ${file.name}`);
    list.append(item);
    return item;
  }

  function fail(item, message) {
    item.classList.add("is-error");
    item.querySelector(".a-progress")?.remove();
    item.querySelector(".a-icon use").setAttribute("href", "#x-circle");
    item.querySelector(".a-file__meta").textContent = message;
    api().announce?.(message);
  }

  function uploadFile(zone, list, file) {
    const item = addRow(list, file);
    const data = new FormData();
    data.append("kind", zone.dataset.kind);
    data.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/onboarding/upload");
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      const bar = item.querySelector(".a-progress");
      bar?.style.setProperty("--value", `${percent}%`);
      bar?.setAttribute("aria-valuenow", String(percent));
      item.querySelector(".a-file__meta").textContent = `${formatSize(file.size)}, uploading ${percent}%`;
    });
    xhr.addEventListener("load", () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Falls through to the generic message.
      }
      if (xhr.status !== 200) return fail(item, body.error || "That upload failed. Try again.");
      item.querySelector(".a-progress")?.remove();
      item.classList.add("is-done");
      item.dataset.id = body.id;
      item.querySelector(".a-file__meta").textContent = `${formatSize(file.size)}, uploaded`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "a-btn a-btn--ghost a-btn--icon a-btn--sm";
      remove.dataset.removeFile = body.id;
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.innerHTML = icon("trash");
      item.querySelector(".a-file__actions").append(remove);
      api().announce?.(`${file.name} uploaded`);
    });
    xhr.addEventListener("error", () => fail(item, "That upload failed. Check your connection and try again."));
    xhr.send(data);
  }

  function initUploads() {
    for (const zone of document.querySelectorAll("[data-upload-zone]")) {
      const input = zone.querySelector("input[type=file]");
      const list = document.getElementById(zone.dataset.uploadZone);
      const take = (files) => {
        for (const file of files) uploadFile(zone, list, file);
        input.value = "";
      };
      input.addEventListener("change", () => take(input.files));
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-dragover");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("is-dragover");
        take(event.dataTransfer.files);
      });
    }
  }

  document.addEventListener("click", async (event) => {
    const remove = event.target.closest("[data-remove-file]");
    if (!remove) return;
    const item = remove.closest(".a-file");
    const body = new URLSearchParams({ id: remove.dataset.removeFile });
    const response = await fetch("/api/onboarding/remove-file", { method: "POST", body });
    if (response.ok) item.remove();
    else api().toast?.("That file could not be removed.", "destructive");
  });

  // ---------- Test payments: card digits stay in the browser; only the last four are posted ----------
  const TEST_NUMBERS = ["4242424242424242", "4000000000000002"];
  function initPayment() {
    const form = document.querySelector("[data-payment-form]");
    if (!form) return;
    const original = api().cardErrors;
    api().cardErrors = (element) => {
      const errors = original(element);
      const digits = element.querySelector("[data-mask=card]").value.replace(/\D/g, "");
      if (!errors.card && !TEST_NUMBERS.includes(digits)) errors.card = "Test mode only accepts the two test cards above.";
      return errors;
    };
    const host = form.closest("[data-pay-flow]");
    const finish = () => {
      const digits = form.querySelector("[data-mask=card]").value.replace(/\D/g, "");
      form.querySelector("[name=card-last4]").value = digits.slice(-4);
      form.querySelector("[name=card-exp]").value = form.querySelector("[data-mask=expiry]").value.replace(/\s/g, "");
      form.submit();
    };
    host.addEventListener("a-payment-success", finish);
    host.addEventListener("a-payment-declined", finish);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Order summary starts folded on small screens, where it sits above the form.
    const panel = document.querySelector("[data-summary-panel]");
    if (panel && window.matchMedia("(max-width: 1023px)").matches) panel.hidden = true;
    syncConditional();
    initUploads();
    initPayment();
    showFlash();
  });
})();
