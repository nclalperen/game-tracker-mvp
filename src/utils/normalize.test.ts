import { describe, it, expect } from "vitest";
import { normalizeTitle, dedupe, pricePerHour } from "./normalize";

describe("normalize", () => {
  it("normalizes titles", () => {
    expect(normalizeTitle("  The  Witcher 3 ")).toBe("the witcher 3");
  });
  it("dedupes by key", () => {
    const out = dedupe([{id:1,a:1},{id:1,a:2},{id:2,a:3}] as any, x => String(x.id));
    expect(out.length).toBe(2);
  });
  it("price per hour", () => {
    expect(pricePerHour(200, 25)).toBe(8);
    expect(pricePerHour(undefined, 25)).toBeUndefined();
  });
});
