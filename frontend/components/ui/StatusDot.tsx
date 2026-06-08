type Tone = "primary" | "secondary" | "tertiary" | "success" | "warning" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary:   "bg-primary",
  secondary: "bg-secondary",
  tertiary:  "bg-tertiary",
  success:   "bg-[#2f9e5b]",
  warning:   "bg-[#caa011]",
  error:     "bg-error",
  neutral:   "bg-outline",
};

export function StatusDot({ tone = "neutral", className = "" }: { tone?: Tone; className?: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${toneClasses[tone]} ${className}`} />;
}
