import type { Person } from "@/lib/types";

export type { Person };

export function personById(people: Person[], id: string | null | undefined) {
  return people.find((p) => p.id === id) ?? null;
}
