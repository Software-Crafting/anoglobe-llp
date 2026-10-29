// Shared page shells. Pages mark regions with <!-- shell:name --> ... <!-- /shell:name -->
// and sync-shells.mjs rewrites the inside from these templates. Each template receives
// { root, path, exists }: root is the relative prefix to design-system/, path is the page path from
// there, exists(path) tells whether a page has been built yet.

export const COMPONENT_CSS = ["foundations", "forms", "overlays", "data", "payment", "admin", "feedback"];
export const COMPONENT_JS = ["core", "forms", "overlays", "data", "payment", "admin", "site", "feedback"];

export const DOCS_NAV = [
  {
    group: "Foundations",
    items: [
      ["Colors", "ui-design/foundations/colors.html"],
      ["Typography", "ui-design/foundations/typography.html"],
      ["Spacing and radius", "ui-design/foundations/spacing.html"],
      ["Elevation", "ui-design/foundations/elevation.html"],
      ["Motion", "ui-design/foundations/motion.html"],
      ["Grid", "ui-design/foundations/grid.html"],
      ["Icons", "ui-design/foundations/icons.html"],
      ["Logo", "ui-design/foundations/logo.html"],
      ["Imagery", "ui-design/foundations/imagery.html"],
    ],
  },
  {
    group: "Components",
    items: [
      ["Foundations", "ui-design/components/foundations.html"],
      ["Forms", "ui-design/components/forms.html"],
      ["Overlays", "ui-design/components/overlays.html"],
      ["Data display", "ui-design/components/data.html"],
      ["Payment", "ui-design/components/payment.html"],
      ["Admin shell", "ui-design/components/admin-shell.html"],
      ["Feedback", "ui-design/components/feedback.html"],
    ],
  },
  {
    group: "Pages",
    items: [["All pages", "ui-design/index.html"]],
  },
];

export const SITE_NAV = [
  ["Home", "ui-design/site/index.html"],
  ["Services", "ui-design/site/services.html"],
  ["Pricing", "ui-design/site/pricing.html"],
  ["About", "ui-design/site/about.html"],
  ["Contact", "ui-design/site/contact.html"],
];

export const ADMIN_NAV = [
  {
    group: "Overview",
    items: [["Dashboard", "ui-design/admin/dashboard.html", "home"]],
  },
  {
    group: "Clients",
    items: [
      ["Registrations", "ui-design/admin/registrations.html", "users", "12"],
      ["Documents", "ui-design/admin/documents.html", "folder"],
    ],
  },
  {
    group: "Billing",
    items: [
      ["Payments", "ui-design/admin/payments.html", "credit-card"],
      ["Subscriptions", "ui-design/admin/subscriptions.html", "recurring-payment"],
    ],
  },
  {
    group: "Automation",
    items: [
      ["AI calls", "ui-design/admin/ai-calls.html", "phone-call", "3"],
      ["Emails", "ui-design/admin/emails.html", "mail"],
    ],
  },
  {
    group: "Workspace",
    items: [
      ["Team", "ui-design/admin/team.html", "users"],
      ["Audit log", "ui-design/admin/audit-log.html", "file-text"],
      ["Settings", "ui-design/admin/settings.html", "settings"],
    ],
  },
];

// Detail pages highlight their parent list in the admin sidebar.
const ADMIN_PARENT = {
  "ui-design/admin/registration-detail.html": "ui-design/admin/registrations.html",
  "ui-design/admin/payment-detail.html": "ui-design/admin/payments.html",
  "ui-design/admin/profile.html": "ui-design/admin/settings.html",
};

const builtGroups = (groups, exists) =>
  groups.map(({ group, items }) => ({ group, items: items.filter(([, href]) => exists(href)) })).filter(({ items }) => items.length);

const current = (href, path) => (href === path ? ' aria-current="page"' : "");
const icon = (root, name, extra = "") =>
  `<svg class="a-icon${extra}" aria-hidden="true"><use href="#${name}"></use></svg>`;

const logo = (root) => `<img class="a-logo a-logo--light" src="${root}assets/img/logo.svg" width="223" height="28" alt="Anoglobe Bookkeeping">
      <img class="a-logo a-logo--dark" src="${root}assets/img/logo-reversed.svg" width="223" height="28" alt="Anoglobe Bookkeeping">`;

export const SHELLS = {
  head: ({ root }) => `
  <link rel="icon" href="${root}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${root}assets/css/tokens.css">
  <link rel="stylesheet" href="${root}assets/css/base.css">
  <link rel="stylesheet" href="${root}assets/css/layout.css">
${COMPONENT_CSS.map((name) => `  <link rel="stylesheet" href="${root}assets/css/components/${name}.css">`).join("\n")}
  <link rel="stylesheet" href="${root}assets/css/pages.css">
${COMPONENT_JS.map((name) => `  <script src="${root}assets/js/components/${name}.js" defer></script>`).join("\n")}
  `,

  "docs-header": ({ root }) => `
  <a class="a-skip-link" href="#main">Skip to content</a>
  <header class="a-docs-header">
    <a class="a-docs-header__brand" href="${root}index.html">
      ${logo(root)}
      <span class="a-docs-header__label">Design system</span>
    </a>
  </header>
  <div class="a-toast-region" data-icons="check-circle x-circle info alert-triangle close"></div>
  `,

  "docs-nav": ({ root, path, exists }) => `
    <nav class="a-docs-nav" aria-label="Design system" data-scroll-area>
${builtGroups(DOCS_NAV, exists).map(
  ({ group, items }) => `      <div class="a-docs-nav__group">
        <p class="a-eyebrow">${group}</p>
        <ul class="a-docs-nav__list" role="list">
${items.map(([name, href]) => `          <li><a class="a-docs-nav__link" href="${root}${href}"${current(href, path)}>${name}</a></li>`).join("\n")}
        </ul>
      </div>`,
).join("\n")}
    </nav>
    `,

  "site-header": ({ root, path }) => `
  <a class="a-skip-link" href="#main">Skip to content</a>
  <header class="a-site-header" data-site-header>
    <div class="a-container a-site-header__inner">
      <a class="a-site-header__brand" href="${root}ui-design/site/index.html">
        ${logo(root)}
      </a>
      <nav class="a-site-nav" id="site-nav" aria-label="Main" data-site-nav>
        <ul class="a-site-nav__list" role="list">
${SITE_NAV.map(([name, href]) => `          <li><a class="a-site-nav__link" href="${root}${href}"${current(href, path)}>${name}</a></li>`).join("\n")}
        </ul>
        <div class="a-site-nav__actions">
          <a class="a-btn a-btn--ghost" href="${root}ui-design/onboarding/resume.html">Resume signup</a>
          <a class="a-btn a-btn--primary" href="${root}ui-design/onboarding/step-1-account.html">Get started</a>
        </div>
      </nav>
      <div class="a-site-header__tools">
        <button type="button" class="a-btn a-btn--ghost a-btn--icon a-site-header__menu" aria-controls="site-nav" aria-expanded="false" aria-label="Menu" data-site-menu data-icons="close">
          ${icon(root, "menu")}
        </button>
      </div>
    </div>
  </header>
  <div class="a-toast-region" data-icons="check-circle x-circle info alert-triangle close"></div>
  `,

  "site-footer": ({ root }) => `
  <footer class="a-site-footer" data-theme="dark">
    <div class="a-container a-site-footer__grid">
      <div class="a-site-footer__brand">
        ${logo(root)}
        <p class="a-small a-muted">Monthly bookkeeping, catch-up and cleanup for US small businesses. Billed in USD.</p>
      </div>
      <nav aria-label="Company">
        <p class="a-eyebrow">Company</p>
        <ul role="list">
          <li><a href="${root}ui-design/site/services.html">Services</a></li>
          <li><a href="${root}ui-design/site/pricing.html">Pricing</a></li>
          <li><a href="${root}ui-design/site/about.html">About</a></li>
          <li><a href="${root}ui-design/site/contact.html">Contact</a></li>
        </ul>
      </nav>
      <nav aria-label="Clients">
        <p class="a-eyebrow">Clients</p>
        <ul role="list">
          <li><a href="${root}ui-design/onboarding/step-1-account.html">Start onboarding</a></li>
          <li><a href="${root}ui-design/onboarding/resume.html">Resume signup</a></li>
          <li><a href="${root}ui-design/admin/login.html">Team sign in</a></li>
        </ul>
      </nav>
      <div>
        <p class="a-eyebrow">Contact</p>
        <ul role="list" class="a-site-footer__contact">
          <li><a href="mailto:hello@anoglobebookkeeping.com">hello@anoglobebookkeeping.com</a></li>
          <li><a href="tel:+13025550147">+1 (302) 555-0147</a></li>
          <li class="a-muted">Mon to Fri, 9:00 AM to 6:00 PM ET</li>
        </ul>
      </div>
    </div>
    <div class="a-container a-site-footer__legal">
      <p class="a-small a-muted">&copy; 2026 Anoglobe LLP. All rights reserved.</p>
      <ul role="list">
        <li><a href="${root}ui-design/site/privacy.html">Privacy</a></li>
        <li><a href="${root}ui-design/site/terms.html">Terms</a></li>
      </ul>
    </div>
  </footer>
  `,

  "onboarding-header": ({ root }) => `
  <a class="a-skip-link" href="#main">Skip to content</a>
  <header class="a-onb-header">
    <a class="a-onb-header__brand" href="${root}ui-design/site/index.html">
      ${logo(root)}
    </a>
    <div class="a-onb-header__tools">
      <span class="a-badge a-badge--success a-onb-header__secure">${icon(root, "lock")}Secure signup</span>
      <a class="a-btn a-btn--ghost a-btn--sm" href="${root}ui-design/site/contact.html">${icon(root, "help-circle")}<span class="a-onb-header__help-text">Help</span></a>
    </div>
  </header>
  <div class="a-toast-region" data-icons="check-circle x-circle info alert-triangle close"></div>
  `,

  "onboarding-footer": () => `
  <footer class="a-onb-footer">
    <p class="a-small a-muted">Your information is encrypted in transit. Card details go directly to our payment processor and are never stored by Anoglobe.</p>
  </footer>
  `,

  "admin-sidebar": ({ root, path, exists }) => {
    const active = ADMIN_PARENT[path] || path;
    return `
  <a class="a-skip-link" href="#main">Skip to content</a>
  <aside class="a-admin-sidebar" id="admin-sidebar" data-admin-sidebar aria-label="Admin">
    <div class="a-admin-sidebar__brand">
      <a href="${root}ui-design/admin/dashboard.html" class="a-admin-sidebar__logo">
        <img class="a-admin-sidebar__mark a-logo--light" src="${root}assets/img/logo-mark.svg" width="28" height="28" alt="">
        <img class="a-admin-sidebar__mark a-logo--dark" src="${root}assets/img/logo-mark-reversed.svg" width="28" height="28" alt="">
        <span class="a-admin-sidebar__name">Anoglobe <span class="a-muted">Admin</span></span>
      </a>
    </div>
    <nav class="a-admin-nav" aria-label="Admin sections" data-scroll-area>
${builtGroups(ADMIN_NAV, exists).map(
  ({ group, items }) => `      <div class="a-admin-nav__group">
        <p class="a-admin-nav__label">${group}</p>
        <ul role="list">
${items
  .map(
    ([name, href, iconName, badge]) =>
      `          <li><a class="a-admin-nav__link" href="${root}${href}"${current(href, active)} data-tooltip="${name}" data-tooltip-side="right" data-tooltip-when="collapsed">${icon(root, href === active ? `${iconName}-fill` : iconName)}<span class="a-admin-nav__text">${name}</span>${badge ? `<span class="a-badge a-badge--neutral a-admin-nav__badge">${badge}</span>` : ""}</a></li>`,
  )
  .join("\n")}
        </ul>
      </div>`,
).join("\n")}
    </nav>
    <div class="a-admin-sidebar__footer">
      <button type="button" class="a-admin-nav__link a-admin-sidebar__collapse" data-sidebar-collapse aria-pressed="false" aria-label="Collapse sidebar" data-tooltip="Expand sidebar" data-tooltip-side="right" data-tooltip-when="collapsed">${icon(root, "chevron-left")}<span class="a-admin-nav__text">Collapse</span></button>
    </div>
  </aside>
  <div class="a-admin-scrim" data-sidebar-scrim hidden></div>
  `;
  },

  "admin-topbar": ({ root }) => `
    <header class="a-admin-topbar">
      <button type="button" class="a-btn a-btn--ghost a-btn--icon a-admin-topbar__menu" aria-controls="admin-sidebar" aria-expanded="false" aria-label="Open navigation" data-sidebar-open>
        ${icon(root, "menu")}
      </button>
      <button type="button" class="a-admin-search" data-command-open>
        ${icon(root, "search")}
        <span>Search clients, payments, calls</span>
        <kbd class="a-kbd">Ctrl K</kbd>
      </button>
      <div class="a-admin-topbar__tools">
        <div class="a-popover-anchor">
          <button type="button" class="a-btn a-btn--ghost a-btn--icon a-notify-btn" aria-label="Notifications, 3 unread" aria-haspopup="dialog" aria-expanded="false" aria-controls="notifications" data-popover-trigger>
            ${icon(root, "bell")}<span class="a-notify-btn__dot"></span>
          </button>
          <div class="a-popover a-notifications" id="notifications" role="dialog" aria-label="Notifications" hidden>
            <div class="a-popover__header"><p class="a-h4">Notifications</p><button type="button" class="a-btn a-btn--link a-btn--sm">Mark all read</button></div>
            <ul role="list" class="a-notifications__list">
              <li class="a-notifications__item is-unread">${icon(root, "user")}<div><p><strong>Harbor Lane Dental</strong> completed signup</p><p class="a-xs a-muted">4 minutes ago</p></div></li>
              <li class="a-notifications__item is-unread">${icon(root, "x-circle")}<div><p>Payment failed for <strong>Bright Path Tutoring</strong></p><p class="a-xs a-muted">38 minutes ago</p></div></li>
              <li class="a-notifications__item is-unread">${icon(root, "phone-call")}<div><p>AI call answered by <strong>Cedar &amp; Pine Studio</strong></p><p class="a-xs a-muted">1 hour ago</p></div></li>
              <li class="a-notifications__item">${icon(root, "credit-card")}<div><p>$499.00 received from <strong>Northwind Logistics</strong></p><p class="a-xs a-muted">Yesterday</p></div></li>
            </ul>
          </div>
        </div>
        <div class="a-menu-anchor">
          <button type="button" class="a-user-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu" data-menu-trigger>
            <span class="a-avatar a-avatar--sm" aria-hidden="true">PN</span>
            <span class="a-user-btn__name">Priya Nair</span>
            ${icon(root, "chevron-down")}
          </button>
          <div class="a-menu" id="user-menu" role="menu" aria-label="Account" hidden>
            <a class="a-menu__item" role="menuitem" href="${root}ui-design/admin/profile.html">${icon(root, "user")}Profile</a>
            <a class="a-menu__item" role="menuitem" href="${root}ui-design/admin/settings.html">${icon(root, "settings")}Settings</a>
            <div class="a-menu__separator" role="separator"></div>
            <a class="a-menu__item" role="menuitem" href="${root}ui-design/admin/login.html">${icon(root, "logout")}Sign out</a>
          </div>
        </div>
      </div>
    </header>
    <div class="a-toast-region" data-icons="check-circle x-circle info alert-triangle close"></div>
    `,
};
