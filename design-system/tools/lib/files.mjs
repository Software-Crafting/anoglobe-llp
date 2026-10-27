import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const SKIPPED_DIRS = new Set(["node_modules", "screenshots", "tools", ".git"]);

export function walk(dir = ROOT, extensions = []) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIPPED_DIRS.has(name)) found.push(...walk(path, extensions));
    } else if (extensions.length === 0 || extensions.some((ext) => name.endsWith(ext))) {
      found.push(path);
    }
  }
  return found;
}

export function rel(path) {
  return relative(ROOT, path).split(sep).join("/");
}

export function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}
