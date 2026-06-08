import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/Avatar";
import { SearchInput } from "@/components/ui/SearchInput";

type Person = { id: string; display_name: string; username: string };
type Team = {
  id: string;
  name: string;
  workspace: { id: string; name: string } | null;
  member_count: number;
  board_count: number;
  lead: Person | null;
  members: Person[];
  created_at: string;
};

const TEAM_ICONS = ["design_services", "code_blocks", "campaign", "rocket_launch", "groups", "dynamic_form"];
const TEAM_TINTS = [
  "bg-primary-fixed text-on-primary-fixed-variant",
  "bg-tertiary-container/30 text-tertiary",
  "bg-surface-container-highest text-on-surface",
];

export default async function TeamsPage({ searchParams }: PageProps<"/teams">) {
  const { q } = await searchParams;
  const query = (q ?? "").toString().trim().toLowerCase();

  const teams = await api.get<Team[]>("/teams");
  const filtered = query ? teams.filter((t) => t.name.toLowerCase().includes(query)) : teams;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-display text-on-surface mb-1">Teams</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your organization&apos;s groups and functional units.
          </p>
        </div>
        <Button icon={<Icon name="add" className="text-[20px]" />}>Create Team</Button>
      </div>

      <form className="flex flex-col sm:flex-row gap-3 mb-8" action="/teams">
        <SearchInput placeholder="Filter teams..." className="w-full max-w-screen-md" />
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md w-fit"
        >
          <Icon name="filter_list" className="text-[20px]" />
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">No teams match your filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((team, i) => (
            <Card key={team.id} hoverable className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TEAM_TINTS[i % TEAM_TINTS.length]}`}>
                    <Icon name={TEAM_ICONS[i % TEAM_ICONS.length]} filled />
                  </div>
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface">{team.name}</h3>
                    <Badge tone="secondary" className="mt-1">
                      {team.member_count} {team.member_count === 1 ? "Member" : "Members"}
                    </Badge>
                  </div>
                </div>
                <button className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Team actions">
                  <Icon name="more_vert" />
                </button>
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant min-h-[40px]">
                Part of {team.workspace?.name ?? "—"} · {team.board_count} {team.board_count === 1 ? "board" : "boards"}
              </p>

              <div className="pt-3 border-t border-outline-variant flex justify-between items-center mt-auto">
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Lead</span>
                  <span className="font-label-md text-label-md text-on-surface">{team.lead?.display_name ?? "Unassigned"}</span>
                </div>
                <AvatarStack people={team.members} max={3} />
              </div>

              <button className="w-full mt-1 py-2.5 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors">
                Manage Team
              </button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
