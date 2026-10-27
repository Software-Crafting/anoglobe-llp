// Rewrites every <!-- shell:name --> ... <!-- /shell:name --> region from tools/shells.mjs.
// Usage: node sync-shells.mjs [--check]   (--check fails if any page is out of date)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { ROOT, walk, rel } from "./lib/files.mjs";
import { SHELLS } from "./shells.mjs";

const REGION = /(<!-- shell:([\w-]+) -->)[\s\S]*?(<!-- \/shell:\2 -->)/g;
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
  if (!text.includes("<!-- shell:")) continue;
  const path = rel(file);
  const root = relative(dirname(file), ROOT).split("\\").join("/");
  const prefix = root ? `${root}/` : "";
  const next = text.replace(REGION, (_, open, name, close) => {
    if (!SHELLS[name]) throw new Error(`${path}: unknown shell "${name}"`);
    return `${open}${withoutMissingTargets(SHELLS[name]({ root: prefix, path, exists: (target) => existsSync(join(ROOT, target)) }), file)}${close}`;
  });
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
