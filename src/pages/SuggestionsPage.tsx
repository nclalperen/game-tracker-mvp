import { useEffect, useMemo, useState } from "react";
import { db } from "@/db";
import type { LibraryItem } from "@/types";
import { computeSuggestions, type Weights } from "@/utils/suggest";

export default function SuggestionsPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [weights, setWeights] = useState<Weights>({
    backlogBoost: 1.0,
    valueWeight: 1.0,
    scoreWeight: 1.0,
    durationWeight: 0.0,
  });

  useEffect(() => {
    (async () => {
      setItems(await db.library.toArray());
    })();
  }, []);

  const sug = useMemo(() => computeSuggestions(items, weights), [items, weights]);

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="font-semibold mb-3">Heuristic Weights</div>
        <div className="grid sm:grid-cols-4 gap-2">
          {Object.entries(weights).map(([k, v]) => (
            <div key={k}>
              <label className="text-xs text-zinc-500">{k}</label>
              <input className="input" type="number" step="0.1" value={v} onChange={e => setWeights({...weights, [k]: Number(e.target.value)})} />
            </div>
          ))}
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-600">Play Next</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sug.filter(s => s.kind === "PlayNext").slice(0, 9).map(s => (
          <article key={s.id} className="card">
            <div className="text-base font-semibold">{s.item.identityId}</div>
            <div className="mt-2 flex flex-wrap gap-1">{s.reason.map(r => <span key={r} className="badge">{r}</span>)}</div>
            <div className="mt-2 text-xs text-zinc-500">score {s.score}</div>
          </article>
        ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-600">Buy / Claim (stub)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sug.filter(s => s.kind === "BuyClaim").slice(0, 9).map(s => (
          <article key={s.id} className="card">
            <div className="text-base font-semibold">{s.item.identityId}</div>
            <div className="mt-2 flex flex-wrap gap-1">{s.reason.map(r => <span key={r} className="badge">{r}</span>)}</div>
            <div className="mt-2 text-xs text-zinc-500">score {s.score}</div>
            <div className="mt-2 text-xs text-zinc-500">Deals: (coming soon)</div>
          </article>
        ))}
        </div>
      </section>

      <div className="text-xs text-zinc-500">OpenCritic & IGDB buttons will appear on Library editor cards (mocked until keys added).</div>
    </div>
  );
}
