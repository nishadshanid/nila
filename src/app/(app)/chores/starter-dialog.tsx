"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryMeta } from "@/lib/chore-meta";
import { STARTER_CHORES } from "@/lib/starter-chores";
import { addStarterChores } from "./actions";

/** One tap to add common chores; each can be edited afterwards. */
export function StarterDialog({
  existingTitles,
  hasPartner,
  variant = "outline",
}: {
  existingTitles: string[];
  hasPartner: boolean;
  variant?: "outline" | "default";
}) {
  const have = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  const available = STARTER_CHORES.filter(
    (c) => !have.has(c.title.toLowerCase()) && (hasPartner || !c.needsPartner),
  );
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (available.length === 0) return null;

  function add() {
    startTransition(async () => {
      const result = await addStarterChores(picked);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${result.added} chore${result.added === 1 ? "" : "s"}`);
      setOpen(false);
      setPicked([]);
    });
  }

  return (
    <>
      <Button
        variant={variant}
        onClick={() => {
          setPicked(available.map((c) => c.key));
          setOpen(true);
        }}
      >
        <Sparkles /> Starter chores
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Starter chores</DialogTitle>
            <DialogDescription>
              Pick the ones you want. You can change days, times and who does what afterwards.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1">
            {available.map((c) => {
              const Icon = categoryMeta(c.category).icon;
              const checked = picked.includes(c.key);
              return (
                <li key={c.key}>
                  <label className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg p-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setPicked((p) => (v ? [...p, c.key] : p.filter((k) => k !== c.key)))
                      }
                    />
                    <Icon className="text-muted-foreground size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{c.title}</span>
                      <span className="text-muted-foreground block text-xs">{c.summary}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={add} disabled={pending || picked.length === 0}>
              Add {picked.length || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
