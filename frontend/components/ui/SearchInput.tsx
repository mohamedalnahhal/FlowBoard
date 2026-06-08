"use client";

import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className = "", ...rest }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl" />
      <input
        type="text"
        className="w-full text-sm pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        {...rest}
      />
    </div>
  );
}
