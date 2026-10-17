"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Tells the owner when something breaks in a creator's browser, so a bug does not wait to be reported.
// Sent at most 5 times per page load, so a loop of errors cannot flood the log.
export default function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    async function report(message: string) {
      if (sent >= 5) return;
      sent += 1;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ name: "client_error", message, path: window.location.pathname }),
      }).catch(() => undefined);
    }
    const onError = (event: ErrorEvent) => void report(event.message || "error");
    const onRejection = (event: PromiseRejectionEvent) => void report(String(event.reason?.message ?? event.reason ?? "rejection"));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
