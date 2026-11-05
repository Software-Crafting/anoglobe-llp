"use client";

export default function SiteError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="v2-wrap v2-notfound">
      <p className="a-eyebrow">Error 500</p>
      <h1>Something went wrong on our side</h1>
      <p>Nothing you did caused this. Try again in a minute; if it keeps happening, email hello@anoglobebookkeeping.com.</p>
      <button type="button" className="a-btn a-btn--primary a-btn--lg" onClick={reset}>Try again</button>
    </main>
  );
}
