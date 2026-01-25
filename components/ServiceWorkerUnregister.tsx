"use client";

import { useEffect } from "react";

export default function ServiceWorkerUnregister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        })
        .catch((error) => {
          console.error("Error unregistering service workers:", error);
        });
    }
  }, []);

  return null;
}

