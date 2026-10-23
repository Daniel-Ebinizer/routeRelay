import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Bell, CircleUserRound, MapPin, Route as RouteIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertsList } from "@/components/rr/AlertsList";
import { CampusMap } from "@/components/rr/CampusMap";
import { BusBadge, CapacityBar, StatusPill } from "@/components/rr/StatusPill";
import { BUSES, STUDENT, busById, stopById } from "@/lib/demo-data";
import { fmtClock, fmtMin, atSimMin } from "@/lib/format";
import { busLocation, capacityInfo, displayStatus, etaToStop, minutesToCampus } from "@/lib/sim";
import { useDemo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard · RouteRelay Demo" },
      { name: "description", content: "Your assigned college bus, stop, ETA, status and alerts — RouteRelay demo." },
      { property: "og:title", content: "Student Dashboard · RouteRelay Demo" },
      { property: "og:description", content: "Your assigned college bus, stop, ETA, status and alerts — RouteRelay demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { state, now } = useDemo();
  const bus = busById(STUDENT.assignedBusId);
  const live = state.buses[bus.id];
  const myStop = stopById(STUDENT.stopId);
  const eta = etaToStop(bus, live, myStop.id, now, state.speed);
  const status = displayStatus(bus, live, now, state.speed);
  const loc = busLocation(bus, live, now, state.speed);
  const cap = capacityInfo(live.occupancy, bus.seats);
  const missed = eta.state === "passed";

  const others = BUSES.filter((b) => b.id !== bus.id)
    .map((b) => ({ b, eta: etaToStop(b, state.buses[b.id], myStop.id, now, state.speed) }))
    .filter((x) => x.eta.state !== "not_served");

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{STUDENT.college} · {STUDENT.dept}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            {greeting()}, {STUDENT.firstName}.
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
          <CircleUserRound className="size-4 text-muted-foreground" />
          <span className="font-medium">{STUDENT.name}</span>
          <span className="num text-xs text-muted-foreground">{STUDENT.rollNo}</span>
        </div>
      </section>

      <PlanBanner />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Assigned bus */}
          <section className="overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-ink-foreground/10 px-5 py-4">
              <BusBadge number={bus.number} color={bus.color} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-ink-foreground/60">Your assigned bus</p>
                <h2 className="text-xl font-bold">Bus {bus.number} · {bus.name}</h2>
              </div>
              <StatusPill tone={status.tone} label={status.label} onDark />
            </div>

            <div className="grid gap-px bg-ink-foreground/10 sm:grid-cols-3">
              <Stat label="Your stop">
                <span className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{myStop.name}</span>
              </Stat>
              <Stat label={missed ? "At your stop" : "Arrives at your stop"}>
                {eta.state === "upcoming" ? (
                  <span className="num text-3xl font-bold text-primary">{fmtMin(eta.min)}</span>
                ) : eta.state === "passed" ? (
                  <span className="text-lg font-bold text-destructive-foreground">
                    <span className="rounded bg-destructive px-2 py-0.5">Departed</span>
                  </span>
                ) : (
                  <span className="text-lg font-bold">Unavailable</span>
                )}
                {eta.state === "upcoming" && (
                  <span className="num block text-xs text-ink-foreground/60">
                    ≈ {fmtClock(atSimMin(now, eta.min, state.speed))}
                  </span>
                )}
              </Stat>
              <Stat label="Next stop">
                <span>{stopById(loc.nextStopId).name}</span>
                <span className="num block text-xs text-ink-foreground/60">
                  Campus in {fmtMin(minutesToCampus(bus, live, now, state.speed))}
                </span>
              </Stat>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <Button asChild size="lg" className="h-12 px-6 text-base font-bold shadow-[var(--shadow-signal)]">
                <Link to="/recover">
                  <AlertTriangle /> I missed my bus
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
                <a href="#map"><RouteIcon /> Track on map</a>
              </Button>
              <div className="ml-auto min-w-40 text-xs text-ink-foreground/70">
                <div className="mb-1 flex justify-between"><span>{cap.label}</span><span className="num">~{cap.free} seats</span></div>
                <CapacityBar occupancy={live.occupancy} tone={cap.tone} />
                <p className="mt-1">Driver: {bus.driver}</p>
              </div>
            </div>
            {missed && !state.plan && (
              <div className="bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground">
                Bus {bus.number} has left {myStop.name}. Tap “I missed my bus” to see buses you can still catch.
              </div>
            )}
          </section>

          {/* Map */}
          <section id="map" className="panel scroll-mt-28 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Route map</h2>
              <span className="text-xs text-muted-foreground">Bus {bus.number} highlighted</span>
            </div>
            <CampusMap
              focusBusIds={state.plan ? [bus.id, state.plan.busId] : [bus.id]}
              youStopId={myStop.id}
              walk={state.plan ? { from: state.plan.fromStopId, to: state.plan.boardStopId } : null}
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel p-4">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Bell className="size-4" /> Alerts</h2>
            <AlertsList />
          </section>

          <section className="panel p-4">
            <h2 className="mb-3 text-lg font-bold">Other buses at {myStop.name}</h2>
            <ul className="space-y-2">
              {others.map(({ b, eta }) => {
                const st = displayStatus(b, state.buses[b.id], now, state.speed);
                return (
                  <li key={b.id} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                    <BusBadge number={b.number} color={b.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{b.name}</p>
                      <StatusPill tone={st.tone} label={st.label} className="mt-0.5" />
                    </div>
                    <span className="num text-sm font-bold">
                      {eta.state === "upcoming" ? fmtMin(eta.min) : eta.state === "passed" ? "Passed" : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-ink px-5 py-4">
      <p className="mb-1 text-xs uppercase tracking-widest text-ink-foreground/60">{label}</p>
      <div className="font-semibold">{children}</div>
    </div>
  );
}

function PlanBanner() {
  const { state, now, cancelPlan } = useDemo();
  const plan = state.plan;
  if (!plan) return null;
  const bus = busById(plan.busId);
  const live = state.buses[bus.id];
  const eta = etaToStop(bus, live, plan.boardStopId, now, state.speed);
  const broken = live.status === "breakdown";
  const missedAgain = eta.state === "passed";

  if (broken || missedAgain) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
        <AlertTriangle className="size-5 text-destructive" />
        <p className="flex-1 text-sm font-medium">
          {broken
            ? `Bus ${bus.number} is now out of service. Your recovery plan needs updating.`
            : `Bus ${bus.number} has already left ${stopById(plan.boardStopId).name}.`}
        </p>
        <Button asChild variant="destructive"><Link to="/recover">Find another bus <ArrowRight /></Link></Button>
        <Button variant="ghost" size="icon" onClick={cancelPlan} aria-label="Clear plan"><X /></Button>
      </section>
    );
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-primary/50 bg-primary/15 p-4">
      <BusBadge number={bus.number} color={bus.color} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today's recovery plan</p>
        <p className="font-semibold">
          {plan.walkMin > 0 ? `Walk ${plan.walkMin} min to ` : "Wait at "}
          {stopById(plan.boardStopId).name}, board Bus {bus.number}
          {eta.state === "upcoming" && <> in <span className="num">{fmtMin(eta.min)}</span></>}
        </p>
        <p className="num text-xs text-muted-foreground">
          Arrive campus ≈ {fmtClock(atSimMin(now, minutesToCampus(bus, live, now, state.speed), state.speed))}
        </p>
      </div>
      <Button variant="outline" onClick={cancelPlan}>Cancel plan</Button>
    </section>
  );
}
