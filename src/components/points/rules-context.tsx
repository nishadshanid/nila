"use client";

import { createContext, useContext } from "react";
import { DEFAULT_RULES, type PointRules } from "@/lib/points";

const RulesContext = createContext<PointRules>(DEFAULT_RULES);

/** Makes the current point rules available to the cards and forms below it. */
export function PointRulesProvider({
  rules,
  children,
}: {
  rules: PointRules;
  children: React.ReactNode;
}) {
  return <RulesContext value={rules}>{children}</RulesContext>;
}

export function usePointRules() {
  return useContext(RulesContext);
}
