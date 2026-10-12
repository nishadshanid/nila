import { cn } from "@/lib/utils";

/** "+3": what ticking this item earns. */
export function PointsPill({ points, className }: { points: number; className?: string }) {
  if (points <= 0) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 tabular-nums dark:bg-emerald-950 dark:text-emerald-300",
        className,
      )}
      title={`${points} point${points === 1 ? "" : "s"}`}
    >
      +{points}
    </span>
  );
}
