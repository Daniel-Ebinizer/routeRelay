/**
 * Demo state store. Persists to localStorage and syncs across browser tabs so
 * the Admin view (one tab) and Student view (another tab) update together.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BUSES, busById, stopById, type BusStatus } from "./demo-data";
import {
  initialState,
  rebase,
  type Alert,
  type AlertKind,
  type Plan,
  type RecoveryOption,
  type SimState,
} from "./sim";
import { atSimMin } from "./format";

const KEY = "routerelay-demo-v2";

type Store = {
  state: SimState;
  now: number;
  setStatus: (busId: string, status: BusStatus, delayMin?: number) => void;
  setOccupancy: (busId: string, occupancy: number) => void;
  setSpeed: (speed: number) => void;
  broadcast: (title: string, body: string, kind: AlertKind) => void;
  confirmPlan: (opt: RecoveryOption, fromStopId: string) => void;
  cancelPlan: () => void;
  dismissAlert: (id: string) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

function load(): SimState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SimState;
      if (parsed.version === 2 && parsed.buses) return parsed;
    }
  } catch {
    /* ignore corrupted demo state */
  }
  return initialState(Date.now());
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Load after hydration (localStorage + clock are browser-only).
  useEffect(() => {
    setState(load());
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setState(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (s: SimState, t: number) => SimState) => {
    setState((s) => (s ? fn(s, Date.now()) : s));
  }, []);

  const pushAlert = (s: SimState, a: Omit<Alert, "id">): Alert[] =>
    [{ ...a, id: uid() }, ...s.alerts].slice(0, 30);

  const setStatus = useCallback<Store["setStatus"]>(
    (busId, status, delayMin = 10) =>
      update((s, t) => {
        const bus = busById(busId);
        const live = rebase(bus, s.buses[busId], t, s.speed);
        const next = {
          ...live,
          status,
          holdUntil: status === "delayed" ? t + (delayMin * 60000) / s.speed : null,
        };
        const text =
          status === "delayed"
            ? { kind: "warning" as const, title: `Bus ${bus.number} delayed by ${delayMin} min`, body: "Updated by transport office." }
            : status === "breakdown"
              ? { kind: "danger" as const, title: `Bus ${bus.number} out of service`, body: "Breakdown reported. Use “I missed my bus” to find another bus." }
              : { kind: "success" as const, title: `Bus ${bus.number} back on time`, body: "Service running normally." };
        return {
          ...s,
          buses: { ...s.buses, [busId]: next },
          alerts: pushAlert(s, { ...text, at: t, busId }),
        };
      }),
    [update],
  );

  const setOccupancy = useCallback<Store["setOccupancy"]>(
    (busId, occupancy) =>
      update((s) => ({ ...s, buses: { ...s.buses, [busId]: { ...s.buses[busId], occupancy } } })),
    [update],
  );

  const setSpeed = useCallback<Store["setSpeed"]>(
    (speed) =>
      update((s, t) => {
        const buses = { ...s.buses };
        for (const bus of BUSES) {
          const live = rebase(bus, s.buses[bus.id], t, s.speed);
          const remaining = live.holdUntil ? ((live.holdUntil - t) / 60000) * s.speed : 0;
          buses[bus.id] = { ...live, holdUntil: remaining > 0 ? t + (remaining * 60000) / speed : null };
        }
        return { ...s, speed, buses };
      }),
    [update],
  );

  const broadcast = useCallback<Store["broadcast"]>(
    (title, body, kind) => update((s, t) => ({ ...s, alerts: pushAlert(s, { title, body, kind, at: t }) })),
    [update],
  );

  const confirmPlan = useCallback<Store["confirmPlan"]>(
    (opt, fromStopId) =>
      update((s, t) => {
        if (!opt.boardStopId || opt.etaMin == null) return s;
        const plan: Plan = {
          busId: opt.busId,
          fromStopId,
          boardStopId: opt.boardStopId,
          walkMin: opt.walkMin,
          walkM: opt.walkM,
          boardAt: atSimMin(t, opt.etaMin, s.speed),
          arriveAt: atSimMin(t, opt.campusMin, s.speed),
          createdAt: t,
        };
        const bus = busById(opt.busId);
        return {
          ...s,
          plan,
          alerts: pushAlert(s, {
            kind: "success",
            at: t,
            busId: opt.busId,
            title: `Recovery plan: Bus ${bus.number}`,
            body: `Board at ${stopById(opt.boardStopId).name}. Driver notified (demo).`,
          }),
        };
      }),
    [update],
  );

  const cancelPlan = useCallback(() => update((s) => ({ ...s, plan: null })), [update]);
  const dismissAlert = useCallback(
    (id: string) => update((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) })),
    [update],
  );
  const reset = useCallback(() => setState(initialState(Date.now())), []);

  const value = useMemo(
    () =>
      state && {
        state,
        now,
        setStatus,
        setOccupancy,
        setSpeed,
        broadcast,
        confirmPlan,
        cancelPlan,
        dismissAlert,
        reset,
      },
    [state, now, setStatus, setOccupancy, setSpeed, broadcast, confirmPlan, cancelPlan, dismissAlert, reset],
  );

  if (!value) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading demo…
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside DemoStoreProvider");
  return v;
}
