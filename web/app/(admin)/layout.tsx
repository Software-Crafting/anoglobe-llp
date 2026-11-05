import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHtml } from "@/components/app-html";

export const metadata: Metadata = {
  title: { default: "Anoglobe Admin", template: "%s | Anoglobe Admin" },
  icons: { icon: { url: "/assets/img/favicon.svg", type: "image/svg+xml" } },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppHtml>{children}</AppHtml>;
}
