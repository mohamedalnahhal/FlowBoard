export function ProgressBar({ value, max = 100, className = "" }: { value: number; max?: number; className?: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className={`w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden ${className}`}>
      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}
