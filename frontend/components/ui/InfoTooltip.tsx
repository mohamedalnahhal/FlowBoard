import { Icon } from "./Icon";

type InfoTooltipProps = {
  /** The description shown on hover / focus. */
  text: string;
  /** Tailwind classes for the icon (size/color). */
  iconClassName?: string;
  className?: string;
};

// A small info symbol that reveals its description on hover or keyboard focus.
// Uses the native title tooltip so it is never clipped by scroll/overflow
// containers (e.g. the permissions table) and stays accessible without a portal.
export function InfoTooltip({ text, iconClassName = "text-[16px]", className = "" }: InfoTooltipProps) {
  return (
    <span
      tabIndex={0}
      role="img"
      title={text}
      aria-label={text}
      className={`inline-flex items-center justify-center text-on-surface-variant/70 hover:text-primary focus:text-primary cursor-help transition-colors outline-none ${className}`}
    >
      <Icon name="info" className={iconClassName} />
    </span>
  );
}
