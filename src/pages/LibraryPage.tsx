import { useEffect, useMemo, useState } from "react";
import { db } from "@/db";
import type { Identity, LibraryItem, Member, Account } from "@/types";
import RightDrawer from "@/components/RightDrawer";
import ImportExport from "@/components/ImportExport";
import { pricePerHour } from "@/utils/normalize";
import { clsx } from "clsx";

type Row = LibraryItem & { identity?: Identity, member?: Member, account?: Account };

export default function LibraryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [grouped, setGrouped] = useState(true);
  const [drawer, setDrawer] = useState<{open: boolean, row?: Row}>({open:false});

  useEffect(() => {
    (async () => {
      const [lib, ids, mems, accs] = await Promise.all([
        db.library.toArray(),
        db.identities.toArray(),
        db.members.toArray(),
        db.accounts.toArray(),
      ]);
      const idMap = new Map(ids.map(x => [x.id, x]));
      const mMap = new Map(mems.map(x => [x.id, x]));
      const aMap = new Map(accs.map(x => [x.id, x]));
      setRows(lib.map(r => ({...r, identity: idMap.get(r.identityId), member: mMap.get(r.memberId || ""), account: aMap.get(r.accountId || "")})));
    })();
  }, []);

  const groups = useMemo(() => {
    const g = new Map<string, Row[]>();
    for (const r of rows) {
      const k = (r.member?.name || "Everyone");
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(r);
    }
    return Array.from(g.entries());
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className={clsx("btn-ghost", grouped && "font-semibold text-emerald-700")} onClick={() => setGrouped(true)}>Cards</button>
          <button className={clsx("btn-ghost", !grouped && "font-semibold text-emerald-700")} onClick={() => setGrouped(false)}>Table</button>
        </div>
        <div className="flex items-center gap-2">
          <ImportExport />
          <button className="btn">Import Wizard</button>
        </div>
      </div>

      {grouped ? (
        <div className="space-y-6">
          {groups.map(([member, list]) => (
            <section key={member}>
              <h3 className="text-sm font-semibold text-zinc-600 mb-2">{member}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((r) => (
                  <article key={r.id} className="card cursor-pointer" onClick={() => setDrawer({open:true, row:r})}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-semibold">{r.identity?.title}</div>
                        <div className="text-xs text-zinc-500">{r.identity?.platform} • {r.account?.label || "—"} • {r.status}</div>
                      </div>
                      <span className="badge">{r.member?.name || "Everyone"}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded-md bg-zinc-100">OC {r.ocScore ?? "—"}</span>
                        <span className="px-2 py-1 rounded-md bg-zinc-100">TTB ~{r.ttbMedianMainH ?? "—"}h</span>
                      </div>
                      <div className="text-zinc-700">{pricePerHour(r.priceTRY, r.ttbMedianMainH) ? `₺/h ${pricePerHour(r.priceTRY, r.ttbMedianMainH)}` : "—"}</div>
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
            <tr>
              <th>Title</th><th>Platform</th><th>Account</th><th>Member</th><th>Status</th><th>Price</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => setDrawer({open:true, row:r})}>
                <td>{r.identity?.title}</td>
                <td>{r.identity?.platform}</td>
                <td>{r.account?.label || "—"}</td>
                <td>{r.member?.name || "Everyone"}</td>
                <td>{r.status}</td>
                <td>{r.priceTRY ? `₺${r.priceTRY}` : "—"}</td>
                <td>{r.acquiredAt || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <RightDrawer title="Edit Game" open={drawer.open} onClose={() => setDrawer({open:false})}>
        {drawer.row && <Editor row={drawer.row} onClose={() => setDrawer({open:false})} />}
      </RightDrawer>
    </div>
  );
}

function Editor({ row, onClose }: { row: Row, onClose: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [price, setPrice] = useState(row.priceTRY ?? 0);
  const [ttb, setTtb] = useState(row.ttbMedianMainH ?? 0);
  const [score, setScore] = useState(row.ocScore ?? 0);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      await db.library.update(row.id, { status, priceTRY: price, ttbMedianMainH: ttb, ocScore: score });
      onClose();
      location.reload();
    }}>
      <div>
        <label className="text-xs text-zinc-500">Title</label>
        <input className="input" value={row.identity?.title} readOnly />
      </div>
      <div>
        <label className="text-xs text-zinc-500">Status</label>
        <select className="select" value={status} onChange={e => setStatus(e.target.value as any)}>
          {["Backlog","Playing","Beaten","Abandoned","Wishlist","Owned"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-500">Price (₺)</label>
          <input className="input" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">TTB Median (h)</label>
          <input className="input" type="number" value={ttb} onChange={e => setTtb(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-500">OpenCritic Score</label>
        <input className="input" type="number" value={score} onChange={e => setScore(Number(e.target.value))} />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Save</button>
      </div>
    </form>
  );
}
