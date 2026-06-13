"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

const noopSubscribe = () => () => {};
// false during SSR, true on the client — without setState-in-effect cascades.
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
};

const WIDTHS = {
  sm: "max-w-[448px]",
  md: "max-w-[512px]",
  lg: "max-w-[672px]",
  xl: "max-w-[896px]",
};

export function Modal({ open, onClose, title, children, footer, width = "md" }: ModalProps) {
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 w-full ${WIDTHS[width]} max-h-[90vh] flex flex-col overflow-hidden`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/50">
            <h2 className="font-title-lg text-title-lg text-on-surface">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-outline-variant/50 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
