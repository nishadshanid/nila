import { NativeSelect } from "@/components/native-select";

export const REMIND_PRESETS: [number, string][] = [
  [0, "At the time"],
  [10, "10 min before"],
  [15, "15 min before"],
  [30, "30 min before"],
  [60, "1 hour before"],
  [24 * 60, "1 day before"],
];

export const DURATION_PRESETS: [number, string][] = [
  [5, "5 min"],
  [10, "10 min"],
  [15, "15 min"],
  [20, "20 min"],
  [30, "30 min"],
  [45, "45 min"],
  [60, "1 hour"],
  [90, "1½ hours"],
  [120, "2 hours"],
];

function label(min: number) {
  if (min % (24 * 60) === 0) return `${min / (24 * 60)} day${min === 24 * 60 ? "" : "s"}`;
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? "" : "s"}`;
  return `${min} min`;
}

/**
 * Minutes as a dropdown of presets. `value` is a string ("" = none) so it fits
 * the forms' state; an existing custom value stays selectable.
 */
export function MinutesSelect({
  value,
  onChange,
  presets,
  noneLabel,
  customSuffix = "",
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  presets: [number, string][];
  noneLabel: string;
  customSuffix?: string;
} & Omit<React.ComponentProps<"select">, "value" | "onChange">) {
  const custom = value !== "" && !presets.some(([m]) => String(m) === value);
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      <option value="">{noneLabel}</option>
      {presets.map(([m, text]) => (
        <option key={m} value={String(m)}>
          {text}
        </option>
      ))}
      {custom && <option value={value}>{`${label(Number(value))}${customSuffix}`}</option>}
    </NativeSelect>
  );
}
