import Link from "next/link";
import { Trophy } from "lucide-react";
import { PersonDot } from "@/components/person-dot";
import { monthKeyIST } from "@/lib/dates";
import { leaderOf, monthLabel, type Score } from "@/lib/points";
import type { Person } from "@/lib/types";

/** "October · You 42 · Asha 38", linking to the scoreboard. */
export function MonthScoreLine({
  scores,
  people,
  meId,
}: {
  scores: Score[];
  people: Person[];
  meId: string;
}) {
  const leader = leaderOf(scores);
  const total = (id: string) => scores.find((s) => s.user_id === id)?.total ?? 0;
  return (
    <Link
      href="/points"
      className="text-muted-foreground hover:text-foreground mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
    >
      <Trophy className="size-4 text-amber-500" />
      <span>{monthLabel(monthKeyIST(), true)}</span>
      {people.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1">
          · <PersonDot profile={p} />
          <span className={p.id === leader ? "text-foreground font-semibold" : undefined}>
            {p.id === meId ? "You" : p.name} {total(p.id)}
          </span>
        </span>
      ))}
    </Link>
  );
}
