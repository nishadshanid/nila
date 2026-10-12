"use client";

import { useEffect } from "react";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toISTDate, type DateStr } from "@/lib/dates";
import { istInstant } from "@/lib/notify-schedule";
import { cn } from "@/lib/utils";
import { startTimer, stopTimer, useNow, useTimerEnd } from "./timer-store";

function minutesText(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Starts in 25 min" / "Now" for something due today, within the next 3 hours. */
export function StartsIn({
  date,
  time,
  durationMin,
}: {
  date: DateStr;
  time: string | null;
  durationMin: number | null;
}) {
  const now = useNow(30_000);
  if (now === null || !time || date !== toISTDate(now)) return null;
  const diffMin = Math.ceil((istInstant(date, time) - now) / 60_000);
  if (diffMin > 180) return null;
  if (diffMin > 0) {
    return (
      <span className="font-medium text-sky-700 dark:text-sky-400">
        · Starts in {minutesText(diffMin)}
      </span>
    );
  }
  if (diffMin > -(durationMin ?? 30)) {
    return <span className="font-medium text-sky-700 dark:text-sky-400">· Now</span>;
  }
  return null;
}

function beep() {
  try {
    const audio = new AudioContext();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, audio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.3);
      osc.connect(gain).connect(audio.destination);
      osc.start(audio.currentTime + offset);
      osc.stop(audio.currentTime + offset + 0.3);
    });
  } catch {}
}

/**
 * Start a countdown for how long the item takes. It keeps running across
 * reloads; at the end the phone buzzes and beeps and offers "Mark done".
 */
export function TimerButton({
  id,
  title,
  minutes,
  onFinish,
}: {
  id: string;
  title: string;
  minutes: number;
  /** Shown as "Mark done" when the timer ends. */
  onFinish?: () => void;
}) {
  const end = useTimerEnd(id);
  const now = useNow(1000);
  const finished = end !== null && now !== null && now >= end;

  useEffect(() => {
    if (!finished) return;
    stopTimer(id);
    navigator.vibrate?.([300, 150, 300, 150, 300]);
    beep();
    toast(`Time's up: ${title}`, {
      duration: 60_000,
      action: onFinish ? { label: "Mark done", onClick: onFinish } : undefined,
    });
  }, [finished, id, title, onFinish]);

  if (end === null || finished) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground h-7 shrink-0 gap-1 px-2 text-xs"
        onClick={() => startTimer(id, minutes)}
        aria-label={`Start a ${minutesText(minutes)} timer for ${title}`}
      >
        <Play className="size-3" /> {minutesText(minutes)}
      </Button>
    );
  }

  const left = Math.max(0, Math.ceil((end - (now ?? end)) / 1000));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("h-7 shrink-0 gap-1 px-2 font-mono text-xs tabular-nums")}
      onClick={() => stopTimer(id)}
      aria-label={`Stop the timer for ${title}, ${mm} minutes ${ss} seconds left`}
    >
      <Square className="size-3 fill-current" /> {mm}:{ss}
    </Button>
  );
}
