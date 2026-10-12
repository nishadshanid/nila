import {
  CalendarDays,
  CalendarOff,
  House,
  CalendarHeart,
  Bell,
  Settings,
  ShoppingCart,
  Trophy,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Shown in the mobile bottom bar; everything else lives under "More". */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Today", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/plans", label: "Plans", icon: CalendarHeart },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/chores", label: "Chores", icon: WashingMachine },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/leave", label: "Leave", icon: CalendarOff },
  { href: "/points", label: "Points", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
