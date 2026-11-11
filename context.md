# Anoglobe Bookkeeping: project context

**Last updated: 2026-11-11**

Read this before changing anything. **After every change, update this file: the date above, whichever section changed, and one line in the change log at the bottom.**

## What this is

Website, client onboarding and admin panel for Anoglobe Bookkeeping, a US small business bookkeeping firm. Built from the design system in `design-system/`.

| Folder | What it is |
|---|---|
| `web/` | The real app. Next.js front and back end, Postgres. All new work goes here. |
| `design-system/` | The static prototype and component docs. It is the visual reference. Do not edit it to change the live app. |
| `index.html` (root) | Review landing page for the static prototype on GitHub Pages. |

## Run it

| | |
|---|---|
| Site | http://localhost:7290, pm2 process `anoglobe-web`, bound to `0.0.0.0` |
| Admin | http://localhost:7290/admin |
| Signup | http://localhost:7290/onboarding/account |
| Database | Docker container `anoglobe-pg`, `127.0.0.1:5441`, database and user `anoglobe` |

```sh
cd web
npm install
npm run db:up        # start Postgres
npm run db:migrate   # apply db/schema.sql (safe to repeat)
npm run admin:create -- "Full Name" name@company.com   # owner account, password goes to data/first-admin.txt
npm run build && pm2 restart anoglobe-web
npm test
```

`pm2 save` has not been run, so the app does not come back by itself after a reboot.

Demo data: `npm run demo:seed` and `npm run demo:clear`. The admin shows a warning while demo clients exist. **Demo data is loaded right now; clear it before real use.**

## Settings (`web/.env.local`, never committed)

| Name | Needed | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection |
| `POSTGRES_PASSWORD` | yes | Used by docker-compose |
| `APP_SECRET` | yes | Encrypts EINs and uploaded files. **Changing or losing it makes them unreadable.** Back it up. |
| `PAYMENTS_MODE` | yes | `test` turns on the test gateway. Anything else blocks payment. |
| `SMTP_URL` | no | e.g. `smtp://user:pass@host:587`. Without it, emails are saved with status "Not sent". |
| `SITE_URL` | for live | Base URL for links in emails. Without it, the request's host is used. |
| `MAINTENANCE_MODE` | no | `1` shows the maintenance page on the public site and signup. Admin stays open. |
| `UPLOAD_DIR` | no | Default `web/data/uploads` |

## Status

**Working and tested in a real browser:** home, privacy, terms, lead form, full 7-step onboarding with real encrypted uploads, save and resume by emailed link, test payment with decline and retry, all 15 admin screens, sign-in with lockout, forgot and reset password, invites, roles, audit log, CSV export, email sending through SMTP, maintenance mode, 404, 403, 500 and session-expired pages.

**Not connected. Each needs something from the client:**

| Item | Needs | Today |
|---|---|---|
| Real card payments | Stripe account and test keys | Test gateway only. No money moves. Build goes in `pay()` in `app/api/onboarding/[step]/route.ts`. |
| Monthly renewal charges | Stripe | Subscriptions are recorded and the next date shown, but nothing charges automatically. |
| Refunds | Stripe | Recorded in test mode only. |
| AI calls | Choice of provider and API key | Calls are queued and listed, never placed. Hook is `queueCall()` in `lib/events.ts`. Call status and summaries will arrive from the provider. |
| Live emails | SMTP details, verified sending domain | Saved with status "Not sent". |
| Client content | Founder names, founder and team photos, 4 videos | Placeholders on the home page. |
| Contact buttons | Phone number, Calendly link | **Static placeholders live:** `(415) 555-0132` and `https://calendly.com/`. Replace `PHONE` and `BOOKING_URL` at the top of `components/contact.tsx` before going live. |
| Legal text | Review by Anoglobe's lawyer | Privacy, terms and billing authorization are marked as sample. They mention a pricing page, plans and Stripe, so they need rewriting for the final setup. |

**Decided, ask the owner before reversing:**

- **Prices:** home page prices win: $270 a month flat, and catch-up at $220 per month of catch-up. The design's $299, $499 and $899 plans are marked "sample" and contradict "no pricing tiers". All prices live in `lib/plans.ts`.
- **Monthly or catch-up, not both:** the plan step takes one, as in the design. A client who needs both cannot buy them together yet.
- **The $120 discounted catch-up month** is described but not calculated, because it is "subject to review".
- **Left out on purpose:**
  - Client sign-in choice on step 1 (password or magic link). There is no client portal for it to sign in to.
  - Two-factor toggle, password expiry, daily summary and "call failed" alert in settings. They had nothing behind them, and every switch left in settings really works.
  - Stripe fee lines on the payment page. Those numbers would be invented until Stripe reports them.
  - Automatic retry of unanswered calls and the "Stripe keys in settings" form. Keys stay in `.env.local`.
- **Added beyond the design:** Leads page, password change on Profile, reset-password page, schedule-call dialog (it sends the call-scheduled email).

## Design page to live route

| Design file (`design-system/ui-design/`) | Live route |
|---|---|
| `site/v2/index_v2.html` | `/` |
| `site/privacy.html`, `site/terms.html` | `/privacy`, `/terms` |
| `onboarding/step-1` to `step-5` | `/onboarding/account`, `business`, `services`, `documents`, `plan` |
| `onboarding/step-7-review`, `step-6-payment` | `/onboarding/review`, then `/onboarding/payment` (same order as the design's flow) |
| `onboarding/success`, `payment-failed`, `resume` | `/onboarding/success`, `payment-failed`, `resume` |
| `admin/dashboard`, `registrations`, `registration-detail` | `/admin/dashboard`, `/admin/registrations`, `/admin/registrations/[id]` |
| `admin/payments`, `payment-detail`, `subscriptions` | `/admin/payments`, `/admin/payments/[id]`, `/admin/subscriptions` |
| `admin/documents`, `emails`, `ai-calls` | `/admin/documents`, `/admin/emails`, `/admin/ai-calls` |
| `admin/team`, `audit-log`, `settings`, `profile` | same names under `/admin/` |
| `admin/login`, `forgot-password` | `/admin/login`, `/admin/forgot-password` |
| `emails/*.html` (5) | `web/lib/email-templates/`, preview from Admin, Emails |
| `states/404`, `500`, `permission-denied`, `session-expired`, `maintenance` | `not-found.tsx` and `error.tsx` in each group, `/admin/permission-denied`, `/admin/session-expired`, `/maintenance` |
| `states/empty-states`, `loading` | Galleries. Used as `<Empty>` in every list and the dashboard skeleton. |

**Not built:**

- `site/services`, `pricing`, `about`, `contact`, `site/index`, `v2/index`, `v2/index_v3`: Version 1 and alternatives. They are marked "showcase", and hold sample prices, placeholder team names and a made-up phone number. They need real content first.
- `foundations/*`, `components/*`, `index.html`: documentation for developers, not product screens. They stay in `design-system/`.
- `onboarding/flow.html`: all steps on one page, for review only.

The design's scope notes say the contract covers a 1 to 2 page website with an admin to view registrations and payments. Pages marked "showcase" were built here at the owner's request on 2026-11-05.

## How the code works

```
web/
  app/(site)/          home, privacy, terms. React. Own root layout and CSS.
  app/(onboarding)/    signup steps, maintenance. Own root layout.
  app/(admin)/         admin screens. Own root layout. Each page calls requireUser and AdminShell.
  app/api/onboarding/[step]/route.ts   saves each step, uploads, resume link, payment
  app/api/admin/route.ts               every admin change: origin check, sign-in, role, audit
  app/api/admin/auth/[action]/         login, forgot, reset
  app/api/admin/export, documents, emails   CSV, file download, email view (all signed in)
  app/api/leads/       home page form
  app/styles/          design system CSS, plus site.css (home) and app.css (everything else)
  components/          admin-ui.tsx (shell, tables), fields.tsx (form fields), design-js.tsx
  lib/                 db, auth, onboarding rules, events (after signup and payment), mail, secure, uploads, plans, settings
  public/assets/js/    design system scripts, plus app.js (our glue)
  db/schema.sql        the whole database. Safe to run repeatedly.
```

**Rules that will bite you if you skip them:**

1. **Onboarding and admin use native form posts and redirects, not React state.** Pages are server components with the design system's own markup and data attributes. Its plain JavaScript handles tables, dropdowns, charts and dialogs. Use `<a>`, not `next/link`, in these sections: each page must load in full so the scripts start clean.
2. **`<DesignJs />` must be the last thing in a page.** It loads the scripts after React hydrates, to avoid hydration errors. `AdminShell` includes it. A page using `<Suspense>` passes `streamed` and puts `<DesignJs />` inside the boundary (see the dashboard).
3. **An `id` must not equal an icon name.** `<use href="#phone">` finds the first element with that id, so a field with `id="phone"` breaks that icon and its own label. Hence `id="phone-number"`.
4. **`browserslist` in `package.json` must stay.** Colour tokens use native `light-dark()`. With older targets the CSS compiler freezes them and dark sections turn light. It means Safari 17.5+, Chrome 123+, Firefox 120+.
5. **Icons often need their extra class:** `a-option__check`, `a-select__chevron`, `a-password__show`, `a-icon--32`. Copy them from the design page.
6. **Follow the design system's principles:** no native selects, date pickers, checkboxes or browser dialogs; plain US business English; no dashes; no invented facts.
7. **Do not edit copied CSS and JS when you can add instead.** Put fixes in `site.css`, `app.css` or `app.js`. Only one copied file was changed: `public/assets/js/admin.js` no longer stops `data-dirty-form` submits.
8. **Times are shown in Eastern Time, and the server runs in UTC.** Use `lib/format.ts`, including `easternTime()` for typed dates.

**Security already in place. Keep it:**

- Card digits never reach the server. Card inputs have no `name`; only the last four digits are posted.
- Passwords use scrypt. Sessions and tokens are stored as hashes. Accounts lock for 15 minutes after 5 wrong passwords. Idle sign-out at 30 minutes.
- All posts check the origin. Cookies are `httpOnly` and `SameSite=Lax`, and `Secure` behind HTTPS.
- EINs and uploads are AES-256-GCM encrypted. Only owner and admin see a whole EIN.
- Uploads are limited to PDF, CSV, XLSX, JPG and PNG, 25 MB each, 30 per signup, outside `public/`, and served only to signed-in staff.
- Stored emails and files are served with a sandbox CSP, since they hold client-typed text.
- CSV export neutralizes spreadsheet formulas.
- Forgot-password and resume forms answer the same whether or not the email exists.

**Known limits:**

- Rate limits are site-wide caps (leads and new signups, 30 a minute). Add per-IP limits once a real host and proxy are in place. `clientIp()` trusts `cf-connecting-ip` and `x-forwarded-for`, so **put the app behind a proxy that sets them before relying on logged IPs.**
- The audit log has no retention job yet.
- The app has only been run over plain HTTP so far. Use HTTPS in production.

**Roles:** owner and admin manage everything; bookkeeper works with clients, documents, calls and emails; viewer only reads. Checks live in `lib/auth.ts` (`canManage`, `canEditClients`) and `app/api/admin/route.ts`.

## Testing

- `npm test`: form rules, prices, Eastern Time, passwords, encryption.
- Browser checks were scripts in a temporary folder, not in the repo. They covered the full signup, decline and retry, every admin action, roles, lockout, resume links and security refusals, plus every page at 320, 375, 430, 667, 768, 1024, 1280 and 1920 px for overflow and axe accessibility (at 375). Chromium is at `~/.cache/ms-playwright`, and playwright-core is the only package needed to redo them.

## Change log

Newest first. One line per change.

- 2026-11-11: Catch-up dialog: description removed, title only. Report 2 charts overlap as a staggered collage on phones (2 by 2 grid from 640px). Back to top button from the design system replaces the footer's text link. Easy Bookkeeping Review shows text before the image below 1024px. Contact popup opens only while scrolling down, once Real Humans reaches the top.
- 2026-11-11: Hero and sticky bar read "8 Reasons". Lead form label "Email" instead of "Business Email". Contact popup now opens at Real Humans, not Pricing.
- 2026-11-11: Site: replaced the "Talk to Us" bubble, its panel, tooltip and section prompts with two floating buttons (Call Us, Book a Call) as the client asked, plus a lead form popup that opens once per page load when Real Humans reaches the top. `LeadForm` takes `idPrefix`; its submit button is full width in the popup and the page's form. The buttons hide while the lead form or footer is on screen.
- 2026-11-10: Contact panel opens with the design system's spring (`--ease-spring`, 480ms) and closes with a short ease-in; tokens added in `site.css`, off under reduced motion. Ported the design system tooltip (`data-ds-tooltip`, in `site-behaviour.tsx`) to label the round phone button below 640px.
- 2026-11-10: Site: floating "Talk to Us" button (call, book a call, send a message) on every site page, using the native `popover`; hidden while the lead form is on screen. "Talk to Us" prompts after Pricing and Real Humans open the same panel. Chosen over an automatic pop-up.
- 2026-11-10: Catch-up dialog: second option renamed from "I Already Have QuickBooks" to "I Already Have a Bookkeeping File" at the owner's request (the client's Website Dev PDF still says QuickBooks).
- 2026-11-10: Home: "US Based" is now the 8th hero tile and sticky bar tab, linking to a new `#us-based` section. Report and review images replaced with the client's new ones as WebP (Better Reporting report 2 is now four charts in a grid, `.v2-shots`). Old PNG/JPG removed. Added `globe` icon to the site sprite.
- 2026-11-05: Added onboarding, admin panel, state pages and emails. Added context.md.
- 2026-11-04: Built the public site from `index_v2.html` in Next.js with Postgres. Responsive fixes for phone and tablet.
