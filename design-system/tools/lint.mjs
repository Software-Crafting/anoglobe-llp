// Forbidden string lint for copy and markup rules in plan/07 and plan/08.
// Patterns are written with escapes so this file never matches itself.
import { readFileSync } from "node:fs";
import { walk, rel, lineOf } from "./lib/files.mjs";

const COPY_FILES = [".html", ".css", ".js", ".svg", ".md"];
const CODE_FILES = [".html", ".js"];

// Hex colors are allowed only where CSS custom properties cannot reach.
const HEX_ALLOWED = [
  { pattern: /^assets\/css\/tokens\.css$/, reason: "single source of raw color values" },
  { pattern: /^ui-design\/emails\//, reason: "email clients do not support CSS custom properties" },
  { pattern: /^assets\/img\/.*\.svg$/, reason: "logo files are used as images and cannot read page tokens" },
  { pattern: /\.md$/, reason: "documentation may quote values" },
];

const RULES = [
  { name: "em or en dash", files: COPY_FILES, regex: /[–—]|&[mn]dash;|&#821[12];|&#x201[34];/gi },
  { name: "emoji", files: COPY_FILES, regex: /(?![©®™])\p{Extended_Pictographic}/gu },
  { name: "lorem ipsum", files: COPY_FILES, regex: /\blorem\b|\bipsum\b/gi },
  { name: "native select", files: CODE_FILES, regex: /<\x73elect\b/gi },
  { name: "native date or time input", files: CODE_FILES, regex: /type=["'](?:date|time|datetime-local|month|week)["']/gi },
  { name: "native browser dialog", files: CODE_FILES, regex: /\b(?:alert|confirm|prompt)\(/g },
  { name: "native tooltip title attribute", files: [".html"], regex: /<(?!title\b)[a-z][^>]*\stitle=["']/gi },
  { name: "external sprite reference (blocked on file:// pages, use #name)", files: [".html", ".js"], regex: /sprite\.svg#/g },
  {
    name: "inline style (only custom properties allowed)",
    files: [".html"],
    regex: /\sstyle=["'](?!\s*--)[^"']*["']/gi,
    skip: (path) => path.startsWith("ui-design/emails/"),
  },
  {
    name: "hardcoded hex color",
    files: [".html", ".css", ".js", ".svg"],
    regex: /(?<![\w&/.#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
    skip: (path, text, index) =>
      HEX_ALLOWED.some((allowed) => allowed.pattern.test(path)) ||
      /(?:href|src|action|for|xlink:href|aria-[\w-]+|data-[\w-]+)=["'][^"']*$/.test(text.slice(Math.max(0, index - 80), index)),
  },
];

const findings = [];
const files = walk(undefined, COPY_FILES);
for (const file of files) {
  const path = rel(file);
  // The inline icon sprite is generated from assets/icons/sprite.svg by sync-shells.mjs; skip it,
  // keeping line numbers intact.
  const text = readFileSync(file, "utf8").replace(/<!-- icons -->[\s\S]*?<!-- \/icons -->/, (region) => region.replace(/[^\n]/g, ""));
  for (const rule of RULES) {
    if (!rule.files.some((ext) => path.endsWith(ext))) continue;
    for (const match of text.matchAll(rule.regex)) {
      if (rule.skip?.(path, text, match.index)) continue;
      findings.push(`${path}:${lineOf(text, match.index)}: ${rule.name}: ${JSON.stringify(match[0])}`);
    }
  }
}

if (findings.length) {
  console.error(findings.join("\n"));
  console.error(`\nLint failed: ${findings.length} finding(s).`);
  process.exit(1);
}
console.log(`Lint passed: ${files.length} file(s) scanned.`);
