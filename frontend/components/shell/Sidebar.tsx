"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useActionState, useSyncExternalStore } from "react";
import { Icon } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { createWorkspaceAction } from "@/lib/workspace-actions";
import { setActiveWorkspaceAction } from "@/lib/active-workspace";
import { parseScopedPath } from "@/lib/dashboard-path";

type Board = { id: string; name: string; status: string };
type Team = { id: string; name: string; boards?: Board[] };
type Workspace = { id: string; name: string };

const NAV_ITEMS = [
  { label: "Boards", section: "boards", icon: "dashboard" },
  { label: "Calendar", section: "calendar", icon: "calendar_today" },
  { label: "Announcements", section: "announcements", icon: "campaign" },
];

const WORKSPACE_ITEMS = [
  { label: "Teams", href: "/teams", icon: "groups" },
  { label: "Users", href: "/users", icon: "person_search" },
  { label: "Workspace Permissions", href: "/workspace/permissions", icon: "admin_panel_settings" },
  { label: "Workspace Settings", href: "/workspace/settings", icon: "tune" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Board detail pages stay at the global /boards/[boardId] path.
function onBoardDetail(pathname: string) {
  return pathname === "/boards" || pathname.startsWith("/boards/");
}

const noopSubscribe = () => () => {};
// Reads the persisted collapsed flag after hydration (false during SSR)
// without a setState-in-effect cascade.
function useStoredCollapsed() {
  return useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem("sidebar_collapsed") === "true",
    () => false,
  );
}

type SidebarProps = {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  teams: Team[];
  user: { id: string; display_name: string; username: string; role: number };
  dashboardHref: string;
  activeTeamId?: string;
  scope?: { workspaceId: string; teamId: string };
};

export function Sidebar({ workspaces, currentWorkspaceId, teams, user, dashboardHref, activeTeamId, scope }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [wsOpen, setWsOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [expandedBoards, setExpandedBoards] = useState(false);

  // Persisted value (post-hydration) unless the user toggled it this session.
  const storedCollapsed = useStoredCollapsed();
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? storedCollapsed;
  const setCollapsed = (update: (prev: boolean) => boolean) => setCollapsedOverride(update(collapsed));

  const [createWsState, createWsFormAction, createWsPending] = useActionState(createWorkspaceAction, undefined);
  const createWsFormRef = useRef<HTMLFormElement>(null);
  const wasCreatingWsRef = useRef(false);

  // Sync collapsed state to CSS variable and localStorage
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "4rem" : ""
    );
  }, [collapsed]);

  // Auto-close create workspace form on success
  useEffect(() => {
    if (createWsPending) { wasCreatingWsRef.current = true; return; }
    if (wasCreatingWsRef.current && !createWsState?.error) {
      wasCreatingWsRef.current = false;
      createWsFormRef.current?.reset();
      setCreateWsOpen(false);
      setWsOpen(false);
      router.refresh();
    }
  }, [createWsPending, createWsState, router]);

  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  const initials = currentWs?.name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join("") ?? "W";

  // The workspace/team scope drives every section link. It comes from the URL
  // when on a scoped page, otherwise from the user's active workspace + team.
  const urlScope = parseScopedPath(pathname);
  const scopeWs = urlScope?.workspaceId ?? scope?.workspaceId;
  const scopeTeam = urlScope?.teamId ?? scope?.teamId;
  const onDashboard = urlScope?.section === "dashboard";

  const sectionHref = (section: string) =>
    scopeWs && scopeTeam ? `/${scopeWs}/${scopeTeam}/${section}` : "/teams";

  // Only show boards for the current team — taken from the URL when on a
  // workspace/team-scoped page, otherwise the user's active team.
  const activeTeamForBoards = teams.find((t) => t.id === (urlScope?.teamId ?? activeTeamId));
  const allBoards = activeTeamForBoards?.boards ?? [];

  const isWorkspaceAdmin = user.role <= 2;

  return (
    <nav
      className={`hidden md:flex flex-col bg-surface-container-lowest border-r border-outline-variant fixed left-0 top-0 h-full z-50 transition-[width] duration-200 overflow-hidden ${collapsed ? "w-16" : "w-sidebar-width"}`}
    >
      <div className="flex flex-col h-full py-6 overflow-hidden">
        {/* Logo + collapse toggle */}
        <div className={`flex items-center mb-6 shrink-0 ${collapsed ? "justify-center px-0" : "justify-between px-6"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Icon name="flowsheet" className="text-primary text-[28px]" filled />
              <h1 className="font-display text-headline-md font-bold text-primary">FlowBoard</h1>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={collapsed ? "menu" : "menu_open"} className="text-[22px]" />
          </button>
        </div>

        {/* Workspace switcher */}
        <div className={`mb-4 relative shrink-0 ${collapsed ? "px-2" : "px-4"}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setWsOpen((v) => !v)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-surface-container-low transition-colors border border-outline-variant bg-surface-bright shadow-sm"
              title={currentWs?.name ?? "Workspace"}
            >
              <div className="w-8 h-8 rounded bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setWsOpen((v) => !v)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors border border-outline-variant bg-surface-bright shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {initials}
                </div>
                <div className="text-left">
                  <p className="font-label-md text-label-md text-on-surface font-semibold truncate max-w-[110px]">
                    {currentWs?.name ?? "Workspace"}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">Workspace</p>
                </div>
              </div>
              <Icon name="unfold_more" className="text-outline text-sm group-hover:text-on-surface transition-colors" />
            </button>
          )}

          {wsOpen && (
            <>
              <button type="button" className="fixed inset-0 z-10" onClick={() => setWsOpen(false)} aria-label="Close" />
              <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden">
                <p className="px-3 py-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/50 text-[10px]">
                  Workspaces
                </p>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={async () => {
                      setWsOpen(false);
                      await setActiveWorkspaceAction(ws.id);
                      router.push("/");
                      router.refresh();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors font-label-md text-label-md text-on-surface text-left ${ws.id === currentWs?.id ? "bg-primary-fixed/10" : ""}`}
                  >
                    <div className="w-6 h-6 rounded bg-primary-fixed flex items-center justify-center font-bold text-[10px] text-on-primary-fixed-variant shrink-0">
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <span className="truncate">{ws.name}</span>
                    {ws.id === currentWs?.id && <Icon name="check" className="ml-auto text-primary text-[16px] shrink-0" />}
                  </button>
                ))}
                <div className="border-t border-outline-variant/50">
                  <button
                    type="button"
                    onClick={() => setCreateWsOpen((v) => !v)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low transition-colors text-left"
                  >
                    <Icon name="add" className="text-[16px]" />
                    New Workspace
                  </button>
                  {createWsOpen && (
                    <form
                      ref={createWsFormRef}
                      action={createWsFormAction}
                      className="px-3 pb-3 flex flex-col gap-2"
                    >
                      <input
                        name="name"
                        autoFocus
                        placeholder="Workspace name…"
                        required
                        className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded-md font-body-md text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      {createWsState?.error && (
                        <p className="text-error font-body-md text-[11px]">{createWsState.error}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={createWsPending}
                          className="flex-1 px-3 py-1.5 bg-primary text-on-primary rounded-md font-label-sm text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {createWsPending ? "Creating…" : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateWsOpen(false)}
                          className="px-3 py-1.5 border border-outline-variant rounded-md font-label-sm text-[12px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <div className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-4"}`}>
          <ul className="space-y-1">
            <li>
              <Link
                href={dashboardHref}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-150 ${onDashboard ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"} ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? "Home" : undefined}
              >
                <Icon name="home" filled={onDashboard} />
                {!collapsed && <span>Home</span>}
              </Link>
            </li>
            {NAV_ITEMS.map((item) => {
              const href = sectionHref(item.section);
              const active =
                urlScope?.section === item.section ||
                (item.section === "boards" && onBoardDetail(pathname));
              if (item.section === "boards") {
                return (
                  <li key={item.section}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={href}
                        className={`flex-1 flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-150 ${active ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"} ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon name={item.icon} filled={active} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                      {!collapsed && allBoards.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedBoards((v) => !v)}
                          className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          aria-label="Toggle boards"
                        >
                          <Icon name={expandedBoards ? "expand_less" : "expand_more"} className="text-[18px]" />
                        </button>
                      )}
                    </div>
                    {!collapsed && expandedBoards && allBoards.length > 0 && (
                      <ul className="ml-6 mt-1 space-y-0.5 border-l border-outline-variant/40 pl-3">
                        {allBoards.map((board) => {
                          const boardActive = pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`);
                          return (
                            <li key={board.id}>
                              <Link
                                href={`/boards/${board.id}`}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md font-label-sm text-label-sm transition-colors truncate ${boardActive ? "bg-primary-fixed/60 text-on-primary-fixed-variant font-semibold" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                              >
                                <Icon name="table_view" className="text-[14px] shrink-0" />
                                <span className="truncate">{board.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }
              return (
                <li key={item.section}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-150 ${active ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"} ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} filled={active} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-outline-variant/50" />

          {/* Team Permissions — hidden from viewers (role >= 4) */}
          {user.role < 4 && (
            <ul className="space-y-1">
              <li>
                <Link
                  href={sectionHref("permissions")}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-150 ${urlScope?.section === "permissions" ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"} ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? "Team Permissions" : undefined}
                >
                  <Icon name="lock_person" filled={urlScope?.section === "permissions"} />
                  {!collapsed && <span>Team Permissions</span>}
                </Link>
              </li>
            </ul>
          )}

          {/* Workspace admin section */}
          {isWorkspaceAdmin && (
            <>
              <div className="my-4 border-t border-outline-variant/50" />
              {!collapsed && (
                <p className="px-3 mb-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Workspace
                </p>
              )}
              <ul className="space-y-1">
                {WORKSPACE_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors duration-150 ${active ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold" : "text-on-surface-variant hover:bg-surface-container-low"} ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon name={item.icon} filled={active} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* User footer */}
        <div className={`mt-auto pt-4 border-t border-outline-variant shrink-0 ${collapsed ? "px-2" : "px-4"}`}>
          <Link
            href="/profile"
            className={`flex items-center gap-3 w-full p-2 rounded-lg hover:bg-surface-container-low transition-colors group ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? user.display_name : undefined}
          >
            <Avatar person={{ id: user.id, display_name: user.display_name }} size="sm" />
            {!collapsed && (
              <>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-label-sm text-label-sm text-on-surface truncate">{user.display_name}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">@{user.username}</p>
                </div>
                <Icon name="settings" className="text-[18px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
