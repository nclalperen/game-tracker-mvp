import { parseCSV } from "@/utils/csv";
import type { LibraryItem, Identity, Platform, Status } from "@/types";
import { nanoid } from "@/utils/uid";

/** Generic row incoming from CSV UI */
export type IncomingRow = Record<string, string>;

// Extract a sensible title from a string (remove URLs, suffixes, etc)
export function extractTitle(s: string): string {
  if (!s) return "";
  // remove URLs
  const withoutUrl = s.replace(/https?:\/\/\S+/g, "").trim();
  // split by common separators (":", " - ", " — ", "–")
  const first = withoutUrl.split(/\s*[:|\u2013|\u2014|-]\s*/)[0]?.trim();
  return first || withoutUrl;
}

// Detect platform/account from a given text (URL, string)
export function detectAccountFromText(s?: string): { label: string; platform: Platform } | undefined {
  if (!s) return;
  const t = s.toLowerCase();
  if (t.includes("store.steampowered.com") || t.includes("steam://")) {
    return { label: "Steam", platform: "PC" };
  }
  return undefined;
}


export type FieldMap = {
  title?: string;               // "Title" or "Game"
  platform?: string;            // "Platform" or "System"
  status?: string;              // "Status"
  memberId?: string;            // "Member"
  accountId?: string;           // "Account"
  priceTRY?: string;            // "Price"
  acquiredAt?: string;          // "Date"
  ocScore?: string;             // "OC"
  ttbMedianMainH?: string;      // "TTB"
  services?: string;            // "Services" (comma separated)
};

/** CSV → rows */
export function readCSV(text: string): IncomingRow[] {
  return parseCSV(text);
}

// Type guards
export function isPlatform(x: any): x is Platform {
  return x === "PC" || x === "Xbox" || x === "PlayStation" || x === "Switch" || x === "Android";
}

/** Best-effort mapping suggestions by header names */
export function guessFieldMap(headers: string[]): FieldMap {
  const find = (names: string[]) =>
    headers.find(h => names.map(n => n.toLowerCase()).includes(h.trim().toLowerCase()));

  return {
    title: find(["title","game","name"]),
    platform: find(["platform","system"]),
    status: find(["status","state"]),
    memberId: find(["member","owner","who"]),
    accountId: find(["account","store","launcher"]),
    priceTRY: find(["price","price_try","price (try)"]),
    acquiredAt: find(["date","acquired","purchased"]),
    ocScore: find(["oc","openscore","opencritic"]),
    ttbMedianMainH: find(["ttb","howlong","hours","main"]),
    services: find(["services","availability","game pass","ea play"]),
  };
}

/** Normalize Platform string */
export function normalizePlatform(s?: string): Platform | undefined {
  if (!s) return undefined;
  const t = s.trim().toLowerCase();
  if (/(pc|steam|epic|gog)/.test(t)) return "PC";
  if (/xbox/.test(t)) return "Xbox";
  if (/(ps|playstation)/.test(t)) return "PlayStation";
  if (/switch|nintendo/.test(t)) return "Switch";
  if (/android|mobile/.test(t)) return "Android";
  return undefined;
}

/** Normalize Status string */
export function normalizeStatus(s?: string): Status | undefined {
  if (!s) return undefined;
  const t = s.trim().toLowerCase();
  if (/backlog/.test(t)) return "Backlog";
  if (/play(ing)?/.test(t)) return "Playing";
  if (/beat|clear|finished/.test(t)) return "Beaten";
  if (/abandon|drop/.test(t)) return "Abandoned";
  if (/wish/.test(t)) return "Wishlist";
  if (/own|library|purchased/.test(t)) return "Owned";
  return undefined;
}

/** Build entity payloads from mapped incoming rows (no external calls) */
export function rowsToEntities(rows: IncomingRow[], map: FieldMap) {
  const identities: Identity[] = [];
  const library: LibraryItem[] = [];

  const idByKey = new Map<string, string>(); // title+platform → identityId

  for (const r of rows) {
    const raw = (map.title ? r[map.title] : "")?.trim();
    const title = extractTitle(raw);
    if (!title) continue;

    const platform = normalizePlatform(map.platform ? r[map.platform] : undefined) ?? "PC";

    let accountIdText = (map.accountId ? r[map.accountId] : "").trim();
    if (!accountIdText) {
      const acc = detectAccountFromText(raw);
      if (acc) accountIdText = acc.label;
    }
    const key = `${title.toLowerCase()}__${platform}`;
    let identityId = idByKey.get(key);
    if (!identityId) {
      identityId = `id-${nanoid()}`;
      identities.push({ id: identityId, title, platform });
      idByKey.set(key, identityId);
    }

    const status = normalizeStatus(map.status ? r[map.status] : undefined) ?? "Backlog";
    const memberId = (map.memberId ? r[map.memberId] : "").trim() || "everyone";
    const accountId = (map.accountId ? r[map.accountId] : "").trim() || undefined;

    const priceTRY = map.priceTRY && r[map.priceTRY] ? Number(r[map.priceTRY]) : undefined;
    const acquiredAt = map.acquiredAt ? (r[map.acquiredAt] || undefined) : undefined;
    const ocScore = map.ocScore && r[map.ocScore] ? Number(r[map.ocScore]) : undefined;
    const ttb = map.ttbMedianMainH && r[map.ttbMedianMainH] ? Number(r[map.ttbMedianMainH]) : undefined;

    const services = map.services && r[map.services]
      ? r[map.services].split(/[,;]/).map(s => s.trim()).filter(Boolean) as any[]
      : undefined;

    library.push({
      id: nanoid(),
      identityId,
      accountId: accountIdText || undefined,
      memberId,
      status,
      priceTRY,
      acquiredAt,
      services,
      ocScore,
      ttbMedianMainH: ttb,
      title
    });
  }

  return { identities, library };
}

/** Browser can’t scan installs; provide a friendly stub result */
export function installedScanStub() {
  return {
    ok: false,
    message:
      "Installed Scan is limited in the browser for privacy/sandbox reasons. Use manual CSV export from stores (Steam/Epic/PSN/Xbox/Switch) or Android Takeout CSV.",
  };
}

/** Android Takeout: accept CSV text and map a sensible subset */
export function readAndroidTakeoutCSV(text: string) {
  // Different exports exist; we just return rows (as strings) for mapping.
  const rows = parseCSV(text);
  return rows;
}
