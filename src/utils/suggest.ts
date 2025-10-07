import type { LibraryItem } from "@/types";

export interface Suggestion {
  id: string;
  kind: "PlayNext" | "BuyClaim";
  reason: string[]; // "Why" chips
  item: LibraryItem;
  score: number;
}

export interface Weights {
  backlogBoost: number;        // prefer backlog items
  valueWeight: number;         // lower TRY/h is better
  scoreWeight: number;         // OpenCritic score weight
  durationWeight: number;      // prefer target duration window proximity (optional future)
}

export function computeSuggestions(items: LibraryItem[], weights: Weights): Suggestion[] {
  const out: Suggestion[] = [];

  for (const it of items) {
    const why: string[] = [];
    let s = 0;

    if (it.status === "Backlog") { s += weights.backlogBoost; why.push("Backlog"); }
    if (it.ocScore != null) { s += weights.scoreWeight * (it.ocScore / 100); why.push(`Score ${it.ocScore}`); }
    const pph = it.priceTRY && it.ttbMedianMainH ? it.priceTRY / it.ttbMedianMainH : undefined;
    if (pph != null) { s += weights.valueWeight * (1 / (1 + pph)); why.push(friendlyTRYH(pph)); }

    const kind: "PlayNext" | "BuyClaim" = it.status === "Wishlist" || (it.services && it.services.length) ? "BuyClaim" : "PlayNext";

    out.push({ id: it.id, kind, reason: why, item: it, score: Number(s.toFixed(3)) });
  }

  return out.sort((a, b) => b.score - a.score);
}

function friendlyTRYH(v: number) { return `₺/${"h"} ~ ${v.toFixed(2)}`; }
