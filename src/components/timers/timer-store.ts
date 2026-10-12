"use client";

import { useSyncExternalStore } from "react";

// Running timers live in localStorage (this phone only), so they survive a reload
// or the app being closed. One ticking clock drives every timer on the page.

const KEY = "nila.timers";
const EVENT = "nila:timers";

/** id → when it ends (ms since epoch). */
type Timers = Record<string, number>;

let inMemory = "{}";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? inMemory;
  } catch {
    return inMemory;
  }
}

function write(timers: Timers) {
  inMemory = JSON.stringify(timers);
  try {
    localStorage.setItem(KEY, inMemory);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function parse(raw: string): Timers {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function subscribeTimers(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function startTimer(id: string, minutes: number) {
  write({ ...parse(read()), [id]: Date.now() + minutes * 60_000 });
}

export function stopTimer(id: string) {
  write(Object.fromEntries(Object.entries(parse(read())).filter(([key]) => key !== id)));
}

/** When this item's timer ends, or null if it isn't running. Null on the server. */
export function useTimerEnd(id: string): number | null {
  const raw = useSyncExternalStore(subscribeTimers, read, () => "{}");
  return parse(raw)[id] ?? null;
}

/** The current time, updated every `stepMs`; null during the server render. */
export function useNow(stepMs: number): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const timer = setInterval(onChange, Math.min(stepMs, 1000));
      return () => clearInterval(timer);
    },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => null,
  );
}
