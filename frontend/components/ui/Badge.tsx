import type { ReactNode } from "react";

type Tone = "primary" | "secondary" | "tertiary" | "success" | "warning" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary:   "bg-primary-fixed text-on-primary-fixed-variant",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary:  "bg-tertiary-fixed text-tertiary",
  success:   "bg-[#d3ecdc] text-[#1e6b3f]",
  warning:   "bg-[#fdedc8] text-[#8a5a00]",
  error:     "bg-error-container text-on-error-container",
  neutral:   "bg-surface-container-high text-on-surface-variant",
};

type BadgeProps = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
