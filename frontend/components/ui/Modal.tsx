"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
};

const WIDTHS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, footer, width = "md" }: ModalProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className={`relative bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 w-full ${WIDTHS[width]} max-h-[90vh] flex flex-col overflow-hidden`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/50">
            <h2 className="font-title-lg text-title-lg text-on-surface">{title}</h2>
            <button
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
    </div>
  );
}
