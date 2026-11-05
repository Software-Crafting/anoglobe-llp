import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="v2-wrap v2-notfound">
      <p className="a-eyebrow">Error 404</p>
      <h1>We cannot find that page</h1>
      <p>The link may be old or mistyped.</p>
      <Link className="a-btn a-btn--primary a-btn--lg" href="/">Go to home<Icon name="arrow-right" /></Link>
    </main>
  );
}
