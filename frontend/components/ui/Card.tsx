import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  hoverable?: boolean;
};

export function Card({ children, hoverable = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${hoverable ? "hover:-translate-y-[2px] transition-transform duration-200 cursor-pointer" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
