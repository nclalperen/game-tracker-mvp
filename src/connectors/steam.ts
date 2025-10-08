import { flags } from "@/utils/flags";

export type SteamGame = {
  appid: number;
  name: string;
  playtime_forever?: number;
  img_icon_url?: string;
};

export async function fetchSteamOwnedGames(steamId64: string, apiKey?: string): Promise<SteamGame[]> {
  if (!flags.steamImportEnabled) return [];

  // Requires: profile “Game details” public OR API key from https://steamcommunity.com/dev/apikey
  // If you don’t want to use a key, there are community endpoints that may break; keep it official here.
  if (!apiKey) {
    throw new Error("Steam API key required for GetOwnedGames (enable flags and provide key).");
  }

  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const json = await res.json();
  return json?.response?.games ?? [];
}
