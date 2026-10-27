// Rewrites every <!-- shell:name --> ... <!-- /shell:name --> region from tools/shells.mjs, then
// inlines the icon symbols each page uses into its <!-- icons --> region at the end of <body>.
// Icons are inlined per page (referenced as <use href="#name">) because browsers block <use> of an
// external sprite on file:// pages, and the prototype must work when opened straight from disk.
// Usage: node sync-shells.mjs [--check]   (--check fails if any page is out of date)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { ROOT, walk, rel } from "./lib/files.mjs";
import { SHELLS } from "./shells.mjs";

const REGION = /(<!-- shell:([\w-]+) -->)[\s\S]*?(<!-- \/shell:\2 -->)/g;
const ICON_REGION = /\n?\s*<!-- icons -->[\s\S]*?<!-- \/icons -->/;
const SYMBOLS = new Map(
  [...readFileSync(join(ROOT, "assets/icons/sprite.svg"), "utf8").matchAll(/<symbol id="([\w-]+)"[\s\S]*?<\/symbol>/g)].map((m) => [m[1], m[0]]),
);

// Symbols used by <use href="#name"> plus names listed in data-icons="a b" for icons created at runtime.
function withIcons(html, path) {
  const withoutRegion = html.replace(ICON_REGION, "");
  const names = new Set([...withoutRegion.matchAll(/<use href="#([\w-]+)"/g)].map((m) => m[1]));
  for (const m of withoutRegion.matchAll(/data-icons="([^"]+)"/g)) m[1].split(/\s+/).forEach((name) => names.add(name));
  if (!names.size) return withoutRegion;
  const missing = [...names].filter((name) => !SYMBOLS.has(name));
  if (missing.length) throw new Error(`${path}: unknown icon(s) ${missing.join(", ")}`);
  const symbols = [...names].sort().map((name) => `    ${SYMBOLS.get(name)}`).join("\n");
  const region = `\n  <!-- icons -->\n  <svg class="a-sprite" aria-hidden="true" focusable="false">\n${symbols}\n  </svg>\n  <!-- /icons -->`;
  return withoutRegion.replace(/\n<\/body>/, `${region}\n</body>`);
}
const checkOnly = process.argv.includes("--check");

// Drop shell lines that reference a stylesheet, script or page that does not exist yet, so
// component groups and pages can land one module at a time. Each such reference sits on its own line.
function withoutMissingTargets(html, file) {
  return html
    .split("\n")
    .filter((line) => {
      const ref = line.match(/(?:href|src)="([^"#]+\.(?:css|js|html))"/);
      return !ref || existsSync(join(dirname(file), ref[1]));
    })
    .join("\n");
}

const stale = [];
for (const file of walk(ROOT, [".html"])) {
  const text = readFileSync(file, "utf8");
  const path = rel(file);
  if (path.startsWith("ui-design/emails/")) continue;
  const root = relative(dirname(file), ROOT).split("\\").join("/");
  const prefix = root ? `${root}/` : "";
  const synced = text.replace(REGION, (_, open, name, close) => {
    if (!SHELLS[name]) throw new Error(`${path}: unknown shell "${name}"`);
    return `${open}${withoutMissingTargets(SHELLS[name]({ root: prefix, path, exists: (target) => existsSync(join(ROOT, target)) }), file)}${close}`;
  });
  const next = withIcons(synced, path);
  if (next !== text) {
    stale.push(path);
    if (!checkOnly) writeFileSync(file, next);
  }
}

if (checkOnly && stale.length) {
  console.error(`Shells out of date:\n  ${stale.join("\n  ")}\nRun: node sync-shells.mjs`);
  process.exit(1);
}
console.log(checkOnly ? "Shells are in sync." : `Shells synced: ${stale.length} page(s) updated.`);
