type Person = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
};

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
} as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ person, size = "sm" }: { person: Person; size?: keyof typeof SIZES }) {
  const dimensions = SIZES[size];

  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt={person.display_name}
        className={`${dimensions} rounded-full border border-outline-variant object-cover`}
      />
    );
  }

  return (
    <div
      title={person.display_name}
      className={`${dimensions} rounded-full border border-outline-variant bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initials(person.display_name)}
    </div>
  );
}

export function AvatarStack({ people, max = 4, size = "sm" }: { people: Person[]; max?: number; size?: keyof typeof SIZES }) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const dimensions = SIZES[size];

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person) => (
        <div key={person.id} className="ring-2 ring-surface-container-lowest rounded-full">
          <Avatar person={person} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`${dimensions} rounded-full ring-2 ring-surface-container-lowest border border-outline-variant bg-surface-container-high text-on-surface-variant flex items-center justify-center font-semibold flex-shrink-0`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
