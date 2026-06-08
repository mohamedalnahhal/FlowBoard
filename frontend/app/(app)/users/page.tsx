import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

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
type UsersResponse = {
  data: UserRow[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

const ROLE_LABELS: Record<number, string> = { 0: "Admin", 1: "Owner", 2: "Leader", 3: "Member" };
const ROLE_TONES: Record<number, string> = {
  0: "bg-tertiary-container/30 text-tertiary border border-tertiary/20",
  1: "bg-tertiary-container/30 text-tertiary border border-tertiary/20",
  2: "bg-secondary-container text-on-secondary-fixed-variant border border-secondary-fixed-dim",
  3: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
};

function roleBadgeClass(role: number) {
  return ROLE_TONES[role] ?? ROLE_TONES[3];
}

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

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const sp = await searchParams;
  const q = (sp.q ?? "").toString();
  const role = (sp.role ?? "all").toString();
  const page = Math.max(Number.parseInt((sp.page ?? "1").toString(), 10) || 1, 1);

  const query = new URLSearchParams();
  if (q) query.set("search", q);
  if (role !== "all") query.set("role", role);
  query.set("page", String(page));
  query.set("page_size", "20");

  const { data: users, pagination } = await api.get<UsersResponse>(`/users?${query.toString()}`);

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1;
  const end = Math.min(pagination.page * pagination.page_size, pagination.total);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-display text-on-surface">Users</h1>
            <Badge tone="neutral">{pagination.total} Members</Badge>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Manage workspace members, assign roles, and organize teams.
          </p>
        </div>
        <Button icon={<Icon name="person_add" className="text-[18px]" />}>Invite User</Button>
      </div>

      <form
        action="/users"
        className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-surface-container-lowest p-1 rounded-lg border border-outline-variant"
      >
        <div className="relative w-full sm:max-w-md flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, or team..."
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 outline-none"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-outline-variant pt-3 sm:pt-0 pl-0 sm:pl-3">
          <div className="relative flex-1 sm:w-[160px]">
            <select
              name="role"
              defaultValue={role}
              className="w-full appearance-none bg-surface border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer h-10"
            >
              <option value="all">All Roles</option>
              <option value="0">Admin</option>
              <option value="1">Owner</option>
              <option value="2">Leader</option>
              <option value="3">Member</option>
            </select>
            <Icon name="expand_more" className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]" />
          </div>
          <button
            type="submit"
            className="h-10 px-4 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-md text-label-md"
          >
            Apply
          </button>
        </div>
      </form>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">User Details</th>
                <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Role</th>
                <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Teams</th>
                <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Joined</th>
                <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-body-md text-body-md text-on-surface-variant">
                    No users match your search.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar person={user} size="md" />
                      <div>
                        <div className="font-label-md text-label-md text-on-surface font-semibold">{user.display_name}</div>
                        <div className="font-body-md text-on-surface-variant text-[13px]">{user.email ?? user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold tracking-wide uppercase ${roleBadgeClass(user.role)}`}>
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
                  <td className="px-4 py-3">
                    <span className="font-body-md text-body-md text-on-surface-variant text-[13px]">{formatDate(user.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container-high transition-colors" aria-label="User actions">
                      <Icon name="more_horiz" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-surface border-t border-outline-variant px-4 py-3 flex items-center justify-between">
          <span className="font-body-md text-[13px] text-on-surface-variant">
            {pagination.total === 0 ? "No entries" : `Showing ${start} to ${end} of ${pagination.total} entries`}
          </span>
          <div className="flex gap-2">
            <a
              href={buildHref({ q, role, page: page - 1 })}
              aria-disabled={page <= 1}
              className={`px-3 py-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </a>
            <a
              href={buildHref({ q, role, page: page + 1 })}
              aria-disabled={page >= pagination.total_pages}
              className={`px-3 py-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-sm ${page >= pagination.total_pages ? "pointer-events-none opacity-50" : ""}`}
            >
              Next
            </a>
          </div>
        </div>
      </Card>
    </>
  );
}
