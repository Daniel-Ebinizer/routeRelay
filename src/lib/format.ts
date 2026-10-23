export function fmtClock(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function fmtMin(min: number) {
  if (!Number.isFinite(min)) return "—";
  const m = Math.max(0, Math.round(min));
  if (m === 0) return "now";
  return `${m} min`;
}

export function fmtAgo(ts: number, now: number) {
  const m = Math.round((now - ts) / 60000);
  if (m <= 0) return "just now";
  if (m < 60) return `${m} min ago`;
  return fmtClock(ts);
}

/** Real timestamp `simMin` simulated minutes from now. */
export const atSimMin = (now: number, simMin: number, speed: number) =>
  now + (simMin * 60000) / speed;
