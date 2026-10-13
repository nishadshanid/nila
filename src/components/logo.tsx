import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Nila wordmark: black ink in light mode, inverted to white in dark mode. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Nila"
      width={429}
      height={192}
      priority
      className={cn("h-7 w-auto dark:invert", className)}
    />
  );
}
