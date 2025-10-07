import { db } from "@/db";
import type { Identity, LibraryItem, Account, Member } from "@/types";
import { nanoid } from "./uid";

// lightweight nanoid
function randId() { return nanoid(); }

export async function ensureSeed() {
  const key = "seeded-v1";
  if (localStorage.getItem(key)) return;

  const members: Member[] = [
    { id: "everyone", name: "Everyone" },
    { id: "you", name: "You" },
    { id: "hatice", name: "Hatice" },
  ];

  const accounts: Account[] = [
    { id: "acc-steam", label: "Steam", platform: "PC" },
    { id: "acc-xbox", label: "Xbox", platform: "Xbox" },
    { id: "acc-psn", label: "PSN", platform: "PlayStation" },
  ];

  const identities: Identity[] = [
    { id: "id-hades", title: "Hades", platform: "PC" },
    { id: "id-stardew", title: "Stardew Valley", platform: "Switch" },
    { id: "id-ds", title: "Death Stranding", platform: "PC" },
    { id: "id-fifa25", title: "EA Sports FC 25", platform: "PlayStation" },
  ];

  const library: LibraryItem[] = [
    { id: randId(), identityId: "id-hades", accountId: "acc-steam", memberId: "you", status: "Playing", priceTRY: 300, acquiredAt: "2025-01-11", ocScore: 92, ttbMedianMainH: 20 },
    { id: randId(), identityId: "id-stardew", accountId: undefined, memberId: "everyone", status: "Beaten", priceTRY: 150, acquiredAt: "2024-08-10", ocScore: 89, ttbMedianMainH: 50 },
    { id: randId(), identityId: "id-ds", accountId: "acc-steam", memberId: "you", status: "Backlog", priceTRY: 0, services: ["Game Pass"], ocScore: 85, ttbMedianMainH: 35 },
    { id: randId(), identityId: "id-fifa25", accountId: "acc-psn", memberId: "hatice", status: "Owned", priceTRY: 1800, acquiredAt: "2025-09-20", ocScore: 76, ttbMedianMainH: 25 },
  ];

  await db.members.bulkPut(members);
  await db.accounts.bulkPut(accounts);
  await db.identities.bulkPut(identities);
  await db.library.bulkPut(library);

  localStorage.setItem(key, "1");
}
