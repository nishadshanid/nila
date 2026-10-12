"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const REASONS = ["Sick", "Busy", "Not at home", "Other"];

/** Asks why you can't do a chore before handing it to your partner. */
export function HandOverDialog({
  open,
  onOpenChange,
  choreTitle,
  partnerName,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choreTitle: string;
  partnerName: string;
  pending: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(note.trim() ? `${reason.toLowerCase()}: ${note.trim()}` : reason.toLowerCase());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              Hand &ldquo;{choreTitle}&rdquo; to {partnerName}?
            </DialogTitle>
            <DialogDescription>
              Just for this day. {partnerName} will see why, and you can take it back until
              it&apos;s done.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm",
                  reason === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hand-over-note">Note (optional)</Label>
            <Input
              id="hand-over-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. fever"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Hand over
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
