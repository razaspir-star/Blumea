"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

type ModalProps = {
  kicker: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

const CLOSE_MS = 200;

export default function Modal({ kicker, title, description, onClose, children }: ModalProps) {
  const t = useT();
  const [closing, setClosing] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Closing plays a short fade-out first, so the window does not just vanish.
  const requestClose = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  // When the content changes (a next step, a loaded list) the window grows or shrinks
  // smoothly instead of snapping to the new size.
  useEffect(() => {
    const content = contentRef.current;
    const scroller = scrollRef.current;
    if (!content || !scroller) return;
    const measure = () => setHeight(Math.min(scroller.scrollHeight, window.innerHeight * 0.92));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      className={`${closing ? "blumea-modal-backdrop-out" : "blumea-modal-backdrop"} fixed inset-0 z-[100] flex items-center justify-center bg-blumea-navy/20 p-4 backdrop-blur-[2px] sm:p-6`}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={height === null ? undefined : { height }}
        className={`${closing ? "blumea-modal-out" : "blumea-modal"} max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
      >
        <div ref={scrollRef} className="max-h-[92vh] overflow-y-auto p-5 sm:p-7">
          <div ref={contentRef}>
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
                onClick={requestClose}
                aria-label={t("modalCommon.close")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-blumea-slate transition-colors hover:bg-blumea-mist hover:text-blumea-navy"
              >
                ×
              </button>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
