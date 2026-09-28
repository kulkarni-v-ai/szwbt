"use client";

import { useEffect } from "react";

/**
 * Global Error & Promise Rejection Handler
 * Intercepts unhandled promise rejections and errors at the window level (capture phase)
 * before Next.js's dev overlay handler processes them.
 * Specifically prevents Next.js from crashing with "Runtime Error: [object Event]"
 * when DOM events (such as resource load failures, aborted fetches, or prefetch rejections)
 * reject promises with an Event instance instead of a standard Error.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;

      // Check if reason is an Event object or non-standard error
      const isEventReason =
        reason instanceof Event ||
        (reason &&
          typeof reason === "object" &&
          ("type" in reason || "isTrusted" in reason || reason.constructor?.name === "Event" || String(reason) === "[object Event]") &&
          !("message" in reason && typeof reason.message === "string" && reason.message.length > 0 && "stack" in reason));

      if (isEventReason) {
        // Prevent the dev overlay from crashing on benign DOM events
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("[GlobalErrorHandler] Caught and handled DOM Event rejection:", {
          type: (reason as any)?.type || "unknown",
          target: (reason as any)?.target,
          reason,
        });
      }
    };

    const handleError = (event: ErrorEvent) => {
      // If error event has no actual error object (e.g. <img> or <script> loading failure)
      if (!event.error && event.target && (event.target as HTMLElement).tagName) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("[GlobalErrorHandler] Caught resource load error from:", (event.target as HTMLElement).tagName);
      }
    };

    // Attach in capture phase so it runs before Next.js dev overlay listener
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);
    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
      window.removeEventListener("error", handleError, true);
    };
  }, []);

  return null;
}
