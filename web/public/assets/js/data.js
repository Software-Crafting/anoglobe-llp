// Data display: table controller (sort, search, filters, selection, bulk bar, density, columns,
// pagination) and SVG charts (line, bar, donut, sparkline) with hover tooltips and table views.
(() => {
  const icon = (name, className = "") => `<svg class="a-icon ${className}" aria-hidden="true"><use href="#${name}"></use></svg>`;
  const announce = (message) => window.Anoglobe?.announce?.(message);
  const usd = (value, digits = 0) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  const FORMATS = { currency: (v) => usd(v), number: (v) => Number(v).toLocaleString("en-US"), percent: (v) => `${v}%` };

  /* ---------- Table ---------- */
  class Table {
    constructor(table) {
      this.table = table;
      this.id = table.id;
      this.body = table.tBodies[0];
      this.rows = [...this.body.querySelectorAll("tr[data-row]")];
      this.empty = this.body.querySelector("[data-empty]");
      this.pageSize = Number(table.dataset.pageSize || 0);
      this.page = 1;
      this.query = "";
      this.filters = {};
      this.pagination = document.querySelector(`[data-pagination-for="${this.id}"]`);
      this.bulk = document.querySelector(`[data-bulk-for="${this.id}"]`);
      this.selectAll = table.querySelector("thead [data-select-all]");
      table.addEventListener("click", (event) => {
        const sort = event.target.closest(".a-sort");
        if (sort) this.sort(sort.closest("th"));
      });
      table.addEventListener("change", (event) => {
        if (event.target.matches("[data-select-all]")) this.selectVisible(event.target.checked);
        else if (event.target.matches("[data-select-row]")) this.syncSelection();
      });
      this.render();
    }

    matches(row) {
      if (this.query && !row.textContent.toLowerCase().includes(this.query)) return false;
      return Object.entries(this.filters).every(([key, values]) => !values.length || values.includes(row.dataset[key]));
    }

    visibleRows() {
      return this.rows.filter((row) => this.matches(row));
    }

    render() {
      const visible = this.visibleRows();
      const pages = this.pageSize ? Math.max(1, Math.ceil(visible.length / this.pageSize)) : 1;
      this.page = Math.min(this.page, pages);
      const start = (this.page - 1) * this.pageSize;
      const shown = this.pageSize ? visible.slice(start, start + this.pageSize) : visible;
      for (const row of this.rows) row.hidden = !shown.includes(row);
      if (this.empty) this.empty.hidden = visible.length > 0;
      this.renderPagination(visible.length, pages, start, shown.length);
      this.syncSelection();
    }

    renderPagination(total, pages, start, count) {
      if (!this.pagination) return;
      const numbers = [];
      for (let page = 1; page <= pages; page++) {
        if (page === 1 || page === pages || Math.abs(page - this.page) <= 1) numbers.push(page);
        else if (numbers.at(-1) !== "gap") numbers.push("gap");
      }
      const button = (page, label, content, disabled = false) =>
        `<li><button type="button" class="a-pagination__link" data-page="${page}" aria-label="${label}"${page === this.page && !label.startsWith("Go to") ? "" : ""}${disabled ? " disabled" : ""}>${content}</button></li>`;
      this.pagination.innerHTML = `
        <p class="a-small a-muted" aria-live="polite">${total ? `Showing ${start + 1} to ${start + count} of ${total}` : "No results"}</p>
        <ul class="a-pagination__list" role="list">
          ${button(this.page - 1, "Previous page", icon("chevron-left"), this.page === 1)}
          ${numbers
            .map((page) =>
              page === "gap"
                ? '<li><span class="a-pagination__ellipsis" aria-hidden="true">...</span></li>'
                : `<li><button type="button" class="a-pagination__link" data-page="${page}" aria-label="Page ${page}"${page === this.page ? ' aria-current="page"' : ""}>${page}</button></li>`,
            )
            .join("")}
          ${button(this.page + 1, "Next page", icon("chevron-right"), this.page === pages)}
        </ul>`;
    }

    goTo(page) {
      this.page = page;
      this.render();
      this.pagination.querySelector(`[data-page="${page}"][aria-current]`)?.focus();
    }

    sort(th) {
      const index = [...th.parentElement.children].indexOf(th);
      const direction = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
      for (const other of th.parentElement.children) other.removeAttribute("aria-sort");
      th.setAttribute("aria-sort", direction);
      const value = (row) => {
        const cell = row.children[index];
        return cell.dataset.sort ?? cell.textContent.trim().toLowerCase();
      };
      const numeric = th.dataset.type === "number";
      this.rows.sort((a, b) => {
        const [x, y] = [value(a), value(b)];
        const order = numeric ? Number(x) - Number(y) : x.localeCompare(y);
        return direction === "ascending" ? order : -order;
      });
      for (const row of this.rows) this.body.insertBefore(row, this.empty || null);
      this.render();
      announce(`Sorted by ${th.textContent.trim()}, ${direction}`);
    }

    search(query) {
      this.query = query.trim().toLowerCase();
      this.page = 1;
      this.render();
    }

    filter(key, values) {
      this.filters[key] = values;
      this.page = 1;
      this.render();
    }

    selectVisible(checked) {
      for (const row of this.rows) {
        if (!row.hidden) row.querySelector("[data-select-row]").checked = checked;
      }
      this.syncSelection();
    }

    selected() {
      return this.rows.filter((row) => row.querySelector("[data-select-row]")?.checked);
    }

    syncSelection() {
      if (!this.selectAll) return;
      const visible = this.rows.filter((row) => !row.hidden);
      for (const row of this.rows) row.setAttribute("aria-selected", String(Boolean(row.querySelector("[data-select-row]")?.checked)));
      const checked = visible.filter((row) => row.querySelector("[data-select-row]").checked).length;
      this.selectAll.checked = checked > 0 && checked === visible.length;
      this.selectAll.indeterminate = checked > 0 && checked < visible.length;
      if (this.bulk) {
        const count = this.selected().length;
        this.bulk.hidden = count === 0;
        this.bulk.querySelector("[data-bulk-count]").textContent = `${count} selected`;
      }
    }
  }

  const tables = new Map();
  const tableFor = (id) => tables.get(id);

  document.addEventListener("input", (event) => {
    const search = event.target.closest("[data-table-search]");
    if (search) tableFor(search.dataset.tableSearch)?.search(search.value);
  });

  document.addEventListener("change", (event) => {
    // Filter checkboxes: <input type=checkbox data-table-filter="tableId" data-key="status" value="active">
    const filter = event.target.closest("[data-table-filter]");
    if (filter) {
      const { tableFilter, key } = filter.dataset;
      const values = [...document.querySelectorAll(`[data-table-filter="${tableFilter}"][data-key="${key}"]:checked`)].map((input) => input.value);
      tableFor(tableFilter)?.filter(key, values);
      renderChips(tableFilter);
    }
  });

  function renderChips(tableId) {
    const host = document.querySelector(`[data-filter-chips="${tableId}"]`);
    if (!host) return;
    const checked = [...document.querySelectorAll(`[data-table-filter="${tableId}"]:checked`)];
    host.innerHTML = checked
      .map((input) => `<span class="a-tag">${input.dataset.label || input.value}<button type="button" class="a-tag__remove" data-clear-filter="${input.id}" aria-label="Remove filter ${input.dataset.label || input.value}">${icon("close")}</button></span>`)
      .join("") + (checked.length ? `<button type="button" class="a-btn a-btn--link a-btn--sm" data-clear-all="${tableId}">Clear all</button>` : "");
  }

  document.addEventListener("click", (event) => {
    const page = event.target.closest("[data-page]");
    if (page && !page.disabled) {
      const table = tableFor(page.closest("[data-pagination-for]").dataset.paginationFor);
      table?.goTo(Number(page.dataset.page));
    }
    const clear = event.target.closest("[data-clear-filter]");
    if (clear) {
      const input = document.getElementById(clear.dataset.clearFilter);
      input.checked = false;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const clearAll = event.target.closest("[data-clear-all]");
    if (clearAll) {
      for (const input of document.querySelectorAll(`[data-table-filter="${clearAll.dataset.clearAll}"]:checked`)) input.checked = false;
      const table = tableFor(clearAll.dataset.clearAll);
      table.filters = {};
      table.render();
      renderChips(clearAll.dataset.clearAll);
    }
    // Density: toggle group buttons with data-density="compact|comfortable" inside [data-density-for]
    const density = event.target.closest("[data-density-for] [data-density]");
    if (density) document.getElementById(density.closest("[data-density-for]").dataset.densityFor).dataset.density = density.dataset.density;
    // Bulk actions demo
    const bulk = event.target.closest("[data-bulk-action]");
    if (bulk) {
      const table = tableFor(bulk.closest("[data-bulk-for]").dataset.bulkFor);
      const count = table.selected().length;
      window.Anoglobe?.toast?.(`${bulk.dataset.bulkAction} ${count} ${count === 1 ? "record" : "records"}`, "success");
      table.selectVisible(false);
    }
  });

  // Column visibility: menuitemcheckbox with data-column-toggle="tableId:key" hides th/td[data-col=key]
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-column-toggle]");
    if (!toggle) return;
    requestAnimationFrame(() => {
      const [tableId, key] = toggle.dataset.columnToggle.split(":");
      const hidden = toggle.getAttribute("aria-checked") !== "true";
      for (const cell of document.getElementById(tableId).querySelectorAll(`[data-col="${key}"]`)) cell.hidden = hidden;
    });
  });

  /* ---------- Charts ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const PAD = { top: 12, right: 12, bottom: 28, left: 52 };
  const color = (slot) => `var(--chart-${slot})`;

  function niceMax(max) {
    const power = 10 ** Math.floor(Math.log10(max || 1));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => max / s <= 4) || power * 10;
    return { max: Math.ceil(max / step) * step, step };
  }

  function tableView(figure, labels, series, format) {
    const id = `${figure.id}-table`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "a-btn a-btn--ghost a-btn--sm";
    button.dataset.disclosure = "";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);
    button.textContent = "View as table";
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.hidden = true;
    wrap.innerHTML = `<div data-scroll-area class="a-table-scroll"><table class="a-chart__table"><thead><tr><th scope="col">${figure.dataset.xLabel || "Period"}</th>${series.map((s) => `<th scope="col">${s.name}</th>`).join("")}</tr></thead>
      <tbody>${labels.map((label, i) => `<tr><th scope="row">${label}</th>${series.map((s) => `<td>${format(s.values[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    figure.querySelector(".a-chart__head").append(button);
    figure.append(wrap);
    window.Anoglobe?.initScrollAreas?.(wrap);
  }

  function legend(series, withValues = false, format = String) {
    return `<ul class="a-chart__legend" role="list">${series
      .map((s) => `<li><span class="a-chart__key${withValues ? " a-chart__key--box" : ""}" style="--key: ${color(s.slot)}"></span>${s.name}${withValues ? ` <strong>${format(s.value)}</strong>` : ""}</li>`)
      .join("")}</ul>`;
  }

  function tooltipHtml(title, rows, format) {
    return `<p class="a-chart__tooltip-title">${title}</p>${rows.map((r) => `<div class="a-chart__tooltip-row"><span class="a-chart__key" style="--key: ${color(r.slot)}"></span>${r.name}<strong>${format(r.value)}</strong></div>`).join("")}`;
  }

  function cartesian(figure) {
    const type = figure.dataset.chart;
    const labels = JSON.parse(figure.dataset.labels);
    const series = JSON.parse(figure.dataset.series).map((s, i) => ({ slot: i + 1, ...s }));
    const format = FORMATS[figure.dataset.format || "number"];
    const plot = figure.querySelector(".a-chart__plot");
    const tip = document.createElement("div");
    tip.className = "a-chart__tooltip";
    tip.hidden = true;
    if (series.length > 1) plot.insertAdjacentHTML("beforebegin", legend(series));

    const draw = () => {
      const width = plot.clientWidth;
      const height = plot.clientHeight;
      const w = width - PAD.left - PAD.right;
      const h = height - PAD.top - PAD.bottom;
      const { max, step } = niceMax(Math.max(...series.flatMap((s) => s.values)));
      const y = (v) => PAD.top + h - (v / max) * h;
      const band = w / labels.length;
      const x = (i) => (type === "bar" ? PAD.left + band * i + band / 2 : PAD.left + (labels.length === 1 ? w / 2 : (i / (labels.length - 1)) * w));
      const labelEvery = Math.ceil(labels.length / Math.max(2, Math.floor(w / 64)));
      let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${figure.querySelector(".a-chart__title").textContent}. Use View as table for exact values."><g class="a-chart__grid">`;
      for (let v = 0; v <= max; v += step) svg += `<line x1="${PAD.left}" x2="${width - PAD.right}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `</g><g class="a-chart__axis">`;
      for (let v = 0; v <= max; v += step) svg += `<text x="${PAD.left - 8}" y="${y(v) + 4}" text-anchor="end">${format(v)}</text>`;
      labels.forEach((label, i) => {
        if (i % labelEvery === 0) svg += `<text x="${x(i)}" y="${height - 8}" text-anchor="middle">${label}</text>`;
      });
      svg += `</g>`;
      if (type === "bar") {
        const groupWidth = Math.min(band * 0.7, 48 * series.length);
        const barWidth = groupWidth / series.length - 2;
        labels.forEach((_, i) => {
          series.forEach((s, j) => {
            const bx = x(i) - groupWidth / 2 + j * (barWidth + 2);
            const top = y(s.values[i]);
            const bh = PAD.top + h - top;
            const r = Math.min(4, barWidth / 2, bh);
            svg += `<path class="a-chart__bar" data-index="${i}" fill="${color(s.slot)}" d="M${bx},${PAD.top + h} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + barWidth - r} Q${bx + barWidth},${top} ${bx + barWidth},${top + r} V${PAD.top + h} Z"/>`;
          });
        });
      } else {
        series.forEach((s) => {
          const points = s.values.map((v, i) => `${x(i)},${y(v)}`);
          if (series.length === 1) svg += `<path class="a-chart__area" fill="${color(s.slot)}" d="M${x(0)},${PAD.top + h} L${points.join(" L")} L${x(labels.length - 1)},${PAD.top + h} Z"/>`;
          svg += `<path class="a-chart__line" stroke="${color(s.slot)}" d="M${points.join(" L")}"/>`;
          const last = s.values.length - 1;
          if (series.length <= 4) svg += `<text class="a-chart__label" x="${x(last)}" y="${y(s.values[last]) - 10}" text-anchor="end">${format(s.values[last])}</text>`;
        });
        svg += `<line class="a-chart__crosshair" y1="${PAD.top}" y2="${PAD.top + h}" visibility="hidden"/>`;
        series.forEach((s) => (svg += `<circle class="a-chart__dot" data-series="${s.slot}" r="5" fill="${color(s.slot)}" visibility="hidden"/>`));
      }
      plot.innerHTML = `${svg}</svg>`;
      plot.append(tip);

      const svgEl = plot.querySelector("svg");
      const show = (i) => {
        tip.innerHTML = tooltipHtml(labels[i], series.map((s) => ({ ...s, value: s.values[i] })), format);
        tip.hidden = false;
        if (type === "bar") {
          plot.classList.add("is-hovering");
          for (const bar of svgEl.querySelectorAll(".a-chart__bar")) bar.classList.toggle("is-active", Number(bar.dataset.index) === i);
        } else {
          const cross = svgEl.querySelector(".a-chart__crosshair");
          cross.setAttribute("x1", x(i));
          cross.setAttribute("x2", x(i));
          cross.setAttribute("visibility", "visible");
          for (const dot of svgEl.querySelectorAll(".a-chart__dot")) {
            const s = series[Number(dot.dataset.series) - 1];
            dot.setAttribute("cx", x(i));
            dot.setAttribute("cy", y(s.values[i]));
            dot.setAttribute("visibility", "visible");
          }
        }
        const left = Math.min(Math.max(0, x(i) + 12), width - tip.offsetWidth);
        tip.style.left = `${x(i) + 12 + tip.offsetWidth > width ? x(i) - tip.offsetWidth - 12 : left}px`;
        tip.style.top = `${PAD.top}px`;
      };
      const hide = () => {
        tip.hidden = true;
        plot.classList.remove("is-hovering");
        svgEl.querySelector(".a-chart__crosshair")?.setAttribute("visibility", "hidden");
        for (const dot of svgEl.querySelectorAll(".a-chart__dot")) dot.setAttribute("visibility", "hidden");
      };
      svgEl.addEventListener("pointermove", (event) => {
        const box = svgEl.getBoundingClientRect();
        const px = event.clientX - box.left;
        const i = type === "bar" ? Math.floor((px - PAD.left) / band) : Math.round(((px - PAD.left) / w) * (labels.length - 1));
        if (i >= 0 && i < labels.length) show(i);
      });
      svgEl.addEventListener("pointerleave", hide);
      plot.tabIndex = 0;
      plot.setAttribute("aria-label", `${figure.querySelector(".a-chart__title").textContent}. Left and right arrows step through values.`);
      plot.onkeydown = (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const current = Number(plot.dataset.focusIndex ?? -1);
        const next = event.key === "Home" ? 0 : event.key === "End" ? labels.length - 1 : Math.min(labels.length - 1, Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1)));
        plot.dataset.focusIndex = next;
        show(next);
        announce(`${labels[next]}: ${series.map((s) => `${s.name} ${format(s.values[next])}`).join(", ")}`);
      };
      plot.onblur = hide;
    };
    draw();
    new ResizeObserver(draw).observe(plot);
    tableView(figure, labels, series, format);
  }

  function donut(figure) {
    const series = JSON.parse(figure.dataset.series).map((s, i) => ({ slot: i + 1, ...s }));
    const format = FORMATS[figure.dataset.format || "number"];
    const total = series.reduce((sum, s) => sum + s.value, 0);
    const plot = figure.querySelector(".a-chart__plot");
    const size = 180;
    const r = 80;
    const inner = 56;
    let angle = -Math.PI / 2;
    const point = (radius, a) => `${size / 2 + radius * Math.cos(a)},${size / 2 + radius * Math.sin(a)}`;
    let paths = "";
    for (const s of series) {
      const sweep = (s.value / total) * Math.PI * 2;
      const end = angle + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      paths += `<path class="a-chart__slice" fill="${color(s.slot)}" d="M${point(r, angle)} A${r},${r} 0 ${large} 1 ${point(r, end)} L${point(inner, end)} A${inner},${inner} 0 ${large} 0 ${point(inner, angle)} Z"><title>${s.name}: ${format(s.value)}</title></path>`;
      angle = end;
    }
    plot.innerHTML = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${figure.querySelector(".a-chart__title").textContent}: ${series.map((s) => `${s.name} ${format(s.value)}`).join(", ")}">${paths}
      <text class="a-chart__center-value" x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle">${format(total)}</text>
      <text class="a-chart__center-label" x="${size / 2}" y="${size / 2 + 22}" text-anchor="middle">${figure.dataset.centerLabel || "Total"}</text></svg>`;
    // Native SVG <title> would show a browser tooltip; strip it and use the legend values instead.
    for (const title of plot.querySelectorAll("title")) title.remove();
    plot.insertAdjacentHTML("afterend", legend(series, true, format));
  }

  function sparkline(svg) {
    const values = JSON.parse(svg.dataset.sparkline);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 26}`);
    svg.setAttribute("viewBox", "0 0 100 32");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML = `<path d="M${points.join(" L")}" vector-effect="non-scaling-stroke"/>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    for (const table of document.querySelectorAll("table[data-table]")) tables.set(table.id, new Table(table));
    for (const figure of document.querySelectorAll("[data-chart=line], [data-chart=bar]")) cartesian(figure);
    for (const figure of document.querySelectorAll("[data-chart=donut]")) donut(figure);
    for (const svg of document.querySelectorAll("[data-sparkline]")) sparkline(svg);
  });

  window.Anoglobe = Object.assign(window.Anoglobe || {}, { tables, formatUsd: usd });
})();
