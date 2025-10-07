# Game Tracker – MVP (PWA first)

**Date:** 2025-10-06

This is the minimal, runnable skeleton matching the requested MVP design.

## Highlights
- React + TypeScript + Tailwind (emerald accent; comfy density)
- PWA-ready: `manifest.webmanifest` + simple offline service worker
- IndexedDB via Dexie with migrations scaffold
- Pages: **Library** (Cards grouped by Member + Table toggle) and **Suggestions**
- Right drawer editor for quick edits
- Import/Export JSON/CSV + Import Wizard placeholder
- Hooks for OpenCritic & IGDB (mocked; feature flags off by default)
- Heuristic suggestions (Play Next, Buy/Claim stub)
- Unit tests with Vitest for utils (normalize/dedupe/csv)

## Run
```bash
pnpm i   # or npm i / yarn
pnpm dev # http://localhost:5173
```

## Build
```bash
pnpm build && pnpm preview
```

## Feature Flags (default OFF)
- `src/utils/flags.ts`: enable integrations (OpenCritic, IGDB, Steam prices) when you're ready. No external calls by default.

## Data model
- `src/types.ts`, `src/db.ts`
- Entities: **Identity**, **LibraryItem**, **Account**, **Member**
- Services (Game Pass / EA Play Pro) are *availability*, not ownership

## TODOs
- Import Wizard (Xbox/Switch manual, Android Takeout CSV)
- OpenCritic & IGDB connectors (on-demand)
- Deals / regional price fetch (opt-in only)
- Tauri packaging later
- More filters (duration, value ₺/h, score, platform/account/member/status/service)
- Member chips in UI header for quick scoping
- Cards: show identity title prominently; include platform/account/status; OC/TTB and ₺/h pills; click to edit

MIT License.
