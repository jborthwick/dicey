import type { Symbol } from "../core/index";

/** Display glyph + color per symbol, for dice faces and card costs. */
export const SYMBOL_UI: Record<Symbol, { glyph: string; color: string; label: string }> = {
  wind: { glyph: "🍃", color: "#3fbf6f", label: "Wind" },
  light: { glyph: "🔶", color: "#e9c94a", label: "Light" },
  water: { glyph: "💧", color: "#3f8fd6", label: "Water" },
  earth: { glyph: "🪨", color: "#a97442", label: "Earth" },
  blank: { glyph: "🚫", color: "#6b6b6b", label: "Blank" },
};

/** Color used to tint a card by its element/school. */
export const ELEMENT_COLOR: Record<string, string> = {
  wind: "#2f7d4c",
  light: "#a8892a",
  water: "#2f6aa8",
  earth: "#7d5230",
  special: "#7a4fa8",
};

export const STATUS_UI: Record<string, { glyph: string; label: string; text: string }> = {
  poison: {
    glyph: "🧪",
    label: "Poison",
    text: "Deals 1 damage at the start of the afflicted's turn, then decreases by 1.",
  },
  silence: {
    glyph: "💀",
    label: "Silence",
    text: "The next card played fizzles — its dice are spent but nothing happens. Decreases by 1 each turn.",
  },
  entangle: {
    glyph: "🌀",
    label: "Entangle",
    text: "Locks that many dice from being rerolled or held this turn. Decreases by 1 each turn.",
  },
  weaken: {
    glyph: "🔻",
    label: "Weaken",
    text: "Reduces outgoing damage while active. Decreases by 1 each turn.",
  },
  block: {
    glyph: "🛡️",
    label: "Block",
    text: "Absorbs incoming damage until used up. Clears at the start of the owner's turn.",
  },
};
