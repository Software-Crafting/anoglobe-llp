// Browser audit: serves design-system/ locally, then for each page, width and theme checks
// console errors, failed requests, horizontal overflow, visible native controls, headings and
// landmarks, and runs axe-core. --screenshots writes PNGs at 375 and 1440 to screenshots/.
// Usage: node audit.mjs [--screenshots] [page.html ...]   (paths relative to design-system/)
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, walk, rel } from "./lib/files.mjs";

const WIDTHS = [375, 768, 1024, 1440];
const SCREENSHOT_WIDTHS = [375, 1440];
const THEMES = ["light", "dark"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".json": "application/json", ".md": "text/markdown",
};

const args = process.argv.slice(2);
const takeScreenshots = args.includes("--screenshots");
const requested = args.filter((arg) => !arg.startsWith("--"));
const pages = requested.length
  ? requested
  : walk(ROOT, [".html"]).map(rel).filter((path) => !path.startsWith("ui-design/emails/"));

const axeSource = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

function serve() {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    let file = join(ROOT, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!file.startsWith(ROOT) || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function pageChecks(page) {
  return page.evaluate(() => {
    const problems = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      problems.push(`horizontal overflow: ${root.scrollWidth}px content in ${root.clientWidth}px viewport`);
    }
    const h1Count = document.querySelectorAll("h1").length;
    if (h1Count !== 1) problems.push(`expected one h1, found ${h1Count}`);
    if (!document.querySelector("main")) problems.push("missing <main> landmark");
    if (!document.querySelector("a.a-skip-link[href^='#']")) problems.push("missing skip link");
    if (!document.title.trim()) problems.push("empty <title>");
    const nativeSelector = "select, input[type=checkbox], input[type=radio], input[type=range], input[type=file]";
    for (const element of document.querySelectorAll(nativeSelector)) {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const visible = style.visibility !== "hidden" && style.display !== "none" && box.width > 1 && box.height > 1;
      if (visible && style.appearance !== "none") {
        problems.push(`visible native control: ${element.outerHTML.slice(0, 80)}`);
      }
    }
    return problems;
  });
}

async function runAxe(page) {
  await page.addScriptTag({ path: axeSource });
  const result = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }), AXE_TAGS);
  return result.violations.map(
    (violation) => `axe ${violation.id} (${violation.impact}): ${violation.help} at ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(", ")}`,
  );
}

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome" });
if (takeScreenshots) mkdirSync(join(ROOT, "screenshots"), { recursive: true });

const titles = new Map();
let failures = 0;
for (const path of pages) {
  const findings = new Set();
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("console", (message) => message.type() === "error" && findings.add(`console error: ${message.text()}`));
      page.on("pageerror", (error) => findings.add(`page error: ${error.message}`));
      page.on("response", (response) => response.status() >= 400 && findings.add(`HTTP ${response.status()}: ${response.url().replace(origin, "")}`));
      await page.goto(`${origin}/${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      for (const problem of await pageChecks(page)) findings.add(`${problem} [${width} ${theme}]`);
      if (width === 375 || width === 1440) {
        for (const violation of await runAxe(page)) findings.add(`${violation} [${theme}]`);
      }
      if (takeScreenshots && SCREENSHOT_WIDTHS.includes(width)) {
        const name = path.replace(/\.html$/, "").replaceAll("/", "__");
        await page.screenshot({ path: join(ROOT, "screenshots", `${name}--${width}-${theme}.png`), fullPage: true });
      }
      if (theme === "light" && width === 1440) {
        const title = await page.title();
        if (titles.has(title)) findings.add(`duplicate title "${title}" also used by ${titles.get(title)}`);
        titles.set(title, path);
      }
      await context.close();
    }
  }
  // The prototype must also work opened straight from disk (file://), where browsers block
  // cross-file requests such as external SVG sprites and fetch().
  const fileContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const filePage = await fileContext.newPage();
  filePage.on("console", (message) => message.type() === "error" && findings.add(`file:// console error: ${message.text().slice(0, 160)}`));
  filePage.on("pageerror", (error) => findings.add(`file:// page error: ${error.message}`));
  await filePage.goto(pathToFileURL(join(ROOT, path)).href, { waitUntil: "load" });
  await filePage.waitForTimeout(300);
  await fileContext.close();

  if (findings.size) {
    failures++;
    console.error(`FAIL ${path}\n  ${[...findings].join("\n  ")}`);
  } else {
    console.log(`ok   ${path}`);
  }
}

await browser.close();
server.close();
if (failures) {
  console.error(`\nAudit failed: ${failures} of ${pages.length} page(s) have findings.`);
  process.exit(1);
}
console.log(`\nAudit passed: ${pages.length} page(s), ${WIDTHS.length} widths, ${THEMES.length} themes.`);
