"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";

type NavItem = { label: string; href: string; icon: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Boards", href: "/boards", icon: "dashboard" },
  { label: "Calendar", href: "/calendar", icon: "calendar_today" },
  { label: "Announcements", href: "/announcements", icon: "campaign" },
];

const ORG_ITEMS: NavItem[] = [
  { label: "Teams", href: "/teams", icon: "groups" },
  { label: "Permissions", href: "/permissions", icon: "lock_person" },
  { label: "Users", href: "/users", icon: "person_search" },
];

function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = isActiveHref(pathname, item.href);
  return (
    <li>
      <Link
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-150 border-l-4 -ml-1 pl-[8px] ${
          isActive
            ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold border-primary"
            : "text-on-surface-variant hover:bg-surface-container-low border-transparent"
        }`}
      >
        <Icon name={item.icon} filled={isActive} />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

type SidebarProps = {
  workspaceName: string;
  user: { display_name: string; username: string };
};

export function Sidebar({ workspaceName, user }: SidebarProps) {
  const pathname = usePathname();
  const initials = workspaceName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <nav className="hidden md:flex flex-col bg-surface-container-lowest border-r border-outline-variant fixed left-0 top-0 h-full w-sidebar-width z-50">
      <div className="flex flex-col h-full py-6 px-4">
        <div className="flex items-center gap-2 mb-6 px-2">
          <Icon name="flowsheet" className="text-primary text-[28px]" filled />
          <h1 className="font-display text-headline-md font-bold text-primary">FlowBoard</h1>
        </div>

        <div className="mb-6 px-2">
          <div className="w-full flex items-center justify-between bg-surface-container-low border border-outline-variant/60 rounded-lg p-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-primary-fixed text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                {initials}
              </div>
              <span className="font-label-md text-on-surface truncate">{workspaceName}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
          <div className="my-4 border-t border-outline-variant/50" />
          <ul className="space-y-1">
            {ORG_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-3 w-full p-2 rounded-lg">
            <Avatar person={{ id: user.username, display_name: user.display_name }} size="sm" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-label-sm text-label-sm text-on-surface truncate">{user.display_name}</p>
              <p className="text-[11px] text-on-surface-variant truncate">@{user.username}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
