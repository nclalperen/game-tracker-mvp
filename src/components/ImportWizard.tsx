import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { db } from "@/db";
import { readCSV } from "../utils/importers";
import {
  readAndroidTakeoutCSV,
  guessFieldMap,
  rowsToEntities,
  installedScanStub,
  type FieldMap,
  type IncomingRow,
} from "../utils/importers";
import type { Platform } from "@/types";
import { normalizePlatform } from "../utils/importers";
import { ac } from "vitest/dist/chunks/reporters.nr4dxCkA.js";

type Source = "installed" | "manualCsv" | "androidCsv" | "steam";

type Step = 1 | 2 | 3 | 4;

function prevStep(s: Step): Step {
  return s === 1 ? 1 : ((s - 1) as Step);
}
function nextStep(s: Step): Step {
  return s === 4 ? 4 : ((s + 1) as Step);
}


export default function ImportWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source | null>(null);
  const [rows, setRows] = useState<IncomingRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<FieldMap>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function resetAll() {
    setStep(1);
    setSource(null);
    setRows([]);
    setHeaders([]);
    setMap({});
    setBusy(false);
    setMessage(null);
  }

  function close() {
    resetAll();
    onClose();
  }

  const canNextFrom1 = !!source;
  const canNextFrom2 = rows.length > 0;
  const canNextFrom3 = true;

  const body = useMemo(() => {
    if (step === 1) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            Choose what you want to import. Everything stays local (IndexedDB). You can also use regular JSON/CSV import from the Library page.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card
              title="Installed Scan (Windows)"
              desc="Browser-limited; shows a friendly explanation and alternatives."
              selected={source === "installed"}
              onClick={() => setSource("installed")}
            />
            <Card
              title="Manual CSV"
              desc="Import a custom CSV (Steam/Epic/PSN/Xbox/Switch exports)."
              selected={source === "manualCsv"}
              onClick={() => setSource("manualCsv")}
            />
            <Card
              title="Android Takeout CSV"
              desc="Google Takeout for Play Games library; CSV parsing supported."
              selected={source === "androidCsv"}
              onClick={() => setSource("androidCsv")}
            />
            <Card
              title="Steam (public profile)"
              desc="Import your Steam library via Steam Web API."
              selected={source === "steam"}
              onClick={() => setSource("steam")}
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      if (source === "steam") {
        return (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Requires your SteamID64 (not your custom URL).{" "}
              <a
                href="https://steamid.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 underline"
              >
                Find your SteamID64
              </a>
              . Your profile must be public.
            </p>
            <SteamForm
              onFetched={(gs) => {
                // Convert to rows the importer understands (Title only; account auto detect = Steam)
                const rs = gs.map(g => ({ Title: `${g.name} https://store.steampowered.com/app/${g.appid}` }));
                setRows(rs);
                const hs = Object.keys(rs[0] || {});
                setHeaders(hs);
                setMap({ title: "Title"  })
                setMessage(`${rs.length} game(s) fetched from Steam.`);
              }}
            />
          </div>
        );
      }

      if (source === "installed") {
        const stub = installedScanStub();
        return (
          <div className="space-y-3">
            <p className="text-sm">{stub.message}</p>
            <ul className="list-disc pl-5 text-sm text-zinc-600">
              <li>Use **Export CSV** from your store/launcher (Steam, Epic, PSN, Xbox, Switch).</li>
              <li>Or use **Export JSON/CSV** from the Library page to see the expected format.</li>
              <li>Android users: Google Takeout → Play Games → CSV → choose “Android Takeout CSV”.</li>
            </ul>
          </div>
        );
      }

      // manualCsv or androidCsv
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            Upload your CSV. We’ll try to guess columns and let you adjust mappings.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              const rs =
                source === "androidCsv" ? readAndroidTakeoutCSV(text) : readCSV(text);
              setRows(rs);
              const hs = Object.keys(rs[0] || {});
              setHeaders(hs);
              setMap(guessFieldMap(hs));
              setMessage(`${rs.length} row(s) parsed.`);
            }}
          />
          {message && <div className="text-xs text-emerald-700">{message}</div>}
          {headers.length > 0 && (
            <div className="mt-3 space-y-2">
              <MappingRow label="Title" value={map.title} onChange={(v) => setMap({ ...map, title: v })} headers={headers} />
              <MappingRow label="Platform" value={map.platform} onChange={(v) => setMap({ ...map, platform: v })} headers={headers} />
              <MappingRow label="Status" value={map.status} onChange={(v) => setMap({ ...map, status: v })} headers={headers} />
              <MappingRow label="Member" value={map.memberId} onChange={(v) => setMap({ ...map, memberId: v })} headers={headers} />
              <MappingRow label="Account" value={map.accountId} onChange={(v) => setMap({ ...map, accountId: v })} headers={headers} />
              <MappingRow label="Price (₺)" value={map.priceTRY} onChange={(v) => setMap({ ...map, priceTRY: v })} headers={headers} />
              <MappingRow label="Date" value={map.acquiredAt} onChange={(v) => setMap({ ...map, acquiredAt: v })} headers={headers} />
              <MappingRow label="OpenCritic" value={map.ocScore} onChange={(v) => setMap({ ...map, ocScore: v })} headers={headers} />
              <MappingRow label="TTB (h)" value={map.ttbMedianMainH} onChange={(v) => setMap({ ...map, ttbMedianMainH: v })} headers={headers} />
              <MappingRow label="Services" value={map.services} onChange={(v) => setMap({ ...map, services: v })} headers={headers} />
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      // Preview
      const preview = rows.slice(0, 5);
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            Review a small preview. If it looks right, continue to import.
          </p>
          <div className="overflow-auto border border-zinc-200 rounded-lg">
            <table className="table">
              <thead>
                <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    {headers.map((h) => <td key={h}>{r[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">Showing {preview.length} of {rows.length} row(s).</p>
        </div>
      );
    }

    // step === 4 — Import
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">
          Importing will merge into your local database. Nothing is sent anywhere.
        </p>
        <button
          className="btn"
          disabled={busy || rows.length === 0}
          onClick={async () => {
            if (!map.title) {
              alert("Please map the Title column before importing.");
              return;
            }

            try {
              setBusy(true);

              const { identities, library } = rowsToEntities(rows, map);

              if (identities.length === 0 && library.length === 0) {
                console.warn("[Import] No valid rows. Check Title mapping.", { map, sample: rows.slice(0, 3) });
                alert("Nothing to import. Check your Title mapping.");
                return;
              }

              console.log("[Import] Pre-resolve counts:", { identities: identities.length, library: library.length });

              // Resolve Members/Accounts by name/label (create if new)
              const [existingMembers, existingAccounts, existingIdentities] = await Promise.all([
                db.members.toArray(),
                db.accounts.toArray(),
                db.identities.toArray(),
              ]);

              const memberByName = new Map(existingMembers.map(m => [m.name.trim().toLowerCase(), m]));
              const accountByLabel = new Map(existingAccounts.map(a => [a.label.trim().toLowerCase(), a]));

              if (!memberByName.has("everyone")) {
                const everyone = { id: "everyone", name: "Everyone" };
                await db.members.put(everyone);
                memberByName.set("everyone", everyone);
              }

              const toPutMembers: any[] = [];
              const toPutAccounts: any[] = [];

              const resolvedLibrary = library.map(li => {
                // Member: treat text as name and resolve/create
                let memberId = li.memberId;
                if (memberId && !existingMembers.find(m => m.id === memberId)) {
                  const byName = memberByName.get(memberId.trim().toLowerCase());
                  if (byName) memberId = byName.id;
                  else if (memberId.toLowerCase() !== "everyone") {
                    const newMember = { id: `m-${crypto.randomUUID()}`, name: memberId };
                    toPutMembers.push(newMember);
                    memberByName.set(memberId.trim().toLowerCase(), newMember);
                    memberId = newMember.id;
                  } else memberId = "everyone";
                } else if (!memberId) {
                  memberId = "everyone";
                }

                // Account: treat text as label and resolve/create
                let accountId = li.accountId;
                const accountLabel = li.accountId ?? '';

                if (accountId && !existingAccounts.find(a => a.id === accountLabel)) {
                  //resolve by label case-insensitive
                  const byLabel = accountByLabel.get(accountLabel.trim().toLowerCase());
                  if (byLabel) {
                    accountId = byLabel.id;
                  } else {
                    // infer platform from identity (fall back to PC)
                    const ident = existingIdentities.find(i => i.id === li.identityId);
                    const platform: Platform = ident?.platform ?? "PC";
                    const newAcc = { id: `a-${crypto.randomUUID()}`, platform, label: accountLabel };
                    toPutAccounts.push(newAcc);
                    accountByLabel.set(accountLabel.trim().toLowerCase(), newAcc);
                    accountId = newAcc.id;
                  }
                } else if (!accountLabel) {
                  accountId = undefined;
                }
                    
                return { ...li, memberId, accountId };
              });

              await db.transaction("rw", db.members, db.accounts, db.identities, db.library, async () => {
                if (toPutMembers.length)   await db.members.bulkPut(toPutMembers);
                if (toPutAccounts.length)  await db.accounts.bulkPut(toPutAccounts);
                if (identities.length)     await db.identities.bulkPut(identities);
                if (resolvedLibrary.length) await db.library.bulkPut(resolvedLibrary);
              });

              console.log("[Import] Saved:", {
                newMembers: toPutMembers.length,
                newAccounts: toPutAccounts.length,
                identities: identities.length,
                library: resolvedLibrary.length,
              });

              alert(
                `Imported:\n` +
                `• ${identities.length} identities\n` +
                `• ${resolvedLibrary.length} library entries\n` +
                (toPutMembers.length ? `• ${toPutMembers.length} member(s) created\n` : "") +
                (toPutAccounts.length ? `• ${toPutAccounts.length} account(s) created\n` : "")
              );

              close();
              location.reload();
            } catch (err: any) {
              console.error("[Import] failed", err);
              alert(`Import failed: ${err?.message || err}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Importing…" : "Import now"}
        </button>
      </div>
    );
  }, [step, source, rows, headers, map, busy]);

  return (
    <Modal open={open} title="Import Wizard" onClose={close}>
      {/* Stepper header */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        {["1. Source", "2. Map", "3. Review", "4. Import"].map((t, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          return (
            <span key={t} className={`px-2 py-1 rounded ${step === n ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>
              {t}
            </span>
          );
        })}
      </div>

      {body}

      {/* Footer nav */}
      <div className="mt-4 flex items-center justify-between">
        <button className="btn-ghost" onClick={close}>Cancel</button>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            disabled={step === 1}
            onClick={() => setStep((s) => prevStep(s))}
          >
            Back
          </button>
          <button
            className="btn"
            disabled={(step === 1 && !canNextFrom1) || (step === 2 && !canNextFrom2)}
            onClick={() => setStep((s) => nextStep(s))}
          >
            Next
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Card({
  title, desc, selected, onClick
}: { title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left card ${selected ? "ring-2 ring-emerald-500" : ""}`}
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-zinc-600 mt-1">{desc}</div>
    </button>
  );
}

function MappingRow({
  label, value, onChange, headers
}: {
  label: string; value?: string; onChange: (v: string|undefined) => void; headers: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-28 text-zinc-500">{label}</span>
      <select
        className="select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">—</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </label>
  );
}

import { fetchSteamOwnedGames } from "@/connectors/steam";
import { flags } from "../utils/flags";

function SteamForm({ onFetched }: { onFetched: (games: any[]) => void }) {
  const [steamId, setSteamId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  if (!flags.steamImportEnabled) {
    return <div className="text-sm text-zinc-500">Steam import is not enabled. Toggle it in the settings.</div>;
  }

  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault();
      try {
        setBusy(true);
        const games = await fetchSteamOwnedGames(steamId.trim(), apiKey.trim());
        onFetched(games);
      } catch (err: any) {
        alert(err?.message || String(err));
      } finally {
        setBusy(false);
      }
    }}>
      <div>
        <label className="text-xs text-zinc-500">SteamID64</label>
        <input className="input" placeholder="7656119xxxxxxxxxx" value={steamId} onChange={(e)=>setSteamId(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">Steam Web API Key</label>
        <input className="input" placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} />
      </div>
      <button className="btn" disabled={busy || !steamId || !apiKey}>{busy ? "Fetching…" : "Fetch Library"}</button>
    </form>
  );
}