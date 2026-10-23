<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## RouteRelay architecture
- No backend: all demo state lives in `src/lib/store.tsx` (React context + localStorage, synced across tabs) so the prototype runs offline for a live demo.
- Simulation and recovery rules are pure functions in `src/lib/sim.ts`, tested in `src/test/recovery.test.ts`; keep UI free of ETA/recovery math.
- Bus positions are time-based (anchor + elapsed), not ticked, so every tab computes identical positions; rebase before changing status or speed.
- The map is an SVG schematic (`CampusMap`), not Leaflet, to avoid SSR/browser-only import risk and to never imply real GPS.
- The store renders only after hydration (localStorage/clock are browser-only), avoiding SSR mismatches.
