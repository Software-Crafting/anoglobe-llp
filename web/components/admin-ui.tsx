import type { ReactNode } from "react";
import type { AdminUser } from "@/lib/auth";
import { canManage } from "@/lib/auth";
import { many, one } from "@/lib/db";
import { recentNotifications } from "@/lib/events";
import { dateTime, initials, STATUS } from "@/lib/format";
import { DesignJs } from "./design-js";
import { Icon } from "./ui";

const NAV: { label: string; items: [string, string, string, boolean?][] }[] = [
  { label: "Overview", items: [["dashboard", "home-fill", "Dashboard"]] },
  { label: "Clients", items: [["registrations", "users", "Registrations"], ["leads", "mail", "Leads"], ["documents", "folder", "Documents"]] },
  { label: "Billing", items: [["payments", "credit-card", "Payments"], ["subscriptions", "recurring-payment", "Subscriptions"]] },
  { label: "Automation", items: [["ai-calls", "phone-call", "AI calls"], ["emails", "mail", "Emails"]] },
  { label: "Workspace", items: [["team", "users", "Team", true], ["audit-log", "file-text", "Audit log", true], ["settings", "settings", "Settings", true]] },
];

export const Status = ({ value }: { value: string }) => {
  const status = STATUS[value] ?? { label: value, tone: "neutral" };
  return <span className={`a-status a-status--${status.tone}`}>{status.label}</span>;
};

/** A one-button form: posts an admin action and comes back to this page. */
export function ActionForm({ action, back, fields = {}, children, className, confirm, menu }: { action: string; back: string; fields?: Record<string, string | number>; children: ReactNode; className?: string; confirm?: string; menu?: boolean }) {
  return (
    <form method="post" action="/api/admin" style={{ display: "contents" }}>
      <input type="hidden" name="_action" value={action} />
      <input type="hidden" name="_back" value={back} />
      {Object.entries(fields).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      <button type="submit" className={className ?? (menu ? "a-menu__item" : "a-btn a-btn--outline")} role={menu ? "menuitem" : undefined} data-confirm={confirm}>{children}</button>
    </form>
  );
}

export function RowMenu({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  return (
    <>
      <button type="button" className="a-btn a-btn--ghost a-btn--icon a-btn--sm" data-menu-trigger="" aria-haspopup="menu" aria-expanded="false" aria-controls={id} data-align="end" aria-label={`Actions for ${name}`}><Icon name="more-horizontal" /></button>
      <div className="a-menu" id={id} role="menu" aria-label={`Actions for ${name}`} hidden>{children}</div>
    </>
  );
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="a-empty">
      <svg className="a-illus" aria-hidden="true"><use href="#illus-empty-search" /></svg>
      <p className="a-empty__title">{title}</p>
      <p className="a-empty__text">{text}</p>
      {children && <div className="a-empty__actions">{children}</div>}
    </div>
  );
}

export type Column = { label: string; num?: boolean; col?: string; sticky?: boolean; noSort?: boolean };
export type Filter = { key: string; options: [string, string][] };

/** Search, filters, columns, density, export, sort and paging, driven by data.js. Pages supply the rows. */
export function TableCard({ id, exportName, search, filters = [], columns, rows, select, empty, noMatch, children }: {
  id: string;
  exportName?: string;
  search: string;
  filters?: Filter[];
  columns: Column[];
  rows: number;
  select?: boolean;
  empty: ReactNode;
  noMatch: string;
  children: ReactNode;
}) {
  if (rows === 0) return <div className="a-table-card">{empty}</div>;
  const toggles = columns.filter((column) => column.col);
  return (
    <div className="a-table-card">
      <div className="a-toolbar">
        <div className="a-toolbar__search"><div className="a-input-group"><Icon name="search" /><input className="a-input" type="search" placeholder={search} aria-label={search} data-table-search={id} /></div></div>
        {filters.length > 0 && (
          <>
            <button type="button" className="a-btn a-btn--outline" data-popover-trigger="" data-align="start" aria-expanded="false" aria-controls={`${id}-filter`}><Icon name="filter" />Filter</button>
            <div className="a-popover" id={`${id}-filter`} role="dialog" aria-label="Filters" hidden>
              <div className="a-choice-list">
                {filters.map((filter, index) => (
                  <div className="a-choice-list" key={filter.key}>
                    {index > 0 && <hr className="a-separator" />}
                    {filter.options.map(([value, text]) => (
                      <label className="a-check" key={value}><input className="a-check__input" type="checkbox" id={`${id}-f-${value}`} data-table-filter={id} data-key={filter.key} value={value} data-label={text} /><span className="a-check__label">{text}</span></label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="a-segmented" role="group" aria-label="Row density" data-toggle-group="single" data-density-for={id}>
          <button type="button" className="a-toggle" data-density="comfortable" aria-pressed="true">Comfortable</button>
          <button type="button" className="a-toggle" data-density="compact" aria-pressed="false">Compact</button>
        </div>
        {toggles.length > 0 && (
          <>
            <button type="button" className="a-btn a-btn--outline" data-menu-trigger="" aria-haspopup="menu" aria-expanded="false" aria-controls={`${id}-cols`} data-align="end"><Icon name="settings" />Columns</button>
            <div className="a-menu" id={`${id}-cols`} role="menu" aria-label="Visible columns" hidden>
              {toggles.map((column) => (
                <button type="button" className="a-menu__item" role="menuitemcheckbox" aria-checked="true" data-column-toggle={`${id}:${column.col}`} key={column.col}><span className="a-menu__check"><Icon name="check" /></span>{column.label}</button>
              ))}
            </div>
          </>
        )}
        {exportName && <a className="a-btn a-btn--outline" href={`/api/admin/export?table=${exportName}`}><Icon name="download" />Export</a>}
      </div>
      <div className="a-filter-chips" data-filter-chips={id} data-icons="close" />
      {select && exportName && (
        <div className="a-bulk-bar" data-bulk-for={id} hidden>
          <span data-bulk-count="">0 selected</span>
          <div className="a-bulk-bar__actions"><button type="button" className="a-btn a-btn--outline a-btn--sm" data-bulk-export={id} data-table={exportName}><Icon name="download" />Export</button></div>
        </div>
      )}
      <div className="a-table-scroll" data-scroll-area="" tabIndex={0} role="region" aria-label={search}>
        <table className="a-table a-table--stack" id={id} data-table="" data-page-size="10">
          <thead>
            <tr>
              {select && <th scope="col" className="a-table__check"><input className="a-check__input" type="checkbox" data-select-all="" aria-label="Select all visible rows" /></th>}
              {columns.map((column) => (
                <th scope="col" className={column.num ? "a-table__num" : column.sticky ? "a-table__sticky" : undefined} data-col={column.col} data-type={column.num ? "number" : undefined} key={column.label}>
                  {column.noSort ? column.label : <button type="button" className="a-sort">{column.label}<Icon name="chevron-up" /></button>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
            <tr className="a-table__state" data-empty="" hidden>
              <td colSpan={columns.length + (select ? 1 : 0)}><Empty title={noMatch} text="Try a different search or clear the filters." /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="a-pagination a-table-card__foot" aria-label="Table pages" data-pagination-for={id} data-icons="chevron-left chevron-right" />
    </div>
  );
}

export function PageHeader({ title, crumbs = [], actions, description, status }: { title: string; crumbs?: [string, string][]; actions?: ReactNode; description?: ReactNode; status?: ReactNode }) {
  return (
    <header className="a-page-header">
      <nav className="a-breadcrumb" aria-label="Breadcrumb">
        <ol>
          {crumbs.map(([text, href]) => <li key={href}><a href={href}>{text}</a></li>)}
          <li><span aria-current="page">{title}</span></li>
        </ol>
      </nav>
      <div className="a-page-header__row">
        <div className="a-page-header__title"><h1>{title}</h1>{status}</div>
        <div className="a-page-header__actions">{actions}</div>
      </div>
      {description && <p className="a-page-header__description">{description}</p>}
    </header>
  );
}

const START: [string, string][] = [["Dashboard", "/admin/dashboard"]];
export const crumbsFromDashboard = START;

/** Sidebar, top bar, notifications and search palette around a page. */
export async function AdminShell({ user, active, children, streamed }: { user: AdminUser & { notifications_seen_at?: Date }; active: string; children: ReactNode; streamed?: boolean }) {
  const [notifications, drafts, demo, clients] = await Promise.all([
    recentNotifications(user.notifications_seen_at ?? new Date()),
    one<{ n: number }>("select count(*)::int as n from registrations where status in ('review', 'pending', 'failed')"),
    one<{ n: number }>("select count(*)::int as n from registrations where is_demo"),
    many("select id, business_name, first_name, last_name from registrations order by created_at desc limit 40"),
  ]);
  const unread = notifications.filter((item) => item.unread).length;
  const back = `/admin/${active}`;

  return (
    <div className="a-admin" data-admin="">
      <a className="a-skip-link" href="#main">Skip to content</a>
      <aside className="a-admin-sidebar" id="admin-sidebar" data-admin-sidebar="" aria-label="Admin">
        <div className="a-admin-sidebar__brand">
          <a href="/admin/dashboard" className="a-admin-sidebar__logo">
            <img className="a-admin-sidebar__mark" src="/assets/img/logo-mark.svg" width={28} height={28} alt="" />
            <span className="a-admin-sidebar__name">Anoglobe <span className="a-muted">Admin</span></span>
          </a>
        </div>
        <nav className="a-admin-nav" aria-label="Admin sections" data-scroll-area="">
          {NAV.map((group) => {
            const items = group.items.filter(([, , , manageOnly]) => !manageOnly || canManage(user));
            if (items.length === 0) return null;
            return (
              <div className="a-admin-nav__group" key={group.label}>
                <p className="a-admin-nav__label">{group.label}</p>
                <ul role="list">
                  {items.map(([slug, icon, text]) => (
                    <li key={slug}>
                      <a className="a-admin-nav__link" href={`/admin/${slug}`} aria-current={active === slug ? "page" : undefined} data-tooltip={text} data-tooltip-side="right" data-tooltip-when="collapsed">
                        <Icon name={icon} /><span className="a-admin-nav__text">{text}</span>
                        {slug === "registrations" && Boolean(drafts?.n) && <span className="a-admin-nav__count">{drafts?.n}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="a-admin-sidebar__footer">
          <button type="button" className="a-admin-nav__link a-admin-sidebar__collapse" data-sidebar-collapse="" aria-pressed="false" aria-label="Collapse sidebar"><Icon name="chevron-left" /><span className="a-admin-nav__text">Collapse</span></button>
        </div>
      </aside>
      <div className="a-admin-scrim" data-sidebar-scrim="" hidden />
      <div className="a-admin__main">
        <header className="a-admin-topbar">
          <button type="button" className="a-btn a-btn--ghost a-btn--icon a-admin-topbar__menu" aria-controls="admin-sidebar" aria-expanded="false" aria-label="Open navigation" data-sidebar-open=""><Icon name="menu" /></button>
          <button type="button" className="a-admin-search" data-command-open=""><Icon name="search" /><span>Search clients and pages</span><kbd className="a-kbd">Ctrl K</kbd></button>
          <div className="a-admin-topbar__tools">
            <div className="a-popover-anchor">
              <button type="button" className="a-btn a-btn--ghost a-btn--icon a-notify-btn" aria-label={`Notifications, ${unread} unread`} aria-haspopup="dialog" aria-expanded="false" aria-controls="notifications" data-popover-trigger=""><Icon name="bell" />{unread > 0 && <span className="a-notify-btn__dot" />}</button>
              <div className="a-popover a-notifications" id="notifications" role="dialog" aria-label="Notifications" hidden>
                <div className="a-popover__header">
                  <p className="a-h4">Notifications</p>
                  <ActionForm action="notifications.read" back={back} className="a-btn a-btn--link a-btn--sm">Mark all read</ActionForm>
                </div>
                <ul role="list" className="a-notifications__list">
                  {notifications.length === 0 && <li className="a-notifications__item"><div><p>Nothing yet</p></div></li>}
                  {notifications.map((item, index) => (
                    <li className={item.unread ? "a-notifications__item is-unread" : "a-notifications__item"} key={index}><Icon name={item.icon} /><div><p>{item.event}</p><p className="a-xs a-muted">{dateTime(item.created_at)}</p></div></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="a-menu-anchor">
              <button type="button" className="a-user-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu" data-menu-trigger=""><span className="a-avatar a-avatar--sm" aria-hidden="true">{initials(user.name)}</span><span className="a-user-btn__name">{user.name}</span><Icon name="chevron-down" /></button>
              <div className="a-menu" id="user-menu" role="menu" aria-label="Account" hidden>
                <a className="a-menu__item" role="menuitem" href="/admin/profile"><Icon name="user" />Profile</a>
                {canManage(user) && <a className="a-menu__item" role="menuitem" href="/admin/settings"><Icon name="settings" />Settings</a>}
                <div className="a-menu__separator" role="separator" />
                <ActionForm action="signout" back="/admin/login" menu><Icon name="logout" />Sign out</ActionForm>
              </div>
            </div>
          </div>
        </header>
        <div className="a-toast-region" data-icons="check-circle x-circle info alert-triangle close" />
        <main id="main" className="a-admin__content">
          {Boolean(demo?.n) && <div className="a-alert a-alert--warning" role="note"><Icon name="info" /><p className="a-alert__title">Demo data is loaded</p><p className="a-alert__body">{demo?.n} sample clients are mixed in. Run <code>npm run demo:clear</code> to remove them.</p></div>}
          {children}
        </main>
      </div>
      <dialog className="a-dialog a-command" id="command-palette" aria-label="Command palette">
        <div className="a-command__search"><Icon name="search" /><input className="a-command__input" type="text" role="combobox" aria-expanded="true" aria-controls="command-list" aria-autocomplete="list" aria-label="Search pages and clients" placeholder="Search pages and clients" autoComplete="off" /></div>
        <ul className="a-listbox" data-scroll-area="" role="listbox" id="command-list" aria-label="Results">
          <li role="presentation">
            <p className="a-listbox__group-label" id="cmd-g0">Go to</p>
            <ul role="group" className="a-listbox__group" aria-labelledby="cmd-g0">
              {NAV.flatMap((group) => group.items).filter(([, , , manageOnly]) => !manageOnly || canManage(user)).map(([slug, icon, text]) => (
                <li role="option" className="a-option" id={`cmd-${slug}`} data-href={`/admin/${slug}`} aria-selected="false" key={slug}><Icon name={icon} />{text}</li>
              ))}
            </ul>
          </li>
          {clients.length > 0 && (
            <li role="presentation">
              <p className="a-listbox__group-label" id="cmd-g1">Clients</p>
              <ul role="group" className="a-listbox__group" aria-labelledby="cmd-g1">
                {clients.map((client) => (
                  <li role="option" className="a-option" id={`cmd-c${client.id}`} data-href={`/admin/registrations/${client.id}`} aria-selected="false" key={client.id}><Icon name="building" />{client.business_name || `${client.first_name} ${client.last_name}`}</li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      </dialog>
      {/* A page with Suspense places DesignJs inside the boundary, so the scripts run after its content arrives. */}
      {!streamed && <DesignJs />}
    </div>
  );
}
