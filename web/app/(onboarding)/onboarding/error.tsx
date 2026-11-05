"use client";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="a-onb a-onb--single">
      <div className="a-onb__main"><div className="a-onb__card"><div className="a-result">
        <p className="a-state__code">ERROR 500</p>
        <h1 className="a-result__title">Something went wrong on our side</h1>
        <p className="a-result__text">Nothing you did caused this. Your answers are safe. Try again in a minute.</p>
        <button type="button" className="a-btn a-btn--primary" onClick={reset}>Try again</button>
      </div></div></div>
    </main>
  );
}
