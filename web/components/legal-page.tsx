import type { ReactNode } from "react";

export function LegalPage({ title, toc, children }: { title: string; toc: [id: string, label: string][]; children: ReactNode }) {
  return (
    <main id="main" className="v2-wrap v2-legal">
      <div className="a-page-intro">
        <p className="a-eyebrow">Legal</p>
        <h1>{title}</h1>
        <p className="a-muted">Last updated October 27, 2026. Sample text for layout review, pending review by Anoglobe’s lawyer.</p>
      </div>
      <div className="a-legal-layout">
        <nav className="a-toc" aria-label="On this page" data-toc="">
          <p className="a-eyebrow">On this page</p>
          <ol role="list">
            {toc.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ol>
        </nav>
        <article className="a-prose">{children}</article>
      </div>
    </main>
  );
}
