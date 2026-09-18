"use client";

import { useEffect } from "react";

/** Registers the small app-shell cache for installable browser deployments. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The app remains fully usable online if a browser blocks SW setup.
      });
    }
  }, []);

  return null;
}
