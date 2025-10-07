export function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

export function dedupe<T>(arr: T[], key: (x: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    const k = key(item);
    if (!map.has(k)) map.set(k, item);
  }
  return [...map.values()];
}

export function pricePerHour(priceTRY?: number, ttbMedianMainH?: number): number | undefined {
  if (!priceTRY || !ttbMedianMainH || ttbMedianMainH <= 0) return;
  return Number((priceTRY / ttbMedianMainH).toFixed(2));
}
