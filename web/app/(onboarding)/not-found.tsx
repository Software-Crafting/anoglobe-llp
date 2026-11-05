import { StatePage } from "@/components/state-page";

export const metadata = { title: "Page not found" };

export default function OnboardingNotFound() {
  return <StatePage code="ERROR 404" title="We cannot find that page" text="The link may be old or mistyped. Your signup progress is saved if you were in the middle of onboarding." actions={<><a className="a-btn a-btn--primary" href="/">Go to home</a><a className="a-btn a-btn--outline" href="/onboarding/resume">Resume signup</a></>} />;
}
