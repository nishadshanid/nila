"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/native-select";
import { formatTime } from "@/lib/chore-meta";
import type { Profile } from "@/lib/types";
import { updateNotifications } from "./actions";

// Every 15 minutes, matching when the reminder job runs.
const TIMES = Array.from({ length: 4 * 24 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

export function NotificationsForm({
  profile,
  emailReady,
}: {
  profile: Pick<Profile, "email" | "email_notifications" | "digest_time">;
  /** Whether Gmail sending is set up on the server. */
  emailReady: boolean;
}) {
  const [enabled, setEnabled] = useState(profile.email_notifications);
  const [digest, setDigest] = useState(profile.digest_time.slice(0, 5));
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateNotifications({
        email_notifications: enabled,
        digest_time: digest,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Notification settings saved");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {!emailReady && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Email sending isn&apos;t set up on the server yet, so nothing will be sent until it is.
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="email-on">Email me</Label>
          <p className="text-muted-foreground text-xs">
            Reminders, the morning summary, hand-overs and the monthly result, to {profile.email}.
          </p>
        </div>
        <Switch id="email-on" checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="digest-time">Morning summary at</Label>
          <p className="text-muted-foreground text-xs">Today&apos;s chores, todos and reminders.</p>
        </div>
        <NativeSelect
          id="digest-time"
          value={digest}
          onChange={(e) => setDigest(e.target.value)}
          disabled={!enabled}
          className="w-32"
        >
          {TIMES.map((t) => (
            <option key={t} value={t}>
              {formatTime(t)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        Save
      </Button>
    </form>
  );
}
