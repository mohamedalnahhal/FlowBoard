export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="py-4">
        <div className="h-8 w-64 rounded-lg bg-surface-container-high mb-3" />
        <div className="h-4 w-40 rounded bg-surface-container-high" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 rounded-xl border border-outline-variant bg-surface-container-low" />
        ))}
      </div>
    </div>
  );
}
