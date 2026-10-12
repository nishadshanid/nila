"use client";

import { useState, useTransition } from "react";
import { Gift, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReward } from "./actions";

/** The winner's prize for the month, editable by either of you. */
export function RewardForm({ month, reward }: { month: string; reward: string | null }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reward ?? "");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveReward(month, title);
      if (!result.ok) toast.error(result.error);
      else setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="hover:bg-muted flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm"
      >
        <Gift className="size-4 shrink-0 text-pink-500" />
        {reward ? (
          <span>
            <span className="text-muted-foreground">Winner gets: </span>
            <span className="font-medium">{reward}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Add a reward for this month&apos;s winner</span>
        )}
        <Pencil className="text-muted-foreground ml-auto size-3.5" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Winner picks the weekend movie"
        aria-label="Reward"
        maxLength={200}
        autoFocus
      />
      <Button type="submit" disabled={pending}>
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setTitle(reward ?? "");
          setEditing(false);
        }}
      >
        Cancel
      </Button>
    </form>
  );
}
