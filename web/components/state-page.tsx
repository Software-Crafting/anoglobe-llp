import type { ReactNode } from "react";

/** The design system's full-page state: 404, 500, 403, maintenance, session expired. */
export function StatePage({ code, title, text, illus = "illus-empty-search", home = "/", actions }: { code: string; title: string; text: ReactNode; illus?: string; home?: string; actions: ReactNode }) {
  return (
    <>
      <a className="a-skip-link" href="#main">Skip to content</a>
      <div className="a-state">
        <header className="a-state__header"><a href={home}><img className="a-logo" src="/assets/img/logo.svg" width={223} height={28} alt="Anoglobe Bookkeeping home" /></a></header>
        <main id="main" className="a-state__main">
          <div className="a-state__body">
            <svg className="a-illus" aria-hidden="true"><use href={`#${illus}`} /></svg>
            <p className="a-state__code">{code}</p>
            <h1>{title}</h1>
            <p>{text}</p>
            <div className="a-btn-row">{actions}</div>
          </div>
        </main>
        <footer className="a-state__footer">Need help? <a href="mailto:hello@anoglobebookkeeping.com">hello@anoglobebookkeeping.com</a></footer>
      </div>
    </>
  );
}
