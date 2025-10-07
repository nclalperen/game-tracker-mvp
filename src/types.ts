export type Platform = "PC" | "Xbox" | "PlayStation" | "Switch" | "Android";
export type Status = "Backlog" | "Playing" | "Beaten" | "Abandoned" | "Wishlist" | "Owned";
export type Service = "Game Pass" | "EA Play Pro";

export interface Member {
  id: string;           // 'everyone' | 'you' | 'hatice' | custom
  name: string;
}

export interface Account {
  id: string;
  platform: Platform;
  label: string;        // e.g., Steam, Epic, Xbox, PSN
  identityId?: string;  // optional identity owner
}

export interface Identity {
  id: string;
  title: string;
  platform: Platform;
  // External mappings
  openCriticId?: number;
  igdbId?: number;
}

export interface LibraryItem {
  id: string;
  identityId: string;
  accountId?: string;
  memberId?: string;
  status: Status;
  priceTRY?: number;
  acquiredAt?: string;  // ISO date
  services?: Service[]; // availability (not ownership)
  // Metadata
  ocScore?: number;     // OpenCritic
  ttbMedianMainH?: number; // median "Main" hours
}

export interface FeatureFlags {
  openCriticEnabled: boolean;
  igdbEnabled: boolean;
  steamPriceFetchEnabled: boolean; // opt-in
}
