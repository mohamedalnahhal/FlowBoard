import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClasses =
  "w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

function FieldWrapper({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>}
      {children}
      {hint && <span className="font-body-md text-[12px] text-on-surface-variant">{hint}</span>}
    </label>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string };

export function TextField({ label, hint, className = "", ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <input className={`${fieldClasses} ${className}`} {...rest} />
    </FieldWrapper>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string };

export function Textarea({ label, hint, className = "", ...rest }: TextareaProps) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <textarea className={`${fieldClasses} resize-none min-h-[96px] ${className}`} {...rest} />
    </FieldWrapper>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string };

export function Select({ label, hint, className = "", children, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <select className={`${fieldClasses} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}
