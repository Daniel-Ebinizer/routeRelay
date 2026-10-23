# RouteRelay — Smart College Bus Recovery (prototype)

College project prototype based on the RouteRelay Venture Viability Analysis
(KITS Warangal · Wadhwani Foundation). It focuses on one job: **when a student
misses their college bus, get them onto another bus to campus.**

> **Demo data only.** All students, buses, drivers, stops and fares are fictional.
> Bus positions are **simulated from a timetable in the browser — not live GPS.**

## Features

| Page | What it does |
| --- | --- |
| `/` Student dashboard | Assigned bus, assigned stop, ETA, status, capacity, alerts, route map, other buses at your stop |
| `/recover` Missed-bus recovery | 1) pick your stop → 2) alternative buses from that stop and walkable nearby stops (ETA, spare minutes, status, estimated capacity, campus arrival) → 3) route summary → 4) confirmation |
| `/admin` Transport admin | Set each bus On time / Delayed (+min) / Breakdown, adjust occupancy, broadcast alerts, 1×/5× time, reset demo |
| `/guide` Demo guide | Setup steps and the live demo script |

Admin changes appear instantly in the student view — even in another browser tab
(state is kept in `localStorage` and synced across tabs).

Out of scope: real GPS, payments, login/accounts, analytics, full fleet management.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm run dev      # open the printed http://localhost address
npm test         # recovery-logic tests
```

## Project structure

```
src/
  lib/demo-data.ts      fictional stops, buses, timetable, student (edit demo data here)
  lib/sim.ts            pure logic: simulated positions, ETAs, recovery options
  lib/store.tsx         demo state (localStorage + cross-tab sync) and actions
  lib/format.ts         time formatting helpers
  components/rr/        CampusMap (SVG schematic map), AlertsList, StatusPill, AppHeader
  routes/               index (student), recover, admin, guide, __root (layout)
  test/recovery.test.ts recovery rules tests
  styles.css            design tokens (colours, fonts)
```

The map is a hand-drawn SVG schematic rather than Leaflet/OpenStreetMap: it works
offline, never breaks on server rendering, and can't be mistaken for real GPS.

## 3-minute demo script

1. **Dashboard** — Priya's Bus 3 has just departed Kazipet Junction (red banner).
2. Tap **I missed my bus** → keep Kazipet Junction → **Find buses**.
3. Compare options: walk time, bus ETA, spare minutes, campus arrival, capacity.
   Bus 3 can still be caught at its next stop; Bus 9 is nearly full.
4. Pick **Fastest to campus** → review route summary → **Confirm**. Dashboard shows the plan.
5. Open **Admin** in a second tab → mark the chosen bus **Breakdown**.
   The student tab shows an alert and a "Find another bus" warning.
6. Tap **Find another bus** — the broken bus is listed as unavailable.
7. Admin → **Reset demo** to start over.

## Built with

React 19 + Vite (TanStack Start), TypeScript, Tailwind CSS, lucide icons, sonner toasts.
