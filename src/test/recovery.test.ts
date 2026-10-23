import { describe, expect, it } from "vitest";
import { busById } from "@/lib/demo-data";
import { etaToStop, findRecoveryOptions, initialState, type SimState } from "@/lib/sim";

const T0 = 1_700_000_000_000;

function breakdown(s: SimState, busId: string): SimState {
  return { ...s, buses: { ...s.buses, [busId]: { ...s.buses[busId], status: "breakdown" } } };
}

describe("missed-bus recovery", () => {
  it("assigned Bus 3 has already passed Kazipet Junction at demo start", () => {
    const s = initialState(T0);
    expect(etaToStop(busById("bus-3"), s.buses["bus-3"], "kzp", T0, 1).state).toBe("passed");
  });

  it("offers Bus 3 again at its next stop, Fathima Nagar, with an 8 min walk", () => {
    const s = initialState(T0);
    const bus3 = findRecoveryOptions(s, "kzp", T0).find((o) => o.busId === "bus-3")!;
    expect(bus3.available).toBe(true);
    expect(bus3.boardStopId).toBe("fnr");
    expect(bus3.walkMin).toBe(8);
  });

  it("never offers a bus the student cannot walk to in time", () => {
    const s = initialState(T0);
    for (const o of findRecoveryOptions(s, "kzp", T0).filter((o) => o.available)) {
      expect(o.etaMin!).toBeGreaterThanOrEqual(o.walkMin);
    }
  });

  it("includes delay minutes in the ETA (Bus 9 delayed 6 min, 7 min away → 13 min)", () => {
    const s = initialState(T0);
    const eta = etaToStop(busById("bus-9"), s.buses["bus-9"], "kzp", T0, 1);
    expect(eta).toEqual({ state: "upcoming", min: 13 });
  });

  it("marks a broken-down bus as unavailable", () => {
    const s = breakdown(initialState(T0), "bus-12");
    const opt = findRecoveryOptions(s, "kzp", T0).find((o) => o.busId === "bus-12")!;
    expect(opt.available).toBe(false);
  });

  it("marks a full bus as unavailable", () => {
    const base = initialState(T0);
    const s = { ...base, buses: { ...base.buses, "bus-7": { ...base.buses["bus-7"], occupancy: 100 } } };
    const opt = findRecoveryOptions(s, "kzp", T0).find((o) => o.busId === "bus-7")!;
    expect(opt.available).toBe(false);
  });
});
