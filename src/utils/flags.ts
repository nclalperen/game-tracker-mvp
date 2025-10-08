import type { FeatureFlags } from "@/types";

export const flags = {
  openCriticEnabled: true,
  igdbEnabled: true,
  steamPriceFetchEnabled: true,   // <— NEW (optional)
  steamImportEnabled: true,       // <— NEW (off by default)
} as const;
