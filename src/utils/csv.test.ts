import { describe, it, expect } from "vitest";
import { toCSV, parseCSV } from "./csv";

describe("csv", () => {
  it("roundtrips", () => {
    const rows = [{a:1,b:"x,y",c:'he said "hi"'}];
    const csv = toCSV(rows);
    const parsed = parseCSV(csv);
    expect(parsed[0].a).toBeUndefined(); // strings only on parse
    expect(parsed[0].b).toBe("x,y");
    expect(parsed[0].c).toBe('he said "hi"');
  });
});
