/** What quick-add understood from text like "2 kg rice" or "milk". */
export type ParsedItem = { name: string; qty: number | null; unit: string | null };

/** Spellings people type → the unit we store. */
const UNITS: Record<string, string> = {
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  l: "L",
  ltr: "L",
  ltrs: "L",
  litre: "L",
  litres: "L",
  liter: "L",
  liters: "L",
  ml: "ml",
  pc: "pcs",
  pcs: "pcs",
  piece: "pcs",
  pieces: "pcs",
  pack: "pack",
  packs: "pack",
  packet: "pack",
  packets: "pack",
  pkt: "pack",
  dozen: "dozen",
  doz: "dozen",
  bottle: "bottle",
  bottles: "bottle",
  box: "box",
  boxes: "box",
  bunch: "bunch",
  bunches: "bunch",
  can: "can",
  cans: "can",
};

/** "rice 2kg", "eggs 12", "oil 1.5 L", "bread x2" */
const TRAILING = /^(.*?)\s+(?:x\s*)?(\d+(?:\.\d+)?)\s*(?:([a-z]+)\.?)?$/i;

function unitOf(word: string | undefined): string | null {
  return word ? (UNITS[word.toLowerCase()] ?? null) : null;
}

function tidy(name: string) {
  return name
    .replace(/\s+/g, " ")
    .replace(/^of\s+/i, "")
    .trim();
}

export function parseQuickAdd(input: string): ParsedItem {
  const text = input.trim().replace(/\s+/g, " ");

  const lead = text.match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:x\s+|x(?=\d|$))?/i);
  if (lead) {
    const qty = Number(lead[1]);
    const rest = text.slice(lead[0].length).trim();
    // Unit glued to the number ("1.5L oil") or as its own word ("2 kg rice").
    const [first, ...others] = rest.split(" ");
    const unit = unitOf(first?.replace(/\.$/, ""));
    // "7up" is a name, not seven of "up".
    const afterNumber = text.slice(lead[1].length);
    const glued = /^[a-z]/i.test(afterNumber) && !/^x(\s|$)/i.test(afterNumber);
    if (glued && !unit) return { name: tidy(text), qty: null, unit: null };
    const name = tidy(unit ? others.join(" ") : rest);
    if (name && qty > 0) return { name, qty, unit };
  }

  const trail = text.match(TRAILING);
  if (trail) {
    const unit = unitOf(trail[3]);
    const name = tidy(trail[1]);
    const qty = Number(trail[2]);
    if (name && qty > 0 && (unit || !trail[3])) return { name, qty, unit };
  }

  return { name: tidy(text), qty: null, unit: null };
}

/** "2 kg", "3", "1.5 L" — or null when there's no quantity. */
export function formatQty(qty: number | null, unit: string | null): string | null {
  if (qty === null) return null;
  const n = Number.isInteger(qty) ? String(qty) : String(Number(qty.toFixed(3)));
  return unit ? `${n} ${unit}` : n;
}
