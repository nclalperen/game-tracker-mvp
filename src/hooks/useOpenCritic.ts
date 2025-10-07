import { flags } from "@/utils/flags";

export function useOpenCritic() {
  async function fetchScore(_title: string): Promise<{score: number} | null> {
    if (!flags.openCriticEnabled) return null;
    // TODO: real fetch with API key
    return { score: 80 };
  }
  return { fetchScore };
}
