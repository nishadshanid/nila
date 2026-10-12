import { Suspense } from "react";
import { House } from "lucide-react";
import { getHousehold } from "@/lib/household";
import { formatDay, todayIST, TZ } from "@/lib/dates";
import { ComingSoon } from "@/components/coming-soon";
import { PersonDot } from "@/components/person-dot";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(
      now,
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function Greeting() {
  const { me, partner } = await getHousehold();
  const now = new Date();
  return (
    <div className="mb-6">
      <p className="text-muted-foreground text-sm">{formatDay(todayIST(now), "EEEE, d MMMM")}</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greeting(now)}, {me.name}
      </h1>
      {partner ? (
        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
          <PersonDot profile={partner} /> Sharing with {partner.name}
        </p>
      ) : (
        <p className="text-muted-foreground mt-1 text-sm">
          Your partner hasn&apos;t been added yet. Create their account in Supabase.
        </p>
      )}
    </div>
  );
}

export default function TodayPage() {
  return (
    <>
      <Suspense fallback={<div className="bg-muted mb-6 h-16 animate-pulse rounded" />}>
        <Greeting />
      </Suspense>
      <ComingSoon icon={House} phase={1}>
        Today&apos;s chores, todos, reminders and urgent shopping will show here.
      </ComingSoon>
    </>
  );
}
