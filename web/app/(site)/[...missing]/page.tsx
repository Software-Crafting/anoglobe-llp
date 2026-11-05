import { notFound } from "next/navigation";

// With several root layouts Next needs this to send unknown URLs to the site's not-found page.
export default function Missing() {
  notFound();
}
