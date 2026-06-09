"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { createUserAction, updateUserAction, removeUserFromWorkspaceAction } from "@/lib/user-actions";

type Team = { id: string; name: string };
type UserRow = {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  role: number;
  created_at: string;
  teams: Team[];
};
type Pagination = { page: number; page_size: number; total: number; total_pages: number };

const ROLE_LABELS: Record<number, string> = { 0: "Admin", 1: "Owner", 2: "Leader", 3: "Member" };
const ROLE_TONES: Record<number, string> = {
  0: "bg-tertiary-container/30 text-tertiary border border-tertiary/20",
  1: "bg-tertiary-container/30 text-tertiary border border-tertiary/20",
  2: "bg-secondary-container text-on-secondary-container border border-on-secondary-container/30",
  3: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildHref(params: { q?: string; role?: string; page?: number }) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.role && params.role !== "all") usp.set("role", params.role);
  if (params.page && params.page !== 1) usp.set("page", String(params.page));
  const qs = usp.toString();
  return qs ? `/users?${qs}` : "/users";
}

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createUserAction, undefined);

  if (state?.success) {
    return (
      <Modal open onClose={onClose} title="Invite User" width="md"
        footer={<Button onClick={() => { onClose(); router.refresh(); }}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-[#e6f4ea] flex items-center justify-center">
            <Icon name="check_circle" className="text-[32px] text-[#137333]" />
          </div>
          <p className="font-title-md text-title-md text-on-surface text-center">{state.success}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Invite New User" width="md"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button form="invite-user-form" type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create User"}
          </Button>
        </>
      }
    >
      <form id="invite-user-form" action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant">Full Name <span className="text-error">*</span></span>
            <input name="display_name" required placeholder="Jane Doe"
              className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant">Username <span className="text-error">*</span></span>
            <input name="username" required placeholder="janedoe"
              className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Email</span>
          <input name="email" type="email" placeholder="jane@company.com"
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Password <span className="text-error">*</span></span>
          <input name="password" type="password" required minLength={6} placeholder="Min. 6 characters"
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Role</span>
          <select name="role" defaultValue="3"
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
            <option value="3">Member</option>
            <option value="2">Leader</option>
            <option value="1">Owner</option>
            <option value="0">Admin</option>
          </select>
        </label>
        {state?.error && (
          <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px]" />{state.error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const router = useRouter();
  const boundAction = updateUserAction.bind(null, user.id);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  if (state?.success) {
    return (
      <Modal open onClose={onClose} title="Edit User" width="md"
        footer={<Button onClick={() => { onClose(); router.refresh(); }}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-[#e6f4ea] flex items-center justify-center">
            <Icon name="check_circle" className="text-[32px] text-[#137333]" />
          </div>
          <p className="font-title-md text-title-md text-on-surface text-center">{state.success}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${user.display_name}`} width="md"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button form="edit-user-form" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="edit-user-form" action={formAction} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg">
          <Avatar person={user} size="md" />
          <div>
            <p className="font-label-md text-label-md text-on-surface font-semibold">{user.display_name}</p>
            <p className="font-body-md text-on-surface-variant text-[12px]">@{user.username}</p>
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Display Name</span>
          <input name="display_name" defaultValue={user.display_name} required
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Email</span>
          <input name="email" type="email" defaultValue={user.email ?? ""}
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Role</span>
          <select name="role" defaultValue={user.role}
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
            <option value="3">Member</option>
            <option value="2">Leader</option>
            <option value="1">Owner</option>
            <option value="0">Admin</option>
          </select>
        </label>
        {state?.error && (
          <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px]" />{state.error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function UsersClient({
  users,
  pagination,
  q,
  role,
  page,
  workspaceId,
}: {
  users: UserRow[];
  pagination: Pagination;
  q: string;
  role: string;
  page: number;
  workspaceId: string;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [searchValue, setSearchValue] = useState(q);
  const [roleFilter, setRoleFilter] = useState(role);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [, startRemoveTransition] = useTransition();

  function handleRemoveUser(user: UserRow) {
    if (!window.confirm(`Remove ${user.display_name} from the workspace? They will lose access to all teams.`)) return;
    setRemovingUserId(user.id);
    setRemoveError(null);
    startRemoveTransition(async () => {
      const result = await removeUserFromWorkspaceAction(workspaceId, user.id);
      setRemovingUserId(null);
      if (result?.error) setRemoveError(result.error);
      else router.refresh();
    });
  }

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1;
  const end = Math.min(pagination.page * pagination.page_size, pagination.total);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildHref({ q: searchValue, role: roleFilter, page: 1 }));
  }

  function handleRoleChange(newRole: string) {
    setRoleFilter(newRole);
    router.push(buildHref({ q: searchValue, role: newRole, page: 1 }));
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-display text-on-surface">Users</h1>
            <Badge tone="neutral">{pagination.total} Members</Badge>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage workspace members, assign roles, and organize teams.
          </p>
        </div>
        <Button icon={<Icon name="person_add" className="text-[18px]" />} onClick={() => setInviteOpen(true)}>
          Invite User
        </Button>
      </div>

      <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-screen-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest text-label-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="all">All Roles</option>
            <option value="0">Admin</option>
            <option value="1">Owner</option>
            <option value="2">Leader</option>
            <option value="3">Member</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md"
          >
            <Icon name="search" className="text-[18px]" />
            Search
          </button>
        </div>
      </form>

      {removeError && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-error-container rounded-lg text-on-error-container font-body-md text-[13px]">
          <Icon name="error" className="text-[16px] shrink-0" /> {removeError}
          <button type="button" onClick={() => setRemoveError(null)} className="ml-auto">
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">User</th>
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Role</th>
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Teams</th>
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Joined</th>
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-body-md text-body-md text-on-surface-variant">
                    No users match your search.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar person={user} size="md" />
                      <div>
                        <div className="font-label-md text-label-md text-on-surface font-semibold">{user.display_name}</div>
                        <div className="font-body-md text-on-surface-variant text-[13px]">{user.email ?? `@${user.username}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold tracking-wide uppercase ${ROLE_TONES[user.role] ?? ROLE_TONES[3]}`}>
                      {ROLE_LABELS[user.role] ?? "Member"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.teams.length === 0 ? (
                      <span className="text-on-surface-variant text-[12px] italic">Unassigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {user.teams.map((team) => (
                          <span key={team.id} className="inline-flex items-center px-2 py-0.5 rounded border border-outline-variant bg-surface font-body-md text-[12px] text-on-surface-variant">
                            {team.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant text-[13px]">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={`flex items-center justify-end gap-1 ${removingUserId === user.id ? "opacity-50" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setEditUser(user)}
                        className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-container-high transition-colors"
                        aria-label="Edit user"
                        title="Edit user"
                        disabled={removingUserId === user.id}
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      {workspaceId && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user)}
                          className="text-on-surface-variant hover:text-error p-1.5 rounded-md hover:bg-error-container/30 transition-colors"
                          aria-label="Remove from workspace"
                          title="Remove from workspace"
                          disabled={removingUserId === user.id}
                        >
                          <Icon name="person_remove" className="text-[18px]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-surface border-t border-outline-variant/60 px-4 py-3 flex items-center justify-between">
          <span className="font-body-md text-[13px] text-on-surface-variant">
            {pagination.total === 0 ? "No entries" : `Showing ${start}–${end} of ${pagination.total}`}
          </span>
          <div className="flex gap-2">
            <a
              href={buildHref({ q, role, page: page - 1 })}
              aria-disabled={page <= 1}
              className={`px-3 py-1.5 text-sm border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              ← Previous
            </a>
            <span className="px-3 py-1.5 text-sm font-label-sm text-on-surface-variant">
              {page} / {pagination.total_pages || 1}
            </span>
            <a
              href={buildHref({ q, role, page: page + 1 })}
              aria-disabled={page >= pagination.total_pages}
              className={`px-3 py-1.5 text-sm border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-sm ${page >= pagination.total_pages ? "pointer-events-none opacity-50" : ""}`}
            >
              Next →
            </a>
          </div>
        </div>
      </div>

      {inviteOpen && <InviteUserModal onClose={() => setInviteOpen(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </>
  );
}
