"use client";

import { useEffect } from "react";

type ModalProps = {
  kicker: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ kicker, title, description, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="blumea-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-blumea-navy/20 p-4 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="blumea-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blumea-blue">{kicker}</p>

            <h2 className="mt-1 text-2xl font-semibold text-blumea-navy">{title}</h2>

            {description && (
              <p className="mt-2 text-sm text-blumea-slate">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-blumea-slate transition-colors hover:bg-blumea-mist hover:text-blumea-navy"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
