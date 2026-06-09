import { api } from "@/lib/api";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { UsersClient } from "./UsersClient";

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

  const [{ data: users, pagination }, workspaces] = await Promise.all([
    api.get<UsersResponse>(`/users?${query.toString()}`),
    api.get<{ id: string; name: string }[]>("/workspaces").catch(() => []),
  ]);

  const workspaceId = (await resolveActiveWorkspace(workspaces))?.id ?? "";

  return <UsersClient users={users} pagination={pagination} q={q} role={role} page={page} workspaceId={workspaceId} />;
}
