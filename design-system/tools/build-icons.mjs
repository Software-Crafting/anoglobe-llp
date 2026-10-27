// Builds the icon set from tools/icons/definitions.mjs:
//   assets/icons/svg/<name>.<variant>.<size>.svg   standalone files with per-size optical stroke
//   assets/icons/sprite.svg                        symbols whose stroke, notch and detail level follow
//                                                  the .a-icon size classes through CSS custom properties
//   assets/icons/icons.json                        name list used by the gallery page
// Chrome measures path lengths (for the notch) and tests which details sit inside the filled shape.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { ROOT } from "./lib/files.mjs";
import { GROUPS, ILLUSTRATIONS } from "./icons/definitions.mjs";

const STROKE_PX = { 16: 1.5, 20: 1.5, 24: 1.75, 32: 2, 48: 2.5 };
const NOTCH_PX = 2;
const VARIANTS = { line: [16, 20, 24, 32], duo: [24, 32, 48], fill: [16, 20, 24] };
const ILLUSTRATION_STROKE_PX = { 64: 2, 96: 2.5 };
const OUT = join(ROOT, "assets/icons");
const n = (value) => Number(value.toFixed(3));

const icons = Object.values(GROUPS).flat();
const normalize = (detail) => (typeof detail === "string" ? { d: detail } : detail);

async function measure() {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage();
  const result = await page.evaluate((list) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    document.body.append(svg);
    const pathOf = (d) => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.append(path);
      return path;
    };
    return list.map(({ shape, details }) => {
      if (!shape) return { length: 0, inside: details.map(() => false) };
      const shapePath = pathOf(shape);
      const inside = details.map(({ d }) => {
        const detail = pathOf(d);
        const total = detail.getTotalLength();
        const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => detail.getPointAtLength(total * t));
        return samples.every((point) => shapePath.isPointInFill(new DOMPoint(point.x, point.y)));
      });
      return { length: shapePath.getTotalLength(), inside };
    });
  }, icons.map((icon) => ({ shape: icon.shape, details: (icon.details || []).map(normalize) })));
  await browser.close();
  return result;
}

// Standalone file for one icon, variant and size.
function iconFile(icon, metrics, variant, size) {
  const stroke = (STROKE_PX[size] * 24) / size;
  const gap = stroke + (NOTCH_PX * 24) / size;
  const parts = [];
  if (icon.shape && variant === "duo") parts.push(`<path d="${icon.shape}" fill="currentColor" fill-opacity=".15" stroke="none"/>`);
  if (icon.shape && variant === "fill") {
    parts.push(`<path d="${icon.shape}" fill="currentColor"/>`);
  } else if (icon.shape) {
    const { length } = metrics;
    parts.push(`<path d="${icon.shape}" stroke-dasharray="${n(length - gap)} ${n(gap)}" stroke-dashoffset="${n(length * (1 - icon.notch) - gap / 2)}"/>`);
  }
  (icon.details || []).map(normalize).forEach((detail, index) => {
    if (size === 16 && detail.minor) return;
    const attributes = [];
    if (detail.dot) attributes.push(`stroke-width="${n(stroke * 1.6)}"`);
    if (detail.dash) attributes.push(`stroke-dasharray="0 ${n(stroke * 1.9)}"`);
    if (variant === "fill" && metrics.inside[index]) attributes.push(`style="stroke: var(--icon-knockout, Canvas)"`);
    parts.push(`<path d="${detail.d}"${attributes.length ? " " + attributes.join(" ") : ""}/>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${n(stroke)}" stroke-linecap="round" stroke-linejoin="round">${parts.join("")}</svg>\n`;
}

// Sprite symbol: geometry only, stroke and notch come from inherited custom properties.
function symbol(icon, metrics, variant) {
  const id = variant === "line" ? icon.name : `${icon.name}-${variant}`;
  const parts = [];
  if (icon.shape && variant === "duo") parts.push(`<path d="${icon.shape}" style="fill: currentColor; fill-opacity: .15; stroke: none"/>`);
  if (icon.shape && variant === "fill") {
    parts.push(`<path d="${icon.shape}" style="fill: currentColor"/>`);
  } else if (icon.shape) {
    const { length } = metrics;
    parts.push(
      `<path d="${icon.shape}" style="stroke-dasharray: calc(${n(length)} - var(--icon-gap)) var(--icon-gap); stroke-dashoffset: calc(${n(length * (1 - icon.notch))} - var(--icon-gap) / 2)"/>`,
    );
  }
  (icon.details || []).map(normalize).forEach((detail, index) => {
    const styles = [];
    if (detail.minor) styles.push("display: var(--icon-minor-display, inline)");
    if (detail.dot) styles.push("stroke-width: calc(var(--icon-stroke) * 1.6)");
    if (detail.dash) styles.push("stroke-dasharray: 0 calc(var(--icon-stroke) * 1.9)");
    if (variant === "fill" && metrics.inside[index]) styles.push("stroke: var(--icon-knockout, var(--background))");
    parts.push(`<path d="${detail.d}"${styles.length ? ` style="${styles.join("; ")}"` : ""}/>`);
  });
  return `  <symbol id="${id}" viewBox="0 0 24 24">${parts.join("")}</symbol>`;
}

const ILLUSTRATION_STYLE = {
  "i-surface": "fill: var(--illus-surface, currentColor); fill-opacity: var(--illus-surface-opacity, .12); stroke: none",
  "i-line": "fill: none; stroke: var(--illus-line, currentColor)",
  "i-accent": "fill: none; stroke: var(--illus-accent, currentColor)",
};

function illustrationBody(illustration, strokeAttribute) {
  return illustration.body
    .replace(/class="(i-[\w-]+)"/g, (_, name) => `style="${ILLUSTRATION_STYLE[name]}"`)
    .replace(/\n/g, "")
    .replace(/^/, `<g stroke-width="${strokeAttribute}" stroke-linecap="round" stroke-linejoin="round">`)
    .concat("</g>");
}

const metrics = await measure();
rmSync(join(OUT, "svg"), { recursive: true, force: true });
mkdirSync(join(OUT, "svg"), { recursive: true });

let fileCount = 0;
const symbols = [];
icons.forEach((icon, index) => {
  for (const [variant, sizes] of Object.entries(VARIANTS)) {
    for (const size of sizes) {
      writeFileSync(join(OUT, "svg", `${icon.name}.${variant}.${size}.svg`), iconFile(icon, metrics[index], variant, size));
      fileCount++;
    }
    symbols.push(symbol(icon, metrics[index], variant));
  }
});

for (const illustration of ILLUSTRATIONS) {
  for (const [size, px] of Object.entries(ILLUSTRATION_STROKE_PX)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">${illustrationBody(illustration, n((px * 96) / size))}</svg>\n`;
    writeFileSync(join(OUT, "svg", `${illustration.name}.illustration.${size}.svg`), svg);
    fileCount++;
  }
  symbols.push(`  <symbol id="illus-${illustration.name}" viewBox="0 0 96 96">${illustrationBody(illustration, "var(--illus-stroke, 2.5)")}</symbol>`);
}

writeFileSync(
  join(OUT, "sprite.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Generated by tools/build-icons.mjs. Edit tools/icons/definitions.mjs, not this file. -->\n${symbols.join("\n")}\n</svg>\n`,
);
writeFileSync(
  join(OUT, "icons.json"),
  `${JSON.stringify({ groups: Object.fromEntries(Object.entries(GROUPS).map(([group, list]) => [group, list.map((icon) => icon.name)])), illustrations: ILLUSTRATIONS.map((item) => item.name) }, null, 2)}\n`,
);
console.log(`Icons built: ${icons.length} icons, ${ILLUSTRATIONS.length} illustrations, ${fileCount} files, ${symbols.length} symbols.`);

// Gallery: rewrite the generated region of the icons foundations page.
const GALLERY = join(ROOT, "ui-design/foundations/icons.html");
const use = (id, className = "a-icon") => `<svg class="${className}" aria-hidden="true"><use href="#${id}"></use></svg>`;
const slug = (text) => text.toLowerCase().replace(/[^a-z]+/g, "-");
const SAMPLE = ["invoice", "credit-card", "phone-call", "reconcile", "calendar", "shield-check", "bank", "bell"];

const tile = (name) => `          <li class="a-icon-tile">
            ${use(name)}
            <span class="a-icon-tile__name">${name}</span>
            <button type="button" class="a-copy" data-copy="${name}"><span data-copy-label>Copy</span><span class="a-visually-hidden"> ${name}</span></button>
          </li>`;

const sections = [
  ...Object.entries(GROUPS).map(([group, list]) => `      <section class="a-docs-section" aria-labelledby="${slug(group)}">
        <h2 id="${slug(group)}">${group}</h2>
        <p>${list.length} icons, line variant at 24 pixels.</p>
        <ul class="a-icon-grid" role="list">
${list.map((icon) => tile(icon.name)).join("\n")}
        </ul>
      </section>`),
  `      <section class="a-docs-section" aria-labelledby="sizes">
        <h2 id="sizes">Sizes</h2>
        <p>Line at 16, 20, 24 and 32 pixels, duo at 48. Each size has its own stroke weight; 16 pixels also drops minor details.</p>
        <div class="a-icon-table" role="table" aria-label="Icon sizes" tabindex="0" data-scroll-area>
          <div class="a-icon-table__row" role="row"><span role="columnheader">Icon</span><span role="columnheader">16</span><span role="columnheader">20</span><span role="columnheader">24</span><span role="columnheader">32</span><span role="columnheader">48 duo</span></div>
${SAMPLE.map((name) => `          <div class="a-icon-table__row" role="row"><span role="rowheader">${name}</span><span role="cell">${use(name, "a-icon a-icon--16")}</span><span role="cell">${use(name, "a-icon a-icon--20")}</span><span role="cell">${use(name)}</span><span role="cell">${use(name, "a-icon a-icon--32")}</span><span role="cell">${use(`${name}-duo`, "a-icon a-icon--48")}</span></div>`).join("\n")}
        </div>
      </section>`,
  `      <section class="a-docs-section" aria-labelledby="variants">
        <h2 id="variants">Variants</h2>
        <p>Line is the default. Duo adds a soft tint for cards and feature rows. Fill marks active navigation and checked states.</p>
        <div class="a-icon-table a-icon-table--variants" role="table" aria-label="Icon variants" tabindex="0" data-scroll-area>
          <div class="a-icon-table__row" role="row"><span role="columnheader">Icon</span><span role="columnheader">Line</span><span role="columnheader">Duo</span><span role="columnheader">Fill</span></div>
${SAMPLE.map((name) => `          <div class="a-icon-table__row" role="row"><span role="rowheader">${name}</span><span role="cell">${use(name, "a-icon a-icon--32")}</span><span role="cell">${use(`${name}-duo`, "a-icon a-icon--32")}</span><span role="cell">${use(`${name}-fill`)}</span></div>`).join("\n")}
        </div>
      </section>`,
  `      <section class="a-docs-section" aria-labelledby="illustrations">
        <h2 id="illustrations">Illustrations</h2>
        <p>Two-tone spot illustrations for empty, success, error and onboarding states, at 96 and 64 pixels.</p>
        <ul class="a-illus-grid" role="list">
${ILLUSTRATIONS.map((item) => `          <li class="a-icon-tile">${use(`illus-${item.name}`, "a-illus")}${use(`illus-${item.name}`, "a-illus a-illus--64")}<span class="a-icon-tile__name">${item.name}</span></li>`).join("\n")}
        </ul>
      </section>`,
  `      <section class="a-docs-section" aria-labelledby="contact-sheet">
        <h2 id="contact-sheet">Contact sheet</h2>
        <p>Every icon at 24 and 16 pixels in both themes, for checking weight, radius and notch consistency.</p>
        <div class="a-theme-panels">
${["light", "dark"].map((theme) => `          <div class="a-theme-panel" data-theme="${theme}">
            <h3>${theme === "light" ? "Light" : "Dark"} theme</h3>
            <div class="a-contact-sheet">${icons.map((icon) => use(icon.name)).join("")}</div>
            <div class="a-contact-sheet">${icons.map((icon) => use(icon.name, "a-icon a-icon--16")).join("")}</div>
          </div>`).join("\n")}
        </div>
      </section>`,
];

const gallery = readFileSync(GALLERY, "utf8").replace(
  /(<!-- generated:icons -->)[\s\S]*?(<!-- \/generated:icons -->)/,
  (_, open, close) => `${open}\n${sections.join("\n\n")}\n      ${close}`,
);
writeFileSync(GALLERY, gallery);
console.log("Gallery updated: ui-design/foundations/icons.html");
