import { Repeat, User, Users } from "lucide-react";
import type { Chore } from "@/lib/types";
import { PersonDot } from "@/components/person-dot";
import { personById, type Person } from "./people";

/** "Rotates weekly: A → B", "Fixed: A", or "Together". */
export function AssignmentSummary({ chore, people }: { chore: Chore; people: Person[] }) {
  if (chore.assignment_type === "together") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5" /> Together
      </span>
    );
  }
  if (chore.assignment_type === "fixed") {
    const person = personById(people, chore.fixed_assignee);
    return (
      <span className="inline-flex items-center gap-1.5">
        <User className="size-3.5" /> Always {person?.name ?? "someone"}
      </span>
    );
  }
  const order = (chore.rotation_order ?? [])
    .map((id) => personById(people, id))
    .filter(Boolean) as Person[];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Repeat className="size-3.5" />
      {chore.rotation_unit === "per_week" ? "Rotates weekly" : "Takes turns"}:
      {order.map((p, i) => (
        <span key={p.id} className="inline-flex items-center gap-1">
          {i > 0 && "→"} <PersonDot profile={p} /> {p.name}
        </span>
      ))}
    </span>
  );
}
