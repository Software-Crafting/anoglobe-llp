"use client";

import { useEffect } from "react";

const SCRIPTS = ["core", "forms", "overlays", "data", "payment", "admin", "feedback", "app"];

/**
 * Loads the design system's component scripts once React has hydrated, then fires the DOMContentLoaded they wait for.
 * They change the DOM (tables, listboxes, charts); doing it after hydration keeps React from seeing a mismatch.
 * Goes last in each page. These sections navigate with plain links and form posts, so every page load starts clean.
 */
export function DesignJs() {
  useEffect(() => {
    const flags = window as unknown as { designJsLoaded?: boolean };
    if (flags.designJsLoaded) return;
    flags.designJsLoaded = true;
    (async () => {
      for (const name of SCRIPTS) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `/assets/js/${name}.js`;
          script.onload = resolve;
          script.onerror = reject;
          document.body.append(script);
        });
      }
      document.dispatchEvent(new Event("DOMContentLoaded"));
    })();
  }, []);
  return null;
}
