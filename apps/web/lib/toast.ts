export type ToastVariant = "success" | "error";

type ToastPayload = {
  message: string;
  variant?: ToastVariant;
};

export function showToast(message: string, variant: ToastVariant = "success") {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ToastPayload>("matgo-toast", {
      detail: { message, variant },
    }),
  );
}
