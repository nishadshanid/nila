import { LogOut } from "lucide-react";
import { getHousehold } from "@/lib/household";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PersonDot } from "@/components/person-dot";

export async function UserChip() {
  const { me, partner } = await getHousehold();
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <PersonDot profile={me} />
        <span className="font-medium">{me.name}</span>
        {partner && (
          <>
            <span className="text-muted-foreground">&amp;</span>
            <PersonDot profile={partner} />
            <span className="text-muted-foreground">{partner.name}</span>
          </>
        )}
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
