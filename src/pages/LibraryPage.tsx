import { useEffect, useMemo, useState } from "react";
import { db } from "@/db";
import type { Identity, LibraryItem, Member, Account } from "@/types";
import RightDrawer from "@/components/RightDrawer";
import ImportExport from "@/components/ImportExport";
import { pricePerHour } from "@/utils/normalize";
import { clsx } from "clsx";
import FiltersBar, { type Filters } from "@/components/FiltersBar";
import ImportWizard from "@/components/ImportWizard";


// NEW: feature flags + mocked hooks
import { flags } from "@/utils/flags";
import { useOpenCritic } from "@/hooks/useOpenCritic";
import { useIGDB } from "@/hooks/useIGDB";

type Row = LibraryItem & { identity?: Identity; member?: Member; account?: Account };

export default function LibraryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [grouped, setGrouped] = useState(true);
  const [drawer, setDrawer] = useState<{ open: boolean; row?: Row }>({ open: false });
  const [wizardOpen, setWizardOpen] = useState(false);
  useEffect(() => { console.log("[LibraryPage] wizardOpen =", wizardOpen); }, [wizardOpen]);
  const handleOpenWizard = () => { console.log("[LibraryPage] Import Wizard button clicked"); setWizardOpen(true); };


  // Handlers for deleting items and identities
  const handleDeleteItem = async (id: string, title?: string) => {
    if (!confirm(`Delete this entry${title ? `: “${title}”` : ""}? This removes only this library row (not the identity).`)) return;
    await db.library.delete(id);
    setRows(prev => prev.filter(x => x.id !== id));
  };

  // Clear all data handler
  const handleClearAll = async () => {
    if (!confirm("Clear ALL local data (identities, library, accounts, members)? This cannot be undone.")) return;

    await db.transaction('rw', db.library, db.identities, db.accounts, db.members, async () => {
      await db.library.clear();
      await db.identities.clear();
      await db.accounts.clear();
      await db.members.clear();
    });

    // Prevent auto-seed from running again on next load
    localStorage.setItem("seeded-v2", "cleared");

    location.reload();
  };

  const handleDeleteIdentityAndItems = async (identityId: string, title?: string) => {
    if (!confirm(`Delete ALL entries of “${title || identityId}” and the identity itself? This cannot be undone.`)) return;
    await db.transaction('rw', db.library, db.identities, async () => {
      await db.library.where('identityId').equals(identityId).delete();
      await db.identities.delete(identityId);
    });
    setRows(prev => prev.filter(x => x.identityId !== identityId));
  };


  // Filters state
  const [filters, setFilters] = useState<Filters>({
    duration: "any",
    value: "any",
    score: "any",
    platform: "any",
    account: "any",
    member: "any",
    status: "any",
    service: "any",
  });

  useEffect(() => {
    (async () => {
      const [lib, ids, mems, accs] = await Promise.all([
        db.library.toArray(),
        db.identities.toArray(),
        db.members.toArray(),
        db.accounts.toArray(),
      ]);
      const idMap = new Map(ids.map((x) => [x.id, x]));
      const mMap = new Map(mems.map((x) => [x.id, x]));
      const aMap = new Map(accs.map((x) => [x.id, x]));
      setRows(
        lib.map((r) => ({
          ...r,
          identity: idMap.get(r.identityId),
          member: mMap.get(r.memberId || ""),
          account: aMap.get(r.accountId || ""),
        }))
      );
    })();
  }, []);

  // Option lists for dropdowns
  const platformOpts = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.identity?.platform).filter(Boolean) as string[])).map(
        (p) => ({ label: p, value: p })
      ),
    [rows]
  );
  const accountOpts = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.account?.label).filter(Boolean) as string[])).map(
        (a) => ({ label: a, value: a })
      ),
    [rows]
  );
  const memberOpts = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.member?.name || "Everyone"))).map((m) => ({
        label: m,
        value: m,
      })),
    [rows]
  );
  const statusOpts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status))).map((s) => ({ label: s, value: s })),
    [rows]
  );
  const serviceOpts = useMemo(
    () =>
      Array.from(new Set(rows.flatMap((r) => r.services || []))).map((s) => ({
        label: s,
        value: s,
      })),
    [rows]
  );

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Duration (median main)
      if (filters.duration !== "any") {
        const h = r.ttbMedianMainH ?? 0;
        const ok =
          filters.duration === "short"
            ? h > 0 && h <= 10
            : filters.duration === "medium"
            ? h > 10 && h < 30
            : /* long */ h >= 30;
        if (!ok) return false;
      }

      // Value (₺/h)
      if (filters.value !== "any") {
        const pph =
          r.priceTRY && r.ttbMedianMainH && r.ttbMedianMainH > 0
            ? r.priceTRY / r.ttbMedianMainH
            : undefined;
        const ok =
          filters.value === "good"
            ? pph != null && pph <= 10
            : filters.value === "ok"
            ? pph != null && pph <= 20
            : /* poor */ pph != null && pph > 20;
        if (!ok) return false;
      }

      // Score
      if (filters.score !== "any") {
        const s = r.ocScore ?? 0;
        const min = filters.score === "80+" ? 80 : 70;
        if (s < min) return false;
      }

      // Platform / Account / Member / Status
      if (filters.platform !== "any" && r.identity?.platform !== filters.platform) return false;
      if (filters.account !== "any" && (r.account?.label || "—") !== filters.account) return false;
      if (filters.member !== "any" && (r.member?.name || "Everyone") !== filters.member) return false;
      if (filters.status !== "any" && r.status !== filters.status) return false;

      // Service (availability)
      if (filters.service !== "any") {
        const svcs = r.services || [];
        if (!svcs.includes(filters.service as any)) return false;
      }

      return true;
    });
  }, [rows, filters]);

  // Groups built from filtered rows
  const groups = useMemo(() => {
    const g = new Map<string, Row[]>();
    for (const r of filteredRows) {
      const k = r.member?.name || "Everyone";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(r);
    }
    return Array.from(g.entries());
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            className={clsx("btn-ghost", grouped && "font-semibold text-emerald-700")}
            onClick={() => setGrouped(true)}
          >
            Cards
          </button>
          <button
            className={clsx("btn-ghost", !grouped && "font-semibold text-emerald-700")}
            onClick={() => setGrouped(false)}
          >
            Table
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ImportExport />
          <button className="btn" onClick={handleOpenWizard}>Import Wizard</button>
        </div>
        <button
          className="btn bg-red-600 hover:bg-red-700"
          onClick={handleClearAll}
          title="Clear all local data"
        >
          Clear Profile
        </button>
      </div>

      {/* Filters bar */}
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        platforms={platformOpts}
        accounts={accountOpts}
        members={memberOpts}
        statuses={statusOpts}
        services={serviceOpts}
      />

      {grouped ? (
        <div className="space-y-6">
          {groups.map(([member, list]) => (
            <section key={member}>
              <h3 className="text-sm font-semibold text-zinc-600 mb-2">{member}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((r) => (
                  <article
                    key={r.id}
                    className="card cursor-pointer"
                    onClick={() => setDrawer({ open: true, row: r })}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-semibold">{r.identity?.title}</div>
                        <div className="text-xs text-zinc-500">{r.identity?.platform} • {r.account?.label || "—"} • {r.status}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge">{r.member?.name || "Everyone"}</span>
                        <button
                          type="button"
                          className="btn-ghost text-red-600"
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(r.id, r.identity?.title); }}
                          title="Delete this entry"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded-md bg-zinc-100">OC {r.ocScore ?? "—"}</span>
                        <span className="px-2 py-1 rounded-md bg-zinc-100">
                          TTB ~{r.ttbMedianMainH ?? "—"}h
                        </span>
                      </div>
                      <div className="text-zinc-700">
                        {pricePerHour(r.priceTRY, r.ttbMedianMainH)
                          ? `₺/h ${pricePerHour(r.priceTRY, r.ttbMedianMainH)}`
                          : "—"}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <table className="table">
          <thead>
            <th></th>
            <tr>
              <th>Title</th>
              <th>Platform</th>
              <th>Account</th>
              <th>Member</th>
              <th>Status</th>
              <th>Price</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-zinc-50 cursor-pointer"
                onClick={() => setDrawer({ open: true, row: r })}
              >
                <td>{r.identity?.title}</td>
                <td>{r.identity?.platform}</td>
                <td>{r.account?.label || "—"}</td>
                <td>{r.member?.name || "Everyone"}</td>
                <td>{r.status}</td>
                <td>{r.priceTRY ? `₺${r.priceTRY}` : "—"}</td>
                <td>{r.acquiredAt || "—"}</td>
                <td>
                  <button
                    className="btn-ghost text-red-600"
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(r.id, r.identity?.title); }}
                    title="Delete this entry"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <RightDrawer title="Edit Game" open={drawer.open} onClose={() => setDrawer({ open: false })}>
        {drawer.row && <Editor row={drawer.row} onClose={() => setDrawer({ open: false })} />}
      </RightDrawer>
      <ImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

function Editor({ row, onClose }: { row: Row; onClose: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [price, setPrice] = useState(row.priceTRY ?? 0);
  const [ttb, setTtb] = useState(row.ttbMedianMainH ?? 0);
  const [score, setScore] = useState(row.ocScore ?? 0);

  // NEW: mocked fetch buttons (disabled by flags)
  const { fetchScore } = useOpenCritic();
  const { fetchTTB } = useIGDB();
  const [busyOC, setBusyOC] = useState(false);
  const [busyTTB, setBusyTTB] = useState(false);
  const ocDisabled = !flags.openCriticEnabled || busyOC;
  const igdbDisabled = !flags.igdbEnabled || busyTTB;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await db.library.update(row.id, {
          status,
          priceTRY: price,
          ttbMedianMainH: ttb,
          ocScore: score,
        });
        onClose();
        location.reload();
      }}
    >
      <div>
        <label className="text-xs text-zinc-500">Title</label>
        <input className="input" value={row.identity?.title} readOnly />
      </div>

      <div>
        <label className="text-xs text-zinc-500">Status</label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          {["Backlog", "Playing", "Beaten", "Abandoned", "Wishlist", "Owned"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn bg-red-600 hover:bg-red-700"
            onClick={async () => {
              if (!confirm(`Delete this entry: “${row.identity?.title}”?`)) return;
              await db.library.delete(row.id);
              onClose();
              location.reload();
            }}
          >
            Delete
          </button>
          <button className="btn" type="submit">Save</button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-500">Price (₺)</label>
          <input
            className="input"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500">TTB Median (h)</label>
          <input
            className="input"
            type="number"
            value={ttb}
            onChange={(e) => setTtb(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-500">OpenCritic Score</label>
        <input
          className="input"
          type="number"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
        />
      </div>

      {/* NEW: mocked integration buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn"
          disabled={ocDisabled}
          onClick={async () => {
            if (!flags.openCriticEnabled) {
              alert("OpenCritic is disabled. Toggle it in src/utils/flags.ts");
              return;
            }
            try {
              setBusyOC(true);
              const res = await fetchScore(row.identity?.title || "");
              if (res) setScore(res.score);
            } finally {
              setBusyOC(false);
            }
          }}
        >
          {busyOC ? "Fetching OC…" : "Fetch OpenCritic"}
        </button>

        <button
          type="button"
          className="btn"
          disabled={igdbDisabled}
          onClick={async () => {
            if (!flags.igdbEnabled) {
              alert("IGDB/TTB is disabled or manual. Toggle in src/utils/flags.ts");
              return;
            }
            try {
              setBusyTTB(true);
              const res = await fetchTTB(row.identity?.title || "");
              if (res) setTtb(res.medianMainH);
            } finally {
              setBusyTTB(false);
            }
          }}
        >
          {busyTTB ? "Fetching TTB…" : "Fetch IGDB / TTB"}
        </button>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn" type="submit">
          Save
        </button>
      </div>
    </form>
  );
}
