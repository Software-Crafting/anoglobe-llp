// Anoglobe icon definitions, drawn on a 24 grid (live area 2 to 22).
// shape: the primary closed shape. It carries the signature notch in line and duo variants, is tinted
//        in duo and filled in fill. notch: position of the 2px gap along the shape, 0 to 1 from its start.
// details: strokes drawn on top. A detail is a path string or { d, minor, dot, dash }.
//          minor details are dropped at 16px. dot draws a heavier round dot.

const f = (n) => Number(n.toFixed(2));
export const circle = (cx, cy, r) => `M${cx} ${f(cy - r)}a${r} ${r} 0 1 1 0 ${f(2 * r)}a${r} ${r} 0 1 1 0 ${f(-2 * r)}z`;
export const rect = (x, y, w, h, r) =>
  `M${f(x + r)} ${y}H${f(x + w - r)}a${r} ${r} 0 0 1 ${r} ${r}V${f(y + h - r)}a${r} ${r} 0 0 1 -${r} ${r}H${f(x + r)}a${r} ${r} 0 0 1 -${r} -${r}V${f(y + r)}a${r} ${r} 0 0 1 ${r} -${r}z`;
const dot = (x, y) => ({ d: `M${x} ${y}h.01`, dot: true });
const minor = (d) => ({ d, minor: true });

const FILE = "M6.5 3H14l4.5 4.5v12A1.5 1.5 0 0 1 17 21H6.5A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z";
const FOLD = "M14 3v4.5h4.5";
const RING = circle(12, 12, 9);
const PHONE = "M5.2 3.5h2.9l1.5 4-2 1.3a10.5 10.5 0 0 0 7.6 7.6l1.3-2 4 1.5v2.9a1.6 1.6 0 0 1-1.7 1.6A16.6 16.6 0 0 1 3.6 5.2a1.6 1.6 0 0 1 1.6-1.7z";
const EYE = "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z";
const MAIL = rect(3, 5, 18, 14, 2.5);

export const GROUPS = {
  "Navigation and UI": [
    { name: "home", shape: "M4 10.2 12 3.8l8 6.4v9.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.7z", notch: 0.22, details: ["M10 21.2v-5.7h4v5.7"] },
    { name: "menu", details: ["M4 7h16", "M4 12h16", "M4 17h10"] },
    { name: "close", details: ["M6 6l12 12", "M18 6 6 18"] },
    { name: "search", shape: circle(10.5, 10.5, 6.5), notch: 0.12, details: ["M15.5 15.5 20 20"] },
    { name: "bell", shape: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z", notch: 0.42, details: ["M10 21.2h4"] },
    { name: "settings", shape: "M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z", notch: 0.08, details: [circle(12, 12, 3)] },
    { name: "filter", shape: "M3.5 5h17l-6.5 8v6l-4 2v-8z", notch: 0.15 },
    { name: "sort", details: ["M7 4v16", "M3.5 16.5 7 20l3.5-3.5", "M17 20V4", "M13.5 7.5 17 4l3.5 3.5"] },
    { name: "more-horizontal", details: [dot(5.5, 12), dot(12, 12), dot(18.5, 12)] },
    { name: "more-vertical", details: [dot(12, 5.5), dot(12, 12), dot(12, 18.5)] },
    { name: "chevron-up", details: ["M6 15l6-6 6 6"] },
    { name: "chevron-down", details: ["M6 9l6 6 6-6"] },
    { name: "chevron-left", details: ["M15 6l-6 6 6 6"] },
    { name: "chevron-right", details: ["M9 6l6 6-6 6"] },
    { name: "arrow-left", details: ["M19 12H5", "M11 6l-6 6 6 6"] },
    { name: "arrow-right", details: ["M5 12h14", "M13 6l6 6-6 6"] },
    { name: "arrow-up-right", details: ["M7 17 17 7", "M8.5 7H17v8.5"] },
    { name: "external-link", details: ["M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V14", "M14 4h6v6", "M20 4l-8.5 8.5"] },
    { name: "plus", details: ["M12 5v14", "M5 12h14"] },
    { name: "minus", details: ["M5 12h14"] },
    { name: "check", details: ["M5 12.5l4.5 4.5L19 7.5"] },
    { name: "check-circle", shape: RING, notch: 0.12, details: ["M8.2 12.3l2.6 2.6 5-5.2"] },
    { name: "x-circle", shape: RING, notch: 0.12, details: ["M9.2 9.2l5.6 5.6", "M14.8 9.2l-5.6 5.6"] },
    { name: "alert-triangle", shape: "M10.3 4.4a2 2 0 0 1 3.4 0l7.6 13.1a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z", notch: 0.14, details: ["M12 9.5v4", dot(12, 16.8)] },
    { name: "info", shape: RING, notch: 0.12, details: ["M12 11v5.5", dot(12, 7.8)] },
    { name: "help-circle", shape: RING, notch: 0.12, details: ["M9.5 9.4a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.7", dot(12, 17.2)] },
    { name: "eye", shape: EYE, notch: 0.2, details: [circle(12, 12, 2.8)] },
    { name: "eye-off", shape: EYE, notch: 0.2, details: [circle(12, 12, 2.8), "M4 4l16 16"] },
    { name: "copy", shape: rect(8.5, 8.5, 12, 12, 2), notch: 0.18, details: ["M15.5 5.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h.5"] },
    { name: "download", details: ["M12 4v11", "M7.5 10.5 12 15l4.5-4.5", "M4.5 19.5h15"] },
    { name: "upload", details: ["M12 15V4", "M7.5 8.5 12 4l4.5 4.5", "M4.5 19.5h15"] },
    { name: "trash", shape: "M6 7h12l-1 12.6a1.5 1.5 0 0 1-1.5 1.4h-7A1.5 1.5 0 0 1 7 19.6z", notch: 0.12, details: ["M4 7h16", "M9.5 7V4.5h5V7", minor("M10 11v6"), minor("M14 11v6")] },
    { name: "edit", shape: "M15.2 4.3a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L9 19.5l-4.5 1 1-4.5z", notch: 0.3, details: ["M13.5 6l4.5 4.5"] },
    { name: "link", details: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"] },
    { name: "calendar", shape: rect(3.5, 5, 17, 15.5, 2.5), notch: 0.2, details: ["M3.5 10h17", "M8 3v4", "M16 3v4", minor("M8 14h.01"), minor("M12 14h.01")] },
    { name: "clock", shape: RING, notch: 0.12, details: ["M12 7.5V12l3 2"] },
    { name: "globe", shape: RING, notch: 0.12, details: ["M3 12h18", minor("M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9"), "M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9"] },
    { name: "sun", shape: circle(12, 12, 4.2), notch: 0.12, details: ["M12 2.5v2", "M12 19.5v2", "M2.5 12h2", "M19.5 12h2", "M5.6 5.6l1.2 1.2", "M17.2 17.2l1.2 1.2", "M5.6 18.4l1.2-1.2", "M17.2 6.8l1.2-1.2"] },
    { name: "moon", shape: "M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z", notch: 0.55 },
    { name: "logout", details: ["M9.5 20H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4h3", "M15 8l4 4-4 4", "M19 12h-9"] },
    { name: "user", shape: circle(12, 8, 4), notch: 0.12, details: ["M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"] },
    { name: "users", shape: circle(9, 8.5, 3.5), notch: 0.12, details: ["M2.5 19.5c.7-3.3 3.3-5.2 6.5-5.2s5.8 1.9 6.5 5.2", "M15.5 5.2a3.5 3.5 0 0 1 0 6.6", "M17.5 14.6c2 .7 3.4 2.4 4 4.9"] },
    { name: "lock", shape: rect(4.5, 10.5, 15, 10.5, 2.5), notch: 0.2, details: ["M8 10.5V8a4 4 0 0 1 8 0v2.5", "M12 14.5v2.5"] },
    { name: "shield-check", shape: "M12 3 19.5 6v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z", notch: 0.1, details: ["M8.8 12.2l2.2 2.2 4.2-4.4"] },
    { name: "key", shape: circle(8, 15.5, 4.5), notch: 0.12, details: ["M11.2 12.3 20 3.5", "M16.5 7l2.5 2.5", minor("M14 9.5l2 2")] },
  ],
  Finance: [
    { name: "ledger-book", shape: rect(5, 3, 14, 18, 2), notch: 0.2, details: ["M8.5 3v18", "M11.5 8h4.5", "M11.5 12h4.5", minor("M11.5 16h2.5")] },
    { name: "receipt", shape: "M5.5 3h13v18l-2.2-1.5-2.1 1.5-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5z", notch: 0.04, details: ["M9 8h6", "M9 12h6", minor("M9 15.5h3")] },
    { name: "invoice", shape: FILE, notch: 0.12, details: [FOLD, "M8.5 12h7", "M8.5 15.5h4", minor("M8.5 8.5h2.5")] },
    { name: "calculator", shape: rect(5, 3, 14, 18, 2.5), notch: 0.2, details: ["M8.5 7h7", dot(8.5, 11.5), dot(12, 11.5), dot(15.5, 11.5), dot(8.5, 15.5), dot(12, 15.5), minor("M15.5 15v2.5")] },
    { name: "bank", shape: "M3.5 9 12 4l8.5 5z", notch: 0.62, details: ["M5.5 12v5.5", "M10 12v5.5", "M14 12v5.5", "M18.5 12v5.5", "M3.5 20.5h17"] },
    { name: "credit-card", shape: rect(2.5, 5, 19, 14, 2.5), notch: 0.2, details: ["M2.5 10h19", "M6 15h3.5"] },
    { name: "wallet", shape: "M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5h1.5A1.5 1.5 0 0 1 20 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 17.5z", notch: 0.15, details: ["M4 7.5A2.5 2.5 0 0 0 6.5 10H20", dot(16.5, 14.5)] },
    { name: "coins", shape: circle(9, 9, 5.5), notch: 0.12, details: ["M14 7.5a5.5 5.5 0 1 1-6.5 6.5", minor("M9 7v4")] },
    { name: "dollar-circle", shape: RING, notch: 0.12, details: ["M14.6 9.3c-.4-.9-1.4-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.9 2.6 2.1-1.1 2-2.6 2c-1.2 0-2.2-.6-2.6-1.5", "M12 6v1.8", "M12 16.4V18"] },
    { name: "trending-up", details: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"] },
    { name: "trending-down", details: ["M3 7l6 6 4-4 8 8", "M15 17h6v-6"] },
    { name: "bar-chart", details: ["M3.5 20.5h17", "M6.5 17v-5", "M11 17V7", "M15.5 17v-8", "M19.5 17v-3"] },
    { name: "pie-chart", shape: RING, notch: 0.4, details: ["M12 3v9h9"] },
    { name: "percent", details: ["M18.5 5.5l-13 13", circle(7.5, 7.5, 2.5), circle(16.5, 16.5, 2.5)] },
    { name: "file-text", shape: FILE, notch: 0.12, details: [FOLD, "M8.5 12h7", "M8.5 15.5h7", minor("M8.5 8.5h2")] },
    { name: "file-upload", shape: FILE, notch: 0.12, details: [FOLD, "M12 17.5v-6", "M9.5 14 12 11.5l2.5 2.5"] },
    { name: "folder", shape: "M3.5 6.5A1.5 1.5 0 0 1 5 5h4.3l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v9.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z", notch: 0.2, details: [minor("M3.5 10.5h17")] },
    { name: "briefcase", shape: rect(3, 7, 18, 13, 2.5), notch: 0.2, details: ["M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7", "M3 12.5h18"] },
    { name: "building", shape: "M4.5 21V4.5A1.5 1.5 0 0 1 6 3h7.5A1.5 1.5 0 0 1 15 4.5V21z", notch: 0.3, details: ["M15 9h3a1.5 1.5 0 0 1 1.5 1.5V21", "M3 21h18", "M8 7.5h3.5", "M8 11h3.5", minor("M8 14.5h3.5")] },
    { name: "tax-form", shape: FILE, notch: 0.12, details: [FOLD, "M14.5 11.5l-5 6", dot(9.5, 12), dot(14.5, 17)] },
    { name: "reconcile", details: ["M19.5 9A8 8 0 0 0 5.2 7.2", "M4.5 15a8 8 0 0 0 14.3 1.8", "M5 3.5v4h4", "M19 20.5v-4h-4", minor("M9.5 12.2l1.8 1.8 3.2-3.4")] },
    { name: "payroll", shape: circle(9, 8, 3.5), notch: 0.12, details: ["M3 19.5c.6-3 3-5 6-5 1.3 0 2.5.4 3.4 1", "M18 11.5v1.5", "M18 20v1.5", "M20.2 14.2c-.3-.7-1.1-1.2-2.2-1.2-1.2 0-2.1.6-2.1 1.5s.9 1.2 2.1 1.5 2.1.6 2.1 1.5-.9 1.5-2.1 1.5c-1 0-1.9-.5-2.2-1.2"] },
    { name: "expense-tag", shape: "M3.5 4.8v5.9a1.5 1.5 0 0 0 .4 1l8.6 8.6a1.5 1.5 0 0 0 2.1 0l6-6a1.5 1.5 0 0 0 0-2.1l-8.6-8.6a1.5 1.5 0 0 0-1-.4H4.8a1.3 1.3 0 0 0-1.3 1.3z", notch: 0.55, details: [dot(8, 8)] },
    { name: "recurring-payment", details: ["M20 12a8 8 0 0 1-14 5.3", "M4 12a8 8 0 0 1 14-5.3", "M18.5 3v4h-4", "M5.5 21v-4h4", minor("M12 9v6")] },
    { name: "statement", shape: rect(4.5, 3, 15, 18, 2), notch: 0.2, details: ["M8 7.5h8", "M8 11.5h8", "M8 15.5h4", minor("M14.5 15.5h1.5")] },
  ],
  "Communication and automation": [
    { name: "mail", shape: MAIL, notch: 0.2, details: ["M3.5 7l8.5 6 8.5-6"] },
    { name: "mail-check", details: ["M21 11.5V7.5A2.5 2.5 0 0 0 18.5 5h-13A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19H12", "M3.5 7l8.5 6 8.5-6", "M15 18l2 2 4-4"] },
    { name: "phone", shape: PHONE, notch: 0.62 },
    { name: "phone-call", shape: PHONE, notch: 0.62, details: ["M14.5 3.5a6 6 0 0 1 6 6", "M14.5 7a2.5 2.5 0 0 1 2.5 2.5"] },
    { name: "phone-missed", shape: PHONE, notch: 0.62, details: ["M15 3.5l5 5", "M20 3.5l-5 5"] },
    { name: "message", shape: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A1.5 1.5 0 0 1 4 15.5z", notch: 0.2, details: ["M8.5 9h7", minor("M8.5 12.5h4")] },
    { name: "bot", shape: rect(4, 8, 16, 12, 3), notch: 0.2, details: ["M12 8V4.5", dot(12, 4), "M9 13.5v1", "M15 13.5v1", minor("M2 13v2.5"), minor("M22 13v2.5")] },
    { name: "waveform", details: ["M3 11v2", "M7 8v8", "M10.5 5v14", "M14 9v6", "M17.5 7v10", "M21 11v2"] },
    { name: "sparkles", shape: "M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z", notch: 0.2, details: ["M18.5 15.5v5", "M16 18h5"] },
    { name: "webhook", details: [circle(6, 17, 2.5), circle(18, 17, 2.5), circle(12, 6, 2.5), "M8.5 17h7", "M10.8 8.2 7.3 14.8", "M13.2 8.2l3.5 6.6"] },
    { name: "clock-play", shape: circle(11, 11.5, 8), notch: 0.12, details: ["M11 7.5v4l2.5 1.5", "M16.5 16.5v5l4-2.5z"] },
    { name: "send", shape: "M20.5 3.5 3.5 10.2l6.8 3 3 6.8z", notch: 0.3, details: ["M10.3 13.2l4.2-4.2"] },
  ],
  Status: [
    { name: "success", shape: RING, notch: 0.12, details: ["M8.2 12.3l2.6 2.6 5-5.2"] },
    { name: "pending", details: ["M12 3a9 9 0 0 1 0 18", { d: "M12 21a9 9 0 0 1 0-18", dash: true }, "M12 8v4l2.5 1.5"] },
    { name: "failed", shape: RING, notch: 0.12, details: ["M9.2 9.2l5.6 5.6", "M14.8 9.2l-5.6 5.6"] },
    { name: "refunded", shape: RING, notch: 0.12, details: ["M9 9.5h4.5a2.5 2.5 0 0 1 0 5H9.5", "M11 7.5 9 9.5l2 2"] },
    { name: "processing", details: ["M21 12a9 9 0 1 1-2.6-6.4", "M19 2.5v3.6h-3.6", dot(12, 12)] },
    { name: "paused", shape: RING, notch: 0.12, details: ["M10 9v6", "M14 9v6"] },
  ],
};

// Spot illustrations on a 96 grid. Classes: i-surface (soft fill), i-line (main ink), i-accent (brand accent).
export const ILLUSTRATIONS = [
  {
    name: "empty-inbox",
    body: `<path class="i-surface" d="M14 52h68v22a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z"/>
<path class="i-line" d="M14 52 24 24a4 4 0 0 1 3.8-2.8h40.4A4 4 0 0 1 72 24l10 28v22a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z"/>
<path class="i-line" d="M14 52h18l4 8h24l4-8h18"/>
<path class="i-accent" d="M40 36h16M44 43h8"/>`,
  },
  {
    name: "empty-search",
    body: `<circle class="i-surface" cx="42" cy="42" r="22"/>
<path class="i-line" d="M42 20a22 22 0 1 1 0 44 22 22 0 1 1 0-44zM58 58l18 18"/>
<path class="i-accent" d="M34 42h16"/>`,
  },
  {
    name: "success",
    body: `<circle class="i-surface" cx="48" cy="48" r="32"/>
<path class="i-line" d="M64 20.3A32 32 0 1 1 56 17"/>
<path class="i-accent" d="M34 49l9.5 9.5L63 39"/>`,
  },
  {
    name: "error",
    body: `<path class="i-surface" d="M42.6 18a6.2 6.2 0 0 1 10.8 0l26 45a6.2 6.2 0 0 1-5.4 9.3H22a6.2 6.2 0 0 1-5.4-9.3z"/>
<path class="i-line" d="M42.6 18a6.2 6.2 0 0 1 10.8 0l26 45a6.2 6.2 0 0 1-5.4 9.3H22a6.2 6.2 0 0 1-5.4-9.3z"/>
<path class="i-accent" d="M48 36v14M48 59h.1"/>`,
  },
  {
    name: "upload",
    body: `<path class="i-surface" d="M26 18h30l16 16v40a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z"/>
<path class="i-line" d="M26 18h30l16 16v40a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4zM56 18v16h16"/>
<path class="i-accent" d="M47 66V46M39 54l8-8 8 8"/>`,
  },
  {
    name: "payment",
    body: `<rect class="i-surface" x="14" y="26" width="68" height="46" rx="8"/>
<path class="i-line" d="M22 26h52a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8zM14 40h68"/>
<path class="i-accent" d="M24 58h14M44 58h6"/>`,
  },
  {
    name: "calling",
    body: `<circle class="i-surface" cx="48" cy="48" r="30"/>
<path class="i-line" d="M36 28h7l4 10-5 3.5a22 22 0 0 0 14.5 14.5L60 51l10 4v7a4 4 0 0 1-4.3 4A38 38 0 0 1 30 32.3 4 4 0 0 1 34 28z"/>
<path class="i-accent" d="M58 22a16 16 0 0 1 16 16M58 30a8 8 0 0 1 8 8"/>`,
  },
  {
    name: "documents",
    body: `<rect class="i-surface" x="30" y="14" width="44" height="58" rx="6"/>
<path class="i-line" d="M36 14h32a6 6 0 0 1 6 6v46a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6zM22 26v50a6 6 0 0 0 6 6h34"/>
<path class="i-accent" d="M40 32h24M40 42h24M40 52h14"/>`,
  },
  {
    name: "offline",
    body: `<circle class="i-surface" cx="48" cy="56" r="20"/>
<path class="i-line" d="M18 42a42 42 0 0 1 60 0M28 52a28 28 0 0 1 40 0M38 62a14 14 0 0 1 20 0"/>
<path class="i-accent" d="M20 20l56 56"/>`,
  },
  {
    name: "locked",
    body: `<rect class="i-surface" x="22" y="42" width="52" height="36" rx="8"/>
<path class="i-line" d="M30 42h36a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8V50a8 8 0 0 1 8-8zM34 42V32a14 14 0 0 1 28 0v10"/>
<path class="i-accent" d="M48 55v10"/>`,
  },
];
