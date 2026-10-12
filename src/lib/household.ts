import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type Household = { me: Profile; partner: Profile | null };

/** The signed-in partner and the other partner. Cached per request. */
export const getHousehold = cache(async (): Promise<Household> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw new Error(`Could not load profiles: ${error.message}`);

  const profiles = (data ?? []) as Profile[];
  const me = profiles.find((p) => p.id === user.id);
  if (!me) {
    throw new Error(
      "No profile row for this user. Run the Supabase migrations (npx supabase db push).",
    );
  }
  return { me, partner: profiles.find((p) => p.id !== user.id) ?? null };
});
