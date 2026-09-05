"use client";

import { useEffect } from "react";
import { autoSyncSharedMemory } from "@/lib/shared-memory-sync";

export function PWARegistrar() {
  useEffect(() => {
    void autoSyncSharedMemory().catch((error) => {
      console.warn("[SharedMemory] Auto sync failed:", error);
    });

    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("[PWA] Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener("load", register, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
