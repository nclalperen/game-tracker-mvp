import { flags } from "@/utils/flags";

export function useIGDB() {
  async function fetchTTB(_title: string): Promise<{medianMainH: number} | null> {
    if (!flags.igdbEnabled) return null;
    // TODO: real fetch; IGDB for metadata; TTB likely via manual/CSV/HowLongToBeat CSV (user-provided)
    return { medianMainH: 20 };
  }
  return { fetchTTB };
}
