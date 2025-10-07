import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { ensureSeed } from "@/utils/seed";

export default function App() {
  useEffect(() => { ensureSeed(); }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600"></div>
            <h1 className="text-xl font-semibold">Game Tracker</h1>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink to="/" end className={({isActive}) => (isActive ? "btn-ghost font-semibold text-emerald-700" : "btn-ghost")}>Library</NavLink>
            <NavLink to="/suggestions" className={({isActive}) => (isActive ? "btn-ghost font-semibold text-emerald-700" : "btn-ghost")}>Suggestions</NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        <Outlet />
      </main>

      <footer className="py-6 text-xs text-zinc-500 text-center">
        Offline by default • MIT License • Emerald accent • Comfortable density
      </footer>
    </div>
  );
}
