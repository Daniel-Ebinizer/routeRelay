/**
 * Pure simulation + recovery logic. No React, no storage — easy to test.
 * Bus positions are computed from a timetable and the clock (SIMULATED, not GPS).
 */
import {
  BUSES,
  CAMPUS_ID,
  INITIAL_BUSES,
  METERS_PER_UNIT,
  NEARBY_M,
  STOPS,
  STUDENT,
  WALK_M_PER_MIN,
  busById,
  stopById,
  type Bus,
  type BusStatus,
} from "./demo-data";

export type BusLive = {
  status: BusStatus;
  /** Real timestamp (ms) at which anchorMin was true. */
  anchorAt: number;
  /** Minutes travelled along the route at anchorAt. */
  anchorMin: number;
  /** While now < holdUntil the bus is held (delayed) and does not move. */
  holdUntil: number | null;
  occupancy: number;
};

export type AlertKind = "info" | "warning" | "danger" | "success";
export type Alert = {
  id: string;
  at: number;
  kind: AlertKind;
  title: string;
  body: string;
  busId?: string;
};

export type Plan = {
  busId: string;
  fromStopId: string;
  boardStopId: string;
  walkMin: number;
  walkM: number;
  boardAt: number;
  arriveAt: number;
  createdAt: number;
};

export type SimState = {
  version: 2;
  resetAt: number;
  /** Simulated minutes per real minute. */
  speed: number;
  buses: Record<string, BusLive>;
  alerts: Alert[];
  plan: Plan | null;
};

const MS_MIN = 60_000;

export const routeTotal = (bus: Bus) => bus.route[bus.route.length - 1].atMin;

export function holdRemainingMin(live: BusLive, now: number, speed: number) {
  if (!live.holdUntil) return 0;
  return (Math.max(0, live.holdUntil - now) / MS_MIN) * speed;
}

/** Minutes travelled along the route at time `now`. */
export function posMin(bus: Bus, live: BusLive, now: number, speed: number) {
  if (live.status === "breakdown") return live.anchorMin;
  const start = Math.max(live.anchorAt, live.holdUntil ?? 0);
  const moved = (Math.max(0, now - start) / MS_MIN) * speed;
  return Math.min(routeTotal(bus), live.anchorMin + moved);
}

/** Freeze the current position as the new anchor (call before changing status/speed). */
export function rebase(bus: Bus, live: BusLive, now: number, speed: number): BusLive {
  return {
    ...live,
    anchorMin: posMin(bus, live, now, speed),
    anchorAt: now,
    holdUntil: live.holdUntil && live.holdUntil > now ? live.holdUntil : null,
  };
}

export type Eta =
  | { state: "upcoming"; min: number }
  | { state: "passed" }
  | { state: "not_served" }
  | { state: "unavailable" };

const PASSED_EPS = 0.05;

export function etaToStop(
  bus: Bus,
  live: BusLive,
  stopId: string,
  now: number,
  speed: number,
): Eta {
  const rs = bus.route.find((r) => r.stopId === stopId);
  if (!rs) return { state: "not_served" };
  const pos = posMin(bus, live, now, speed);
  if (pos > rs.atMin + PASSED_EPS) return { state: "passed" };
  if (live.status === "breakdown") return { state: "unavailable" };
  return { state: "upcoming", min: holdRemainingMin(live, now, speed) + (rs.atMin - pos) };
}

export function minutesToCampus(bus: Bus, live: BusLive, now: number, speed: number) {
  if (live.status === "breakdown") return Infinity;
  return holdRemainingMin(live, now, speed) + (routeTotal(bus) - posMin(bus, live, now, speed));
}

export type Tone = "success" | "warning" | "danger" | "muted";
export function displayStatus(bus: Bus, live: BusLive, now: number, speed: number) {
  const pos = posMin(bus, live, now, speed);
  if (live.status === "breakdown") return { label: "Breakdown", tone: "danger" as Tone };
  if (pos >= routeTotal(bus)) return { label: "At campus", tone: "muted" as Tone };
  const hold = holdRemainingMin(live, now, speed);
  if (live.status === "delayed" && hold > 0)
    return { label: `Delayed +${Math.ceil(hold)} min`, tone: "warning" as Tone };
  if (live.status === "delayed") return { label: "Running late", tone: "warning" as Tone };
  return { label: "On time", tone: "success" as Tone };
}

/** Interpolated map position + next stop. */
export function busLocation(bus: Bus, live: BusLive, now: number, speed: number) {
  const pos = posMin(bus, live, now, speed);
  const r = bus.route;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i];
    const b = r[i + 1];
    if (pos <= b.atMin) {
      const t = (pos - a.atMin) / (b.atMin - a.atMin);
      const sa = stopById(a.stopId);
      const sb = stopById(b.stopId);
      return {
        x: sa.x + (sb.x - sa.x) * t,
        y: sa.y + (sb.y - sa.y) * t,
        nextStopId: pos < a.atMin + PASSED_EPS ? a.stopId : b.stopId,
        pos,
      };
    }
  }
  const last = stopById(r[r.length - 1].stopId);
  return { x: last.x, y: last.y, nextStopId: last.id, pos };
}

export function walkMeters(fromId: string, toId: string) {
  const a = stopById(fromId);
  const b = stopById(toId);
  return Math.round((Math.hypot(a.x - b.x, a.y - b.y) * METERS_PER_UNIT) / 10) * 10;
}
export const walkMinutes = (meters: number) => Math.ceil(meters / WALK_M_PER_MIN);

export function capacityInfo(occupancy: number, seats: number) {
  const free = Math.max(0, Math.round(seats * (1 - occupancy / 100)));
  if (occupancy >= 100) return { label: "Full", free, tone: "danger" as Tone };
  if (occupancy >= 85) return { label: "Nearly full", free, tone: "warning" as Tone };
  if (occupancy >= 60) return { label: "Filling up", free, tone: "muted" as Tone };
  return { label: "Seats available", free, tone: "success" as Tone };
}

export type RecoveryOption = {
  busId: string;
  isAssigned: boolean;
  boardStopId: string | null;
  walkM: number;
  walkMin: number;
  etaMin: number | null;
  bufferMin: number | null;
  campusMin: number;
  available: boolean;
  reason?: string;
};

/**
 * Find every bus the student could still take to campus from `fromStopId`,
 * considering the stop itself and nearby stops within walking distance.
 */
export function findRecoveryOptions(
  state: SimState,
  fromStopId: string,
  now: number,
): RecoveryOption[] {
  const speed = state.speed;
  const nearby = STOPS.filter(
    (s) => !s.isCampus && walkMeters(fromStopId, s.id) <= NEARBY_M,
  ).map((s) => s.id);

  const options: RecoveryOption[] = [];
  for (const bus of BUSES) {
    const live = state.buses[bus.id];
    const isAssigned = bus.id === STUDENT.assignedBusId;
    const servesNearby = bus.route.filter((r) => nearby.includes(r.stopId));
    if (servesNearby.length === 0) continue;

    const base = {
      busId: bus.id,
      isAssigned,
      campusMin: minutesToCampus(bus, live, now, speed),
    };

    if (live.status === "breakdown") {
      options.push({
        ...base,
        boardStopId: null,
        walkM: 0,
        walkMin: 0,
        etaMin: null,
        bufferMin: null,
        available: false,
        reason: "Out of service (breakdown)",
      });
      continue;
    }

    const candidates = servesNearby
      .map((r) => {
        const eta = etaToStop(bus, live, r.stopId, now, speed);
        const walkM = walkMeters(fromStopId, r.stopId);
        const walkMin = walkMinutes(walkM);
        return { stopId: r.stopId, eta, walkM, walkMin };
      })
      .filter((c) => c.eta.state === "upcoming")
      .map((c) => ({ ...c, etaMin: (c.eta as { min: number }).min }))
      .filter((c) => c.etaMin >= c.walkMin)
      .sort((a, b) => a.walkMin - b.walkMin);

    const best = candidates[0];
    if (!best) {
      options.push({
        ...base,
        boardStopId: null,
        walkM: 0,
        walkMin: 0,
        etaMin: null,
        bufferMin: null,
        available: false,
        reason: "Already passed nearby stops",
      });
      continue;
    }

    const full = live.occupancy >= 100;
    options.push({
      ...base,
      boardStopId: best.stopId,
      walkM: best.walkM,
      walkMin: best.walkMin,
      etaMin: best.etaMin,
      bufferMin: best.etaMin - best.walkMin,
      available: !full,
      reason: full ? "Bus is full" : undefined,
    });
  }

  return options.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.campusMin - b.campusMin;
  });
}

export function initialState(now: number): SimState {
  const speed = 1;
  const buses: Record<string, BusLive> = {};
  for (const bus of BUSES) {
    const init = INITIAL_BUSES[bus.id];
    buses[bus.id] = {
      status: init.status,
      anchorAt: now,
      anchorMin: init.offsetMin,
      holdUntil: init.status === "delayed" ? now + (init.delayMin * MS_MIN) / speed : null,
      occupancy: init.occupancy,
    };
  }
  const myStop = stopById(STUDENT.stopId).name;
  const alerts: Alert[] = [
    {
      id: "seed-1",
      at: now - 9 * MS_MIN,
      kind: "info",
      title: "Bus 3 has started",
      body: "Left Hanamkonda Chowrasta on schedule.",
      busId: "bus-3",
    },
    {
      id: "seed-2",
      at: now - 6 * MS_MIN,
      kind: "warning",
      title: "Leave now",
      body: `Bus 3 is 2 min from ${myStop}.`,
      busId: "bus-3",
    },
    {
      id: "seed-3",
      at: now - 2 * MS_MIN,
      kind: "warning",
      title: "Bus 9 delayed by 6 min",
      body: "Heavy traffic near Hanamkonda.",
      busId: "bus-9",
    },
    {
      id: "seed-4",
      at: now - 1 * MS_MIN,
      kind: "danger",
      title: `Bus 3 departed ${myStop}`,
      body: "Missed it? Tap “I missed my bus” for alternatives.",
      busId: "bus-3",
    },
  ];
  return { version: 2, resetAt: now, speed, buses, alerts, plan: null };
}

export const nearbyStopsOf = (stopId: string) =>
  STOPS.filter((s) => !s.isCampus && s.id !== stopId && walkMeters(stopId, s.id) <= NEARBY_M);

export const isCampus = (id: string) => id === CAMPUS_ID;
export { busById, stopById };
