// Form controls: masks, password reveal, counters, steppers, listbox controls (select, combobox,
// multi-select), date picker, OTP, file dropzone, sliders, toggle groups and inline validation.
// Every widget keeps a real input for form submission and works with keyboard alone.
(() => {
  const icon = (name, className = "") => `<svg class="a-icon ${className}" aria-hidden="true"><use href="#${name}"></use></svg>`;
  const announce = (message) => window.Anoglobe?.announce?.(message);
  let uid = 0;
  const nextId = (prefix) => `${prefix}-${++uid}`;

  // Option sources for long lists, so pages stay short. Icons used: check.
  const US_STATES = [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
    ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
    ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
    ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
    ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
    ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
    ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
    ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ];
  const COUNTRIES = [
    ["US", "United States", "+1"], ["CA", "Canada", "+1"], ["GB", "United Kingdom", "+44"], ["IN", "India", "+91"],
    ["AU", "Australia", "+61"], ["MX", "Mexico", "+52"], ["DE", "Germany", "+49"], ["AE", "United Arab Emirates", "+971"],
  ];
  function times() {
    const list = [];
    for (let minutes = 8 * 60; minutes <= 18 * 60; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const label = `${((hour + 11) % 12) + 1}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
      list.push([label, label]);
    }
    return list;
  }
  const SOURCES = {
    "us-states": () => US_STATES,
    countries: () => COUNTRIES.map(([code, name]) => [code, name]),
    "phone-countries": () => COUNTRIES.map(([code, name, dial]) => [`${dial}|${code}`, name, dial, `${code} ${dial}`]),
    times,
  };

  /* ---------- Masks and formatting ---------- */
  const digits = (value) => value.replace(/\D/g, "");
  const MASKS = {
    ein: (v) => {
      const d = digits(v).slice(0, 9);
      return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
    },
    zip: (v) => {
      const d = digits(v).slice(0, 9);
      return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    },
    phone: (v) => {
      const d = digits(v).slice(0, 10);
      if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
      if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return d.length ? `(${d}` : "";
    },
    date: (v) => {
      const d = digits(v).slice(0, 8);
      if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
      if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
      return d;
    },
    card: (v) => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "),
    expiry: (v) => {
      const d = digits(v).slice(0, 4);
      return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
    },
    cvc: (v) => digits(v).slice(0, 4),
  };

  function applyMask(input) {
    const mask = MASKS[input.dataset.mask];
    if (!mask) return;
    const atEnd = input.selectionStart === input.value.length;
    input.value = mask(input.value);
    if (atEnd) input.setSelectionRange(input.value.length, input.value.length);
  }

  const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function formatCurrency(input) {
    const value = Number(input.value.replace(/[^\d.]/g, ""));
    input.value = input.value.trim() === "" || Number.isNaN(value) ? "" : usd.format(value);
  }

  /* ---------- Password reveal, counter, number stepper ---------- */
  function togglePassword(button) {
    const input = button.closest("[data-password]").querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }

  function updateCounter(textarea) {
    const counter = document.getElementById(textarea.dataset.counter);
    const max = Number(textarea.getAttribute("maxlength"));
    counter.textContent = `${textarea.value.length} / ${max}`;
    counter.classList.toggle("is-over", textarea.value.length >= max);
  }

  function stepNumber(button) {
    const input = button.closest("[data-number]").querySelector("input");
    const step = Number(input.step || 1) * Number(button.dataset.step);
    const min = input.min === "" ? -Infinity : Number(input.min);
    const max = input.max === "" ? Infinity : Number(input.max);
    input.value = Math.min(max, Math.max(min, Number(input.value || 0) + step));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    syncNumberButtons(input);
  }

  function syncNumberButtons(input) {
    const root = input.closest("[data-number]");
    root.querySelector('[data-step="-1"]').disabled = input.min !== "" && Number(input.value) <= Number(input.min);
    root.querySelector('[data-step="1"]').disabled = input.max !== "" && Number(input.value) >= Number(input.max);
  }

  /* ---------- Listbox controller: select, combobox, multi-select ---------- */
  function optionMarkup([value, label, meta, display], selected) {
    return `<li role="option" class="a-option" id="${nextId("opt")}" data-value="${value}"${display ? ` data-display="${display}"` : ""} aria-selected="${selected.includes(value)}">${label}${meta ? `<span class="a-option__meta">${meta}</span>` : ""}${icon("check", "a-option__check")}</li>`;
  }

  class Listbox {
    constructor(root) {
      this.root = root;
      this.mode = root.dataset.listbox;
      this.popover = root.querySelector(".a-listbox-popover");
      this.list = root.querySelector("[role=listbox]");
      this.trigger = root.querySelector(".a-select__trigger");
      this.search = root.querySelector("[data-listbox-search]");
      this.input = this.mode === "select" ? this.search : root.querySelector("[role=combobox]");
      this.hidden = root.querySelector("input[type=hidden]");
      this.typed = "";
      const source = root.dataset.source;
      if (source) {
        const selected = (this.hidden?.value || "").split(",");
        this.list.insertAdjacentHTML("beforeend", SOURCES[source]().map((item) => optionMarkup(item, selected)).join(""));
      }
      for (const option of this.options()) option.id ||= nextId("opt");
      this.empty = document.createElement("li");
      this.empty.className = "a-listbox__empty";
      this.empty.setAttribute("role", "presentation");
      this.empty.textContent = "No matches";
      this.empty.hidden = true;
      this.list.append(this.empty);
      this.bind();
      if (this.mode === "multi") this.renderChips();
    }

    options() {
      return [...this.list.querySelectorAll("[role=option]")];
    }

    visible() {
      return this.options().filter((option) => !option.hidden && option.getAttribute("aria-disabled") !== "true");
    }

    isOpen() {
      return !this.popover.hidden;
    }

    focusTarget() {
      return this.input || this.list;
    }

    expandedHost() {
      return this.mode === "select" ? this.trigger : this.input;
    }

    open() {
      if (this.isOpen()) return;
      this.popover.hidden = false;
      this.expandedHost().setAttribute("aria-expanded", "true");
      if (this.search) this.search.setAttribute("aria-expanded", "true");
      const space = window.innerHeight - this.root.getBoundingClientRect().bottom;
      this.popover.classList.toggle("is-above", space < this.popover.offsetHeight + 16 && this.root.getBoundingClientRect().top > space);
      const selected = this.options().find((option) => option.getAttribute("aria-selected") === "true");
      this.setActive(selected && !selected.hidden ? selected : this.visible()[0]);
      if (this.mode === "select") this.focusTarget().focus();
    }

    close(returnFocus = true) {
      if (!this.isOpen()) return;
      this.popover.hidden = true;
      this.expandedHost().setAttribute("aria-expanded", "false");
      if (this.search) {
        this.search.value = "";
        this.filter("");
      }
      this.setActive(null);
      if (returnFocus && this.mode === "select") this.trigger.focus();
    }

    setActive(option) {
      for (const item of this.options()) item.classList.toggle("is-active", item === option);
      const host = this.focusTarget();
      if (option) {
        host.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      } else {
        host.removeAttribute("aria-activedescendant");
      }
      this.active = option;
    }

    move(delta) {
      const items = this.visible();
      if (!items.length) return;
      const index = items.indexOf(this.active);
      const next = index === -1 ? (delta > 0 ? 0 : items.length - 1) : Math.min(items.length - 1, Math.max(0, index + delta));
      this.setActive(items[next]);
    }

    filter(query) {
      const needle = query.trim().toLowerCase();
      for (const option of this.options()) option.hidden = needle !== "" && !option.textContent.toLowerCase().includes(needle);
      for (const group of this.list.querySelectorAll("[role=group]")) {
        group.parentElement.hidden = ![...group.querySelectorAll("[role=option]")].some((option) => !option.hidden);
      }
      this.empty.hidden = this.visible().length > 0;
      if (!this.visible().includes(this.active)) this.setActive(this.visible()[0] || null);
    }

    labelOf(option) {
      return option.firstChild.textContent.trim();
    }

    choose(option) {
      if (!option || option.getAttribute("aria-disabled") === "true") return;
      if (this.mode === "multi") {
        const selected = option.getAttribute("aria-selected") !== "true";
        option.setAttribute("aria-selected", String(selected));
        this.renderChips();
        announce(`${this.labelOf(option)} ${selected ? "added" : "removed"}`);
        this.input.value = "";
        this.filter("");
        return;
      }
      for (const item of this.options()) item.setAttribute("aria-selected", String(item === option));
      if (this.mode === "select") {
        const value = this.trigger.querySelector(".a-select__value");
        value.textContent = option.dataset.display || this.labelOf(option);
        value.classList.remove("is-placeholder");
        this.trigger.removeAttribute("aria-invalid");
      } else {
        this.input.value = this.labelOf(option);
      }
      if (this.hidden) {
        this.hidden.value = option.dataset.value;
        this.hidden.dispatchEvent(new Event("change", { bubbles: true }));
      }
      this.close();
    }

    renderChips() {
      const chips = this.root.querySelector("[data-chips]");
      const selected = this.options().filter((option) => option.getAttribute("aria-selected") === "true");
      chips.innerHTML = selected
        .map((option) => `<span class="a-tag">${this.labelOf(option)}<button type="button" class="a-tag__remove" data-chip-remove="${option.id}" aria-label="Remove ${this.labelOf(option)}">${icon("close")}</button></span>`)
        .join("");
      this.hidden.value = selected.map((option) => option.dataset.value).join(",");
      this.hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }

    typeahead(char) {
      clearTimeout(this.typedTimer);
      this.typed += char.toLowerCase();
      this.typedTimer = setTimeout(() => (this.typed = ""), 600);
      const match = this.visible().find((option) => this.labelOf(option).toLowerCase().startsWith(this.typed));
      if (match) this.setActive(match);
    }

    onKey(event) {
      const { key } = event;
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        if (!this.isOpen()) this.open();
        else this.move(key === "ArrowDown" ? 1 : -1);
      } else if (key === "Home" && this.isOpen() && !this.input) {
        event.preventDefault();
        this.setActive(this.visible()[0]);
      } else if (key === "End" && this.isOpen() && !this.input) {
        event.preventDefault();
        this.setActive(this.visible().at(-1));
      } else if (key === "Enter" || (key === " " && !this.input)) {
        if (this.isOpen() && this.active) {
          event.preventDefault();
          this.choose(this.active);
        } else if (this.mode === "select") {
          event.preventDefault();
          this.open();
        }
      } else if (key === "Escape") {
        if (this.isOpen()) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
      } else if (key === "Tab") {
        this.close(false);
      } else if (key === "Backspace" && this.mode === "multi" && this.input.value === "") {
        const last = this.options().filter((option) => option.getAttribute("aria-selected") === "true").at(-1);
        if (last) this.choose(last);
      } else if (key.length === 1 && !this.input && this.isOpen()) {
        this.typeahead(key);
      }
    }

    bind() {
      this.trigger?.addEventListener("click", () => (this.isOpen() ? this.close() : this.open()));
      this.trigger?.addEventListener("keydown", (event) => this.onKey(event));
      this.focusTarget().addEventListener("keydown", (event) => this.onKey(event));
      this.input?.addEventListener("input", () => {
        this.open();
        this.filter(this.input.value);
      });
      if (this.mode !== "select") this.input.addEventListener("focus", () => this.open());
      this.list.addEventListener("mousedown", (event) => event.preventDefault());
      this.list.addEventListener("click", (event) => this.choose(event.target.closest("[role=option]")));
      this.root.querySelector("[data-chips]")?.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-chip-remove]");
        if (remove) {
          this.choose(document.getElementById(remove.dataset.chipRemove));
          this.input.focus();
        }
      });
      this.root.querySelector(".a-multiselect__control")?.addEventListener("click", (event) => {
        if (!event.target.closest("button")) this.input.focus();
      });
      document.addEventListener("pointerdown", (event) => {
        if (!this.root.contains(event.target)) this.close(false);
      });
    }
  }

  /* ---------- Date picker ---------- */
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const toInput = (date) => `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  function parseDate(text) {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
    return date.getMonth() === Number(match[1]) - 1 ? date : null;
  }
  const longDate = (date) => date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  class DatePicker {
    constructor(root) {
      this.root = root;
      this.range = root.dataset.datepicker === "range";
      this.inputs = [...root.querySelectorAll("input[data-mask=date]")];
      this.button = root.querySelector("[data-datepicker-open]");
      this.today = root.dataset.today ? parseDate(root.dataset.today) : new Date();
      this.min = root.dataset.min === "today" ? this.today : root.dataset.min ? parseDate(root.dataset.min) : null;
      this.panel = document.createElement("div");
      this.panel.className = "a-calendar";
      this.panel.setAttribute("role", "dialog");
      this.panel.setAttribute("aria-label", this.range ? "Choose date range" : "Choose date");
      this.panel.hidden = true;
      root.append(this.panel);
      this.button.addEventListener("click", () => (this.panel.hidden ? this.open() : this.close()));
      this.panel.addEventListener("keydown", (event) => this.onKey(event));
      this.panel.addEventListener("click", (event) => this.onClick(event));
      // Clicking the field opens the calendar right away and keeps focus in the field for typing.
      // Alt+ArrowDown or ArrowDown from the field moves focus into the calendar.
      for (const input of this.inputs) {
        input.addEventListener("click", () => this.panel.hidden && this.open({ focusGrid: false }));
        input.addEventListener("keydown", (event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (this.panel.hidden) this.open();
            else this.focusCurrent();
          }
          if (event.key === "Escape" && !this.panel.hidden) {
            event.preventDefault();
            this.close(false);
          }
        });
        input.addEventListener("input", () => {
          this.readInputs();
          const typed = parseDate(input.value);
          if (typed && !this.panel.hidden) {
            this.focusDate = typed;
            this.render();
          }
        });
      }
      root.addEventListener("focusout", (event) => {
        if (!this.panel.hidden && event.relatedTarget && !root.contains(event.relatedTarget)) this.close(false);
      });
      document.addEventListener("pointerdown", (event) => {
        if (!this.panel.hidden && !root.contains(event.target)) this.close(false);
      });
    }

    readInputs() {
      this.start = parseDate(this.inputs[0].value);
      this.end = this.range ? parseDate(this.inputs[1].value) : null;
    }

    open({ focusGrid = true } = {}) {
      this.readInputs();
      this.focusDate = this.start || this.today;
      this.view = "days";
      this.panel.hidden = false;
      this.button.setAttribute("aria-expanded", "true");
      this.render();
      const space = window.innerHeight - this.root.getBoundingClientRect().bottom;
      this.panel.classList.toggle("is-above", space < this.panel.offsetHeight + 16 && this.root.getBoundingClientRect().top > space);
      if (focusGrid) this.focusCurrent();
    }

    close(returnFocus = true) {
      this.panel.hidden = true;
      this.button.setAttribute("aria-expanded", "false");
      if (returnFocus) this.button.focus();
    }

    disabled(date) {
      return this.min && date < new Date(this.min.getFullYear(), this.min.getMonth(), this.min.getDate());
    }

    render() {
      const year = this.focusDate.getFullYear();
      const month = this.focusDate.getMonth();
      if (this.view === "months") {
        this.panel.innerHTML = `
          <div class="a-calendar__head">
            <button type="button" class="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-cal="prev-year" aria-label="Previous year">${icon("chevron-left")}</button>
            <button type="button" class="a-calendar__title" data-cal="days" aria-label="${year}, back to days">${year}</button>
            <button type="button" class="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-cal="next-year" aria-label="Next year">${icon("chevron-right")}</button>
          </div>
          <div class="a-calendar__months">${MONTHS.map((name, index) => `<button type="button" data-month="${index}" aria-current="${index === month}" tabindex="${index === month ? 0 : -1}">${name.slice(0, 3)}</button>`).join("")}</div>`;
        return;
      }
      const first = new Date(year, month, 1);
      const startOffset = first.getDay();
      const cells = [];
      for (let i = 0; i < 42; i++) cells.push(new Date(year, month, 1 - startOffset + i));
      const rows = [];
      for (let r = 0; r < 6; r++) {
        rows.push(
          `<tr>${cells
            .slice(r * 7, r * 7 + 7)
            .map((date) => {
              const selected = sameDay(date, this.start) || sameDay(date, this.end);
              const inRange = this.range && this.start && this.end && date > this.start && date < this.end;
              const classes = ["a-day", date.getMonth() !== month && "is-outside", sameDay(date, this.today) && "is-today", inRange && "is-in-range"].filter(Boolean).join(" ");
              return `<td><button type="button" class="${classes}" data-date="${toInput(date)}" tabindex="${sameDay(date, this.focusDate) ? 0 : -1}" aria-selected="${selected}"${this.disabled(date) ? ' aria-disabled="true"' : ""} aria-label="${longDate(date)}${sameDay(date, this.today) ? ", today" : ""}">${date.getDate()}</button></td>`;
            })
            .join("")}</tr>`,
        );
      }
      this.panel.innerHTML = `
        <div class="a-calendar__head">
          <button type="button" class="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-cal="prev" aria-label="Previous month">${icon("chevron-left")}</button>
          <button type="button" class="a-calendar__title" data-cal="months" aria-live="polite">${MONTHS[month]} ${year}${icon("chevron-down")}</button>
          <button type="button" class="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-cal="next" aria-label="Next month">${icon("chevron-right")}</button>
        </div>
        <table class="a-calendar__grid" role="presentation">
          <thead><tr>${["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => `<th scope="col" abbr="${day}">${day}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
        <div class="a-calendar__foot">
          <button type="button" class="a-btn a-btn--ghost a-btn--sm" data-cal="today">Today</button>
          <button type="button" class="a-btn a-btn--ghost a-btn--sm" data-cal="clear">Clear</button>
        </div>`;
    }

    focusCurrent() {
      this.panel.querySelector('[tabindex="0"]')?.focus();
    }

    shift(days = 0, months = 0) {
      const next = new Date(this.focusDate);
      if (months) {
        const day = next.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() + months);
        next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      }
      next.setDate(next.getDate() + days);
      this.focusDate = next;
      this.render();
      this.focusCurrent();
    }

    pick(date) {
      if (this.disabled(date)) return;
      if (!this.range) {
        this.start = date;
        this.inputs[0].value = toInput(date);
        this.inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
        announce(`Selected ${longDate(date)}`);
        this.close();
        return;
      }
      if (!this.start || this.end || date < this.start) {
        this.start = date;
        this.end = null;
        announce(`Start date ${longDate(date)}. Choose an end date.`);
      } else {
        this.end = date;
        announce(`Range ${longDate(this.start)} to ${longDate(date)}`);
      }
      this.inputs[0].value = toInput(this.start);
      this.inputs[1].value = this.end ? toInput(this.end) : "";
      this.focusDate = date;
      this.render();
      if (this.end) this.close();
      else this.focusCurrent();
    }

    onClick(event) {
      const day = event.target.closest("[data-date]");
      if (day) return this.pick(parseDate(day.dataset.date));
      const month = event.target.closest("[data-month]");
      if (month) {
        this.focusDate = new Date(this.focusDate.getFullYear(), Number(month.dataset.month), 1);
        this.view = "days";
        this.render();
        return this.focusCurrent();
      }
      const action = event.target.closest("[data-cal]")?.dataset.cal;
      if (action === "prev") this.shift(0, -1);
      if (action === "next") this.shift(0, 1);
      if (action === "prev-year" || action === "next-year") {
        this.focusDate = new Date(this.focusDate.getFullYear() + (action === "next-year" ? 1 : -1), this.focusDate.getMonth(), 1);
        this.render();
        this.panel.querySelector(`[data-cal="${action}"]`).focus();
      }
      if (action === "months" || action === "days") {
        this.view = action;
        this.render();
        this.focusCurrent();
      }
      if (action === "today") {
        this.focusDate = this.today;
        this.pick(this.today);
      }
      if (action === "clear") {
        this.start = this.end = null;
        for (const input of this.inputs) input.value = "";
        this.close();
      }
    }

    onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return this.close();
      }
      if (event.key === "Tab") {
        const focusable = [...this.panel.querySelectorAll("button:not([tabindex='-1'])")];
        const index = focusable.indexOf(document.activeElement);
        const next = event.shiftKey ? index - 1 : index + 1;
        if (next < 0 || next >= focusable.length) {
          event.preventDefault();
          focusable.at(event.shiftKey ? -1 : 0).focus();
        }
        return;
      }
      if (this.view === "months" && event.target.dataset.month !== undefined) {
        const index = Number(event.target.dataset.month);
        const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
        if (moves[event.key] !== undefined) {
          event.preventDefault();
          const next = Math.min(11, Math.max(0, index + moves[event.key]));
          this.panel.querySelector(`[data-month="${next}"]`).focus();
        }
        return;
      }
      if (!event.target.dataset.date) return;
      const keys = {
        ArrowLeft: () => this.shift(-1),
        ArrowRight: () => this.shift(1),
        ArrowUp: () => this.shift(-7),
        ArrowDown: () => this.shift(7),
        Home: () => this.shift(-this.focusDate.getDay()),
        End: () => this.shift(6 - this.focusDate.getDay()),
        PageUp: () => this.shift(0, event.shiftKey ? -12 : -1),
        PageDown: () => this.shift(0, event.shiftKey ? 12 : 1),
      };
      if (keys[event.key]) {
        event.preventDefault();
        keys[event.key]();
      }
    }
  }

  /* ---------- OTP ---------- */
  function initOtp(root) {
    const cells = [...root.querySelectorAll(".a-otp__cell")];
    const hidden = root.querySelector("input[type=hidden]");
    const sync = () => (hidden.value = cells.map((cell) => cell.value).join(""));
    cells.forEach((cell, index) => {
      cell.addEventListener("input", () => {
        cell.value = digits(cell.value).slice(-1);
        sync();
        if (cell.value && cells[index + 1]) cells[index + 1].focus();
      });
      cell.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !cell.value && cells[index - 1]) cells[index - 1].focus();
        if (event.key === "ArrowLeft" && cells[index - 1]) cells[index - 1].focus();
        if (event.key === "ArrowRight" && cells[index + 1]) cells[index + 1].focus();
      });
      cell.addEventListener("paste", (event) => {
        event.preventDefault();
        const pasted = digits(event.clipboardData.getData("text")).slice(0, cells.length - index);
        [...pasted].forEach((char, offset) => (cells[index + offset].value = char));
        sync();
        cells[Math.min(cells.length - 1, index + pasted.length)].focus();
      });
    });
  }

  /* ---------- File dropzone (uploads are simulated). Icons used: file-text, check-circle, x-circle, trash. ---------- */
  const formatSize = (bytes) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

  function addFile(list, file, error) {
    const item = document.createElement("li");
    item.className = `a-file${error ? " is-error" : ""}`;
    item.innerHTML = `${icon(error ? "x-circle" : "file-text")}
      <span class="a-file__name">${file.name}</span>
      <span class="a-file__meta" aria-live="polite">${error || `${formatSize(file.size)}, uploading 0%`}</span>
      ${error ? "" : `<span class="a-progress" role="progressbar" aria-label="Upload progress for ${file.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="a-progress__bar"></span></span>`}
      <span class="a-file__actions"><button type="button" class="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-file-remove aria-label="Remove ${file.name}">${icon("trash")}</button></span>`;
    list.append(item);
    if (error) return announce(`${file.name}: ${error}`);
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + 12 + Math.round(Math.random() * 18));
      const bar = item.querySelector(".a-progress");
      if (!bar) return clearInterval(timer);
      bar.style.setProperty("--value", `${progress}%`);
      bar.setAttribute("aria-valuenow", String(progress));
      item.querySelector(".a-file__meta").textContent = `${formatSize(file.size)}, uploading ${progress}%`;
      if (progress === 100) {
        clearInterval(timer);
        bar.remove();
        item.classList.add("is-done");
        item.querySelector("svg use").setAttribute("href", "#check-circle");
        item.querySelector(".a-file__meta").textContent = `${formatSize(file.size)}, uploaded`;
        announce(`${file.name} uploaded`);
      }
    }, 280);
  }

  function initDropzone(zone) {
    const input = zone.querySelector("input[type=file]");
    const list = document.getElementById(zone.dataset.dropzone);
    const maxBytes = Number(zone.dataset.maxMb || 25) * 1048576;
    const accepted = (input.accept || "").split(",").map((type) => type.trim().toLowerCase()).filter(Boolean);
    const handle = (files) => {
      for (const file of files) {
        const extension = `.${file.name.split(".").pop().toLowerCase()}`;
        let error = "";
        if (accepted.length && !accepted.includes(extension)) error = `${extension.toUpperCase().slice(1)} files are not accepted. Use ${accepted.join(", ").toUpperCase().replaceAll(".", "")}.`;
        else if (file.size > maxBytes) error = `File is ${formatSize(file.size)}. The limit is ${zone.dataset.maxMb || 25} MB.`;
        addFile(list, file, error);
      }
      input.value = "";
    };
    input.addEventListener("change", () => handle(input.files));
    zone.addEventListener("dragover", () => zone.classList.add("is-dragover"));
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", () => zone.classList.remove("is-dragover"));
    list.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-file-remove]");
      if (!remove) return;
      const item = remove.closest(".a-file");
      announce(`${item.querySelector(".a-file__name").textContent} removed`);
      item.remove();
      input.focus();
    });
  }

  /* ---------- Sliders ---------- */
  const FORMATS = {
    currency: (v) => `$${Number(v).toLocaleString("en-US")}`,
    transactions: (v) => (Number(v) >= 1000 ? "1,000+ transactions" : `${Number(v).toLocaleString("en-US")} transactions`),
    number: (v) => Number(v).toLocaleString("en-US"),
  };

  function updateSlider(root) {
    const ranges = [...root.querySelectorAll(".a-range")];
    const [low, high] = ranges;
    if (high && Number(low.value) > Number(high.value)) {
      if (document.activeElement === low) low.value = high.value;
      else high.value = low.value;
    }
    const percent = (input) => ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    const rail = root.querySelector(".a-slider__rail");
    rail.style.setProperty("--from", `${high ? percent(low) : 0}%`);
    rail.style.setProperty("--to", `${percent(high || low)}%`);
    const format = FORMATS[root.dataset.format || "number"];
    for (const input of ranges) input.setAttribute("aria-valuetext", format(input.value));
    const output = root.querySelector("[data-slider-output]");
    if (output) output.textContent = high ? `${format(low.value)} to ${format(high.value)}` : format(low.value);
  }

  /* ---------- Validation ---------- */
  const PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    ein: /^\d{2}-\d{7}$/,
    zip: /^\d{5}(-\d{4})?$/,
    phone: /^\(\d{3}\) \d{3}-\d{4}$/,
    date: /^\d{2}\/\d{2}\/\d{4}$/,
    url: /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i,
  };

  function controlFor(field) {
    return field.querySelector("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, .a-select__trigger, [role=combobox]") || field.querySelector("input");
  }

  function message(field, key, fallback) {
    return field.dataset[`msg${key[0].toUpperCase()}${key.slice(1)}`] || fallback;
  }

  // Returns an error message or "" for one .a-field or [data-group] fieldset.
  function check(field) {
    if (field.matches("[data-required-group]")) {
      const checked = field.querySelectorAll("input:checked").length;
      return checked ? "" : message(field, "required", "Choose at least one option.");
    }
    const hidden = field.querySelector("input[type=hidden][required], input[type=hidden][data-required]");
    if (hidden) return hidden.value ? "" : message(field, "required", "Choose an option.");
    const radios = field.querySelectorAll("input[type=radio]");
    if (radios.length) return [...radios].some((radio) => radio.checked) || !radios[0].required ? "" : message(field, "required", "Choose an option.");
    const checkbox = field.querySelector("input[type=checkbox][required]");
    if (checkbox) return checkbox.checked ? "" : message(field, "required", "Check this box to continue.");
    const input = field.querySelector("input:not([type=hidden]), textarea");
    if (!input) return "";
    const value = input.value.trim();
    if (!value) return input.required ? message(field, "required", "This field is required.") : "";
    const rule = input.dataset.validate || (input.type === "email" ? "email" : input.dataset.mask);
    if (rule && PATTERNS[rule] && !PATTERNS[rule].test(value)) return message(field, "pattern", "Check the format and try again.");
    if (rule === "date" && !parseDate(value)) return message(field, "pattern", "Enter a real date as MM/DD/YYYY.");
    if (input.minLength > 0 && value.length < input.minLength) return message(field, "minlength", `Use at least ${input.minLength} characters.`);
    if (input.dataset.match) {
      const other = document.getElementById(input.dataset.match);
      if (other && other.value !== input.value) return message(field, "match", "The values do not match.");
    }
    return "";
  }

  function showError(field, error) {
    const slot = field.querySelector(".a-error");
    const control = controlFor(field);
    const targets = field.matches("[data-required-group]") || field.querySelector("input[type=radio]") ? field.querySelectorAll("input") : [control];
    for (const target of targets) {
      if (!target) continue;
      if (error) target.setAttribute("aria-invalid", "true");
      else target.removeAttribute("aria-invalid");
    }
    if (slot) slot.innerHTML = error ? `${icon("alert-triangle")}<span>${error}</span>` : "";
    field.dataset.touched = "true";
  }

  function validate(container) {
    const fields = [...container.querySelectorAll(".a-field, [data-required-group]")].filter((field) => !field.closest("[hidden]"));
    let firstInvalid = null;
    for (const field of fields) {
      const error = check(field);
      showError(field, error);
      if (error && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid) {
      const control = controlFor(firstInvalid) || firstInvalid.querySelector("input");
      control?.focus();
      const count = fields.filter((field) => check(field)).length;
      announce(`${count} ${count === 1 ? "field needs" : "fields need"} attention.`);
    }
    return !firstInvalid;
  }

  function revalidate(target) {
    const field = target.closest(".a-field, [data-required-group]");
    if (field?.dataset.touched) showError(field, check(field));
  }

  /* ---------- Wiring ---------- */
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.mask) applyMask(target);
    if (target.dataset.counter) updateCounter(target);
    if (target.closest("[data-number]")) syncNumberButtons(target);
    if (target.classList.contains("a-range")) updateSlider(target.closest("[data-slider]"));
    revalidate(target);
  });

  document.addEventListener("change", (event) => revalidate(event.target));

  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (target.dataset?.currency !== undefined) formatCurrency(target);
    const field = target.closest?.(".a-field");
    if (field && target.matches("input:not([type=checkbox]):not([type=radio]), textarea") && !field.querySelector("[data-listbox]")) {
      if (target.value.trim() || field.dataset.touched) showError(field, check(field));
    }
  });

  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target.dataset?.currency !== undefined) target.value = target.value.replace(/,/g, "");
  });

  document.addEventListener("click", (event) => {
    const password = event.target.closest("[data-password-toggle]");
    if (password) togglePassword(password);
    const step = event.target.closest("[data-step]");
    if (step?.closest("[data-number]")) stepNumber(step);
    const toggle = event.target.closest("[data-toggle-group] .a-toggle");
    if (toggle) {
      const group = toggle.closest("[data-toggle-group]");
      const pressed = toggle.getAttribute("aria-pressed") === "true";
      if (group.dataset.toggleGroup === "single") for (const other of group.querySelectorAll(".a-toggle")) other.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-pressed", String(!pressed));
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.dataset.validateForm === undefined) return;
    event.preventDefault();
    if (validate(form)) form.dispatchEvent(new CustomEvent("a-valid-submit", { bubbles: true }));
  });

  function init(root = document) {
    for (const element of root.querySelectorAll("[data-listbox]")) element.listbox ||= new Listbox(element);
    for (const element of root.querySelectorAll("[data-datepicker]")) element.datepicker ||= new DatePicker(element);
    for (const element of root.querySelectorAll("[data-otp]")) initOtp(element);
    for (const element of root.querySelectorAll("[data-dropzone]")) initDropzone(element);
    for (const element of root.querySelectorAll("[data-slider]")) updateSlider(element);
    for (const element of root.querySelectorAll("[data-counter]")) updateCounter(element);
    for (const element of root.querySelectorAll("[data-number] input")) syncNumberButtons(element);
  }

  document.addEventListener("DOMContentLoaded", () => init());
  window.Anoglobe = Object.assign(window.Anoglobe || {}, { validate, initForms: init, parseDate });
})();
