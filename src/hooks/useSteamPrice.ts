import { flags } from "@/utils/flags";

export async function fetchSteamPriceTRY(appid: number): Promise<number | null> {
  if (!flags.steamPriceFetchEnabled) return null;
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const first = json?.[appid]?.data?.price_overview?.final; // in minor units (e.g., kuruş)
  return typeof first === "number" ? first / 100 : null;
}
