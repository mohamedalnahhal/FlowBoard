"use client";

import Link from "next/link";

type Tab = {
  key: string;
  label: string;
  href: string;
};

export function Tabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div className="flex items-center gap-1 border-b border-outline-variant/60">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-4 py-2.5 font-label-md text-label-md border-b-2 transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
