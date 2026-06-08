import { Icon } from "../ui/Icon";
import { SearchInput } from "../ui/SearchInput";

type TopHeaderProps = {
  teamName?: string;
  unreadNotifications?: number;
};

export function TopHeader({ teamName, unreadNotifications = 0 }: TopHeaderProps) {
  return (
    <header className="bg-surface-bright flex justify-between items-center w-full h-16 px-8 sticky top-0 z-40 border-b border-outline-variant/30">
      <button className="md:hidden text-on-surface p-2 hover:bg-surface-container-high rounded-full">
        <Icon name="menu" />
      </button>

      <div className="flex-1 max-w-2xl hidden md:flex items-center">
        <SearchInput placeholder="Search boards, tasks, teams..." className="w-full max-w-lg" />
      </div>

      <div className="flex items-center gap-4">
        {teamName && (
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-lowest transition-colors">
            {teamName}
            <Icon name="expand_more" className="text-lg" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <button className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-2 transition-all hover:scale-95 duration-150 relative">
            <Icon name="notifications" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
            )}
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-2 transition-all hover:scale-95 duration-150">
            <Icon name="history" />
          </button>
        </div>
      </div>
    </header>
  );
}
