import { Repeat, User, Users } from "lucide-react";
import type { Chore } from "@/lib/types";
import { PersonDot } from "@/components/person-dot";
import { personById, type Person } from "./people";

const ROTATION_LABEL: Record<Chore["rotation_unit"], string> = {
  per_week: "Turns every week",
  per_occurrence: "Turns every time",
};

/** "Turns every week: A → B", "Just you", or "Together". */
export function AssignmentSummary({ chore, people }: { chore: Chore; people: Person[] }) {
  if (chore.assignment_type === "together") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5" /> Together
      </span>
    );
  }
  if (chore.assignment_type === "fixed") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <User className="size-3.5" /> Just you
      </span>
    );
  }
  const order = (chore.rotation_order ?? [])
    .map((id) => personById(people, id))
    .filter(Boolean) as Person[];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Repeat className="size-3.5" />
      {ROTATION_LABEL[chore.rotation_unit]}:
      {order.map((p, i) => (
        <span key={p.id} className="inline-flex items-center gap-1">
          {i > 0 && "→"} <PersonDot profile={p} /> {p.name}
        </span>
      ))}
    </span>
  );
}
