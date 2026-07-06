"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "../ui/Icon";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notification-actions";
import { setActiveTeamAction, setDefaultTeamAction } from "@/lib/active-team";
import { setActiveWorkspaceAction } from "@/lib/active-workspace";
import { parseScopedPath } from "@/lib/dashboard-path";
import { useShell } from "./ShellContext";

type Team = { id: string; name: string; workspace: { id: string } | null };
type Notification = { id: string; message: string; link: string | null; is_read: boolean; created_at: string };

type SearchBoard = { id: string; name: string; status: string };
type SearchTask = { id: string; name: string; list: { board: { id: string } } };
type SearchTeam = { id: string; name: string };
type SearchResults = { boards: SearchBoard[]; tasks: SearchTask[]; teams: SearchTeam[] };

type TopHeaderProps = {
  teams?: Team[];
  notifications?: Notification[];
  activeTeamId?: string;
  defaultTeamId?: string;
  currentWorkspaceId?: string;
};

const WORKSPACE_PATHS = ["/teams", "/users", "/workspace"];

function isWorkspacePath(pathname: string) {
  return WORKSPACE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function TopHeader({ teams = [], notifications: initialNotifications = [], activeTeamId, defaultTeamId, currentWorkspaceId }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setMobileNavOpen } = useShell();
  const [teamOpen, setTeamOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scoped = parseScopedPath(pathname);

  // Only offer teams from the current workspace — taken from the URL when on
  // a workspace/team-scoped page, otherwise the user's active workspace.
  const effectiveWorkspaceId = scoped?.workspaceId ?? currentWorkspaceId;
  const visibleTeams = teams.filter((t) => t.workspace?.id === effectiveWorkspaceId);

  const activeTeam = visibleTeams.find((t) => t.id === (scoped?.teamId ?? activeTeamId)) ?? visibleTeams[0];
  const unread = notifications.filter((n) => !n.is_read).length;

  const showTeamSwitcher = visibleTeams.length > 0 && !isWorkspacePath(pathname);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResults = await res.json();
        setSearchResults({
          boards: (data.boards ?? []).slice(0, 5),
          tasks: (data.tasks ?? []).slice(0, 5),
          teams: (data.teams ?? []).slice(0, 5),
        });
        setSearchOpen(true);
      }
    } catch {
      // silently ignore search errors
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) runSearch(q);
  }

  function handleResultClick() {
    setSearchOpen(false);
    setQuery("");
    setSearchResults(null);
  }

  function handleSelectTeam(team: Team) {
    setTeamOpen(false);
    startTransition(async () => {
      await setActiveTeamAction(team.id);
      if (team.workspace) await setActiveWorkspaceAction(team.workspace.id);

      if (scoped && team.workspace) {
        // Switching teams is a real navigation into the same section under the
        // new workspace/team — which reliably reloads (router.refresh() doesn't).
        router.push(`/${team.workspace.id}/${team.id}${scoped.rest}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleSetDefaultTeam(teamId: string, isDefault: boolean) {
    startTransition(async () => {
      await setDefaultTeamAction(isDefault ? "" : teamId);
      router.refresh();
    });
  }

  function handleMarkRead(notificationId: string) {
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n));
    startTransition(async () => {
      await markNotificationReadAction(notificationId);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <header className="bg-surface-bright flex justify-between items-center gap-4 w-full h-16 px-8 sticky top-0 z-40 border-b border-outline-variant/30">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
        className="md:hidden text-on-surface p-2 hover:bg-surface-container-high rounded-full"
      >
        <Icon name="menu" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-[672px] hidden md:flex items-center">
        <div className="relative w-full" ref={searchContainerRef}>
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] z-10" />
          {searchLoading && (
            <Icon name="progress_activity" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] animate-spin z-10" />
          )}
          <input
            value={query}
            onChange={handleQueryChange}
            onFocus={() => { if (searchResults) setSearchOpen(true); }}
            placeholder="Search boards, tasks, teams..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest text-label-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />

          {/* Search results dropdown */}
          {searchOpen && searchResults && (
            <div className="absolute left-0 top-full mt-2 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden">
              {searchResults.boards.length === 0 && searchResults.tasks.length === 0 && searchResults.teams.length === 0 ? (
                <p className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">
                  No results for &apos;{query}&apos;
                </p>
              ) : (
                <>
                  {searchResults.boards.length > 0 && (
                    <div>
                      <p className="px-4 py-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px] border-b border-outline-variant/50">
                        Boards
                      </p>
                      {searchResults.boards.map((board) => (
                        <Link
                          key={board.id}
                          href={`/boards/${board.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors"
                        >
                          <Icon name="dashboard" className="text-[16px] text-on-surface-variant shrink-0" />
                          <span className="font-label-md text-label-md text-on-surface truncate">{board.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.teams.length > 0 && (
                    <div className={searchResults.boards.length > 0 ? "border-t border-outline-variant/50" : ""}>
                      <p className="px-4 py-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px] border-b border-outline-variant/50">
                        Teams
                      </p>
                      {searchResults.teams.map((team) => (
                        <Link
                          key={team.id}
                          href={`/teams/${team.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors"
                        >
                          <Icon name="groups" className="text-[16px] text-on-surface-variant shrink-0" />
                          <span className="font-label-md text-label-md text-on-surface truncate">{team.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.tasks.length > 0 && (
                    <div className={searchResults.boards.length > 0 || searchResults.teams.length > 0 ? "border-t border-outline-variant/50" : ""}>
                      <p className="px-4 py-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px] border-b border-outline-variant/50">
                        Tasks
                      </p>
                      {searchResults.tasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/boards/${task.list.board.id}/tasks/${task.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors"
                        >
                          <Icon name="task_alt" className="text-[16px] text-on-surface-variant shrink-0" />
                          <span className="font-label-md text-label-md text-on-surface truncate">{task.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </form>

      <div className="flex items-center gap-3">

        {/* Team selector — hidden on workspace-scoped pages */}
        {showTeamSwitcher && (
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => { setTeamOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-colors"
            >
              {activeTeam?.name ?? "Teams"}
              <Icon name="expand_more" className="text-lg" />
            </button>

            {teamOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10" onClick={() => setTeamOpen(false)} aria-label="Close" />
                <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden">
                  <p className="px-4 py-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/50 text-[10px]">
                    Your Teams
                  </p>
                  {visibleTeams.map((team) => {
                    const isDefault = team.id === defaultTeamId;
                    return (
                      <div key={team.id} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleSelectTeam(team)}
                          className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors font-label-md text-label-md text-on-surface text-left"
                        >
                          <div className="w-6 h-6 rounded bg-primary-fixed flex items-center justify-center text-[10px] font-bold text-on-primary-fixed-variant shrink-0">
                            {team.name[0]}
                          </div>
                          <span className="flex-1 truncate">{team.name}</span>
                          {team.id === activeTeam?.id && (
                            <Icon name="check" className="text-primary text-[16px] shrink-0" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDefaultTeam(team.id, isDefault)}
                          disabled={isPending}
                          className={`px-3 py-3 shrink-0 transition-colors ${isDefault ? "text-tertiary-container" : "text-outline hover:text-on-surface"}`}
                          title={isDefault ? "Remove as default team" : "Set as default team"}
                          aria-label={isDefault ? "Remove as default team" : "Set as default team"}
                        >
                          <Icon name={isDefault ? "star" : "star_border"} filled={isDefault} className="text-[16px]" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="border-t border-outline-variant/50">
                    <Link
                      href="/teams"
                      onClick={() => setTeamOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors font-label-sm text-label-sm text-primary"
                    >
                      <Icon name="add" className="text-[16px]" />
                      Manage Teams
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setNotifOpen((v) => !v); setTeamOpen(false); }}
            className="relative text-on-surface-variant hover:bg-surface-container-high rounded-full p-2 transition-colors"
            aria-label="Notifications"
          >
            <Icon name="notifications" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
            )}
          </button>

          {notifOpen && (
            <>
              <button type="button" className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} aria-label="Close" />
              <div className="absolute right-0 top-full mt-1 z-20 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[480px]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/50 shrink-0">
                  <h3 className="font-title-lg text-title-lg text-on-surface">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <span className="font-label-sm text-label-sm text-primary">{unread} new</span>
                    )}
                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                        title="Mark all as read"
                      >
                        <Icon name="done_all" className="text-[18px]" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center font-body-md text-body-md text-on-surface-variant">
                      No notifications
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/30 last:border-0 group ${!n.is_read ? "bg-primary-fixed/20" : ""}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-primary" : "bg-outline-variant"}`} />
                        <div className="flex-1 min-w-0">
                          {n.link ? (
                            <Link
                              href={n.link}
                              onClick={() => { setNotifOpen(false); if (!n.is_read) handleMarkRead(n.id); }}
                              className="font-body-md text-body-md text-on-surface hover:text-primary transition-colors"
                            >
                              {n.message}
                            </Link>
                          ) : (
                            <p className="font-body-md text-body-md text-on-surface">{n.message}</p>
                          )}
                          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                            {formatRelative(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            disabled={isPending}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary p-1 rounded transition-all shrink-0 disabled:opacity-50"
                            title="Mark as read"
                          >
                            <Icon name="check_circle" className="text-[16px]" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-outline-variant/50 shrink-0">
                  <Link
                    href="/activity"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-surface-container-low transition-colors font-label-sm text-label-sm text-primary"
                  >
                    View all activity
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Activity / History */}
        <Link
          href="/activity"
          className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-2 transition-colors"
          aria-label="Recent activity"
          title="Recent activity"
        >
          <Icon name="history" />
        </Link>
      </div>
    </header>
  );
}
