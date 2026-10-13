import { describe, expect, it } from "vitest";
import { choreInputSchema } from "./chore-schema";
import { STARTER_CHORES } from "./starter-chores";

const me = "00000000-0000-4000-8000-000000000001";
const partner = "00000000-0000-4000-8000-000000000002";

describe("starter chores", () => {
  it.each(STARTER_CHORES.map((c) => [c.title, c] as const))("%s is a valid chore", (_, c) => {
    const result = choreInputSchema.safeParse(
      c.build({ meId: me, partnerId: partner, today: "2026-10-12" }),
    );
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});
