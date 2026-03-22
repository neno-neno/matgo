"use client";

import { ReactNode, useEffect } from "react";

type ActionModalProps = {
  title: string;
  subtitle?: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ActionModal({ title, subtitle, description, open, onClose, children }: ActionModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay" role="dialog">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="glass modal-card">
        <div className="modal-header">
          <div className="section-title">
            {subtitle ? <span>{subtitle}</span> : null}
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button aria-label="Fechar janela" className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
