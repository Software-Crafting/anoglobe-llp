// Verifies that every internal href, src, srcset and CSS url() resolves to a file,
// and that fragment links point at an existing id in the target HTML or SVG.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { walk, rel, lineOf } from "./lib/files.mjs";

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const HTML_REFS = /\s(?:href|src|xlink:href|action|poster|data-src)=["']([^"']*)["']/g;
const SRCSET = /\ssrcset=["']([^"']*)["']/g;
const CSS_URLS = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

const idCache = new Map();

function idsIn(file) {
  if (!idCache.has(file)) {
    const text = readFileSync(file, "utf8");
    idCache.set(file, new Set([...text.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

function check(file, ref) {
  if (!ref || EXTERNAL.test(ref) || ref.startsWith("{{")) return null;
  const [pathPart, fragment] = ref.split("#");
  const cleanPath = decodeURIComponent(pathPart.split("?")[0]);
  let target = cleanPath ? resolve(dirname(file), cleanPath) : file;
  if (cleanPath.endsWith("/")) target = resolve(target, "index.html");
  if (!existsSync(target)) return `missing file ${ref}`;
  if (fragment && /\.(html|svg)$/.test(target) && !idsIn(target).has(fragment)) {
    return `missing id #${fragment} in ${rel(target)}`;
  }
  return null;
}

function refsOf(file, text) {
  const refs = [];
  if (file.endsWith(".html") || file.endsWith(".svg")) {
    for (const m of text.matchAll(HTML_REFS)) refs.push([m.index, m[1]]);
    for (const m of text.matchAll(SRCSET)) {
      for (const candidate of m[1].split(",")) refs.push([m.index, candidate.trim().split(/\s+/)[0]]);
    }
  }
  if (file.endsWith(".css") || file.endsWith(".html")) {
    for (const m of text.matchAll(CSS_URLS)) refs.push([m.index, m[1]]);
  }
  return refs.filter(([, ref]) => ref !== "#");
}

const problems = [];
const files = walk(undefined, [".html", ".css", ".svg"]);
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [index, ref] of refsOf(file, text)) {
    const problem = check(file, ref);
    if (problem) problems.push(`${rel(file)}:${lineOf(text, index)}: ${problem}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\nLink check failed: ${problems.length} broken reference(s).`);
  process.exit(1);
}
console.log(`Link check passed: ${files.length} file(s) scanned.`);
