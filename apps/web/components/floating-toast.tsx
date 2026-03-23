"use client";

import { useEffect, useState } from "react";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

export function FloatingToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<{ message: string; variant?: "success" | "error" }>;
      const message = customEvent.detail?.message?.trim();
      if (!message) {
        return;
      }
      setToast({
        id: Date.now(),
        message,
        variant: customEvent.detail?.variant ?? "success",
      });
    }

    window.addEventListener("matgo-toast", handleToast as EventListener);
    return () => window.removeEventListener("matgo-toast", handleToast as EventListener);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="floating-toast-layer" aria-live="polite">
      <div className={`floating-toast floating-toast-${toast.variant}`} key={toast.id} role="status">
        {toast.message}
      </div>
    </div>
  );
}
