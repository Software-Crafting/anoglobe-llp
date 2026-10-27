// Design system documentation helpers. Values are read from computed styles so the docs never
// repeat a hex value from tokens.css.
(() => {
  function toHex(cssColor) {
    const channels = cssColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    return `#${channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  }

  function luminance(cssColor) {
    const [r, g, b] = cssColor
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map((c) => {
        const v = Number(c) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  }

  // <li data-swatch><span class="a-swatch__chip"></span><code data-swatch-value></code><button data-copy>
  function fillSwatches() {
    for (const swatch of document.querySelectorAll("[data-swatch]")) {
      const hex = toHex(getComputedStyle(swatch.querySelector("[data-swatch-chip]")).backgroundColor);
      swatch.querySelector("[data-swatch-value]").textContent = hex;
      const copyButton = swatch.querySelector("[data-copy]");
      if (copyButton) copyButton.dataset.copy = hex;
    }
  }

  // <div data-contrast data-min="4.5"> with color and background set by tokens, <span data-contrast-value>
  function fillContrast() {
    for (const pair of document.querySelectorAll("[data-contrast]")) {
      const style = getComputedStyle(pair);
      const ratio = contrast(style.color, style.backgroundColor);
      const passes = ratio >= Number(pair.dataset.min);
      pair.querySelector("[data-contrast-value]").textContent = `${ratio.toFixed(2)}:1 ${passes ? "pass" : "fail"}`;
    }
  }

  function fill() {
    fillSwatches();
    fillContrast();
  }

  document.addEventListener("DOMContentLoaded", fill);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fill);
  new MutationObserver(fill).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
