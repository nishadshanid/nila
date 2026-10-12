import { describe, expect, it } from "vitest";
import { formatQty, parseQuickAdd } from "./shopping-parse";

describe("parseQuickAdd", () => {
  it.each([
    ["milk", { name: "milk", qty: null, unit: null }],
    ["2 kg rice", { name: "rice", qty: 2, unit: "kg" }],
    ["2kg rice", { name: "rice", qty: 2, unit: "kg" }],
    ["3 eggs", { name: "eggs", qty: 3, unit: null }],
    ["1.5L oil", { name: "oil", qty: 1.5, unit: "L" }],
    ["500 g paneer", { name: "paneer", qty: 500, unit: "g" }],
    ["2 packets of biscuits", { name: "biscuits", qty: 2, unit: "pack" }],
    ["1 dozen bananas", { name: "bananas", qty: 1, unit: "dozen" }],
    ["2x bread", { name: "bread", qty: 2, unit: null }],
    ["2 x bread", { name: "bread", qty: 2, unit: null }],
    ["rice 5kg", { name: "rice", qty: 5, unit: "kg" }],
    ["eggs 12", { name: "eggs", qty: 12, unit: null }],
    ["oil 1 L", { name: "oil", qty: 1, unit: "L" }],
    ["  Toor   dal  ", { name: "Toor dal", qty: null, unit: null }],
    ["7up", { name: "7up", qty: null, unit: null }],
    ["Vitamin B12", { name: "Vitamin B12", qty: null, unit: null }],
    ["shoes size 9 pairs", { name: "shoes size 9 pairs", qty: null, unit: null }],
  ])("%s", (input, expected) => {
    expect(parseQuickAdd(input)).toEqual(expected);
  });
});

describe("formatQty", () => {
  it("formats quantities", () => {
    expect(formatQty(null, null)).toBeNull();
    expect(formatQty(2, "kg")).toBe("2 kg");
    expect(formatQty(1.5, null)).toBe("1.5");
    expect(formatQty(0.25, "L")).toBe("0.25 L");
  });
});
