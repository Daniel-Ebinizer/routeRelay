import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  Footprints,
  MapPin,
  Phone,
  School,
  TrainFront,
  Bus as BusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CampusMap } from "@/components/rr/CampusMap";
import { BusBadge, CapacityBar, StatusPill } from "@/components/rr/StatusPill";
import { STOPS, STUDENT, TRANSPORT_OFFICE, busById, stopById } from "@/lib/demo-data";
import { atSimMin, fmtClock, fmtMin } from "@/lib/format";
import { capacityInfo, displayStatus, findRecoveryOptions, nearbyStopsOf, type RecoveryOption } from "@/lib/sim";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recover")({
  head: () => ({
    meta: [
      { title: "Missed Bus Recovery · RouteRelay Demo" },
      { name: "description", content: "Missed your college bus? Find alternative buses from your stop with ETA, status and capacity." },
      { property: "og:title", content: "Missed Bus Recovery · RouteRelay Demo" },
      { property: "og:description", content: "Missed your college bus? Find alternative buses from your stop with ETA, status and capacity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Recover,
});

type Step = "where" | "options" | "confirm" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "where", label: "Your stop" },
  { id: "options", label: "Options" },
  { id: "confirm", label: "Confirm" },
  { id: "done", label: "Done" },
];

function Recover() {
  const { state, now, confirmPlan } = useDemo();
  const [step, setStep] = useState<Step>("where");
  const [fromStopId, setFromStopId] = useState(STUDENT.stopId);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  const options = useMemo(() => findRecoveryOptions(state, fromStopId, now), [state, fromStopId, now]);
  const available = options.filter((o) => o.available);
  const recommendedId = available[0]?.busId;
  const selected = options.find((o) => o.busId === selectedBusId) ?? null;
  const selectedOk = !!selected?.available;

  const goOptions = () => {
    setSelectedBusId(null);
    setStep("options");
  };

  const confirm = () => {
    if (!selected || !selected.available) return;
    confirmPlan(selected, fromStopId);
    toast.success(`Plan confirmed — Bus ${busById(selected.busId).number}`, {
      description: "Driver & transport office notified (demo).",
    });
    setStep("done");
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Missed your bus?</h1>
          <p className="text-muted-foreground">Don't worry — let's get you to campus.</p>
        </div>
        <ol className="flex items-center gap-1.5 text-xs font-semibold">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "num flex size-6 items-center justify-center rounded-full border",
                  i < stepIdx && "border-success bg-success text-success-foreground",
                  i === stepIdx && "border-ink bg-ink text-ink-foreground",
                  i > stepIdx && "bg-card text-muted-foreground",
                )}
              >
                {i < stepIdx ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i !== stepIdx && "text-muted-foreground")}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          {step === "where" && (
            <WhereStep fromStopId={fromStopId} setFromStopId={setFromStopId} onNext={goOptions} />
          )}
          {step === "options" && (
            <OptionsStep
              options={options}
              fromStopId={fromStopId}
              recommendedId={recommendedId}
              selectedBusId={selectedBusId}
              onSelect={setSelectedBusId}
              onBack={() => setStep("where")}
              onNext={() => setStep("confirm")}
              canContinue={selectedOk}
            />
          )}
          {step === "confirm" && selected && (
            <ConfirmStep option={selected} fromStopId={fromStopId} onBack={() => setStep("options")} onConfirm={confirm} />
          )}
          {step === "done" && <DoneStep onChange={goOptions} />}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-32 lg:self-start">
          <CampusMap
            youStopId={fromStopId}
            focusBusIds={
              step === "done" && state.plan
                ? [state.plan.busId]
                : selected
                  ? [selected.busId]
                  : step === "options"
                    ? available.map((o) => o.busId)
                    : undefined
            }
            walk={
              step === "done" && state.plan
                ? { from: state.plan.fromStopId, to: state.plan.boardStopId }
                : selected?.boardStopId
                  ? { from: fromStopId, to: selected.boardStopId }
                  : null
            }
          />
          <p className="text-xs text-muted-foreground">
            The blue dot is the stop you selected. Dotted line = walking route. ETAs come from the demo timetable.
          </p>
        </aside>
      </div>
    </div>
  );
}

function WhereStep({
  fromStopId,
  setFromStopId,
  onNext,
}: {
  fromStopId: string;
  setFromStopId: (id: string) => void;
  onNext: () => void;
}) {
  const stops = STOPS.filter((s) => !s.isCampus);
  return (
    <section className="panel p-5">
      <h2 className="text-xl font-bold">Where are you right now?</h2>
      <p className="mb-4 text-sm text-muted-foreground">We'll look for buses at this stop and stops within a short walk.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {stops.map((s) => {
          const active = s.id === fromStopId;
          return (
            <button
              key={s.id}
              onClick={() => setFromStopId(s.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-all hover:border-ink/40",
                active && "border-ink bg-primary/15 ring-2 ring-primary",
              )}
            >
              <MapPin className={cn("size-4", active ? "text-foreground" : "text-muted-foreground")} />
              <span className="flex-1 text-sm font-semibold">{s.name}</span>
              {s.id === STUDENT.stopId && (
                <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-foreground">Your stop</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Nearby (walkable): {nearbyStopsOf(fromStopId).map((s) => s.name).join(", ") || "none"}
      </p>
      <div className="mt-5 flex justify-end">
        <Button size="lg" onClick={onNext} className="font-bold">
          Find buses <ArrowRight />
        </Button>
      </div>
    </section>
  );
}

function OptionsStep({
  options,
  fromStopId,
  recommendedId,
  selectedBusId,
  onSelect,
  onBack,
  onNext,
  canContinue,
}: {
  options: RecoveryOption[];
  fromStopId: string;
  recommendedId?: string;
  selectedBusId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  const { state, now } = useDemo();
  const availableCount = options.filter((o) => o.available).length;
  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">College buses you can still catch</h2>
          <span className="text-sm text-muted-foreground">
            from <b className="text-foreground">{stopById(fromStopId).name}</b> · {availableCount} available
          </span>
        </div>

        {options.length === 0 && (
          <p className="rounded-lg bg-muted p-4 text-sm">No college buses serve this area. See other travel options below.</p>
        )}

        <ul className="space-y-3" role="radiogroup" aria-label="Alternative buses">
          {options.map((o) => {
            const bus = busById(o.busId);
            const live = state.buses[bus.id];
            const st = displayStatus(bus, live, now, state.speed);
            const cap = capacityInfo(live.occupancy, bus.seats);
            const sel = selectedBusId === o.busId;
            const sameStop = o.boardStopId === fromStopId;
            return (
              <li key={o.busId}>
                <button
                  role="radio"
                  aria-checked={sel}
                  disabled={!o.available}
                  onClick={() => onSelect(o.busId)}
                  className={cn(
                    "w-full rounded-xl border bg-background p-4 text-left transition-all",
                    o.available ? "hover:border-ink/40" : "cursor-not-allowed opacity-55",
                    sel && "border-ink ring-2 ring-primary",
                  )}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <BusBadge number={bus.number} color={bus.color} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">Bus {bus.number} · {bus.name}</span>
                        {o.isAssigned && <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-foreground">Your bus</span>}
                        {o.busId === recommendedId && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Fastest to campus</span>}
                      </div>
                      {o.available && o.boardStopId ? (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                          {sameStop ? <MapPin className="size-3.5" /> : <Footprints className="size-3.5" />}
                          {sameStop ? "Board at your stop" : <>Walk <b className="num text-foreground">{o.walkMin} min</b> ({o.walkM} m) to</>}
                          {!sameStop && <b className="text-foreground">{stopById(o.boardStopId).name}</b>}
                          {o.isAssigned && !sameStop && <span>· catch your bus at its next stop</span>}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm font-medium text-destructive">{o.reason}</p>
                      )}
                    </div>
                    <StatusPill tone={st.tone} label={st.label} />
                  </div>

                  {o.available && o.etaMin != null && (
                    <div className="mt-3 grid grid-cols-3 gap-3 border-t pt-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bus arrives</p>
                        <p className="num font-bold">{fmtMin(o.etaMin)}</p>
                        <p className="num text-xs text-muted-foreground">{o.bufferMin! < 2 ? "Hurry! " : ""}{Math.floor(o.bufferMin!)} min spare</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">At campus</p>
                        <p className="num font-bold">{fmtClock(atSimMin(now, o.campusMin, state.speed))}</p>
                        <p className="num text-xs text-muted-foreground">in {fmtMin(o.campusMin)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Est. capacity</p>
                        <p className="font-bold">{cap.label}</p>
                        <CapacityBar occupancy={live.occupancy} tone={cap.tone} />
                        <p className="num mt-0.5 text-xs text-muted-foreground">~{cap.free} seats free</p>
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <Button variant="outline" onClick={onBack}><ArrowLeft /> Change stop</Button>
          <Button size="lg" disabled={!canContinue} onClick={onNext} className="font-bold">
            {canContinue && selectedBusId ? `Continue with Bus ${busById(selectedBusId).number}` : "Select a bus"} <ArrowRight />
          </Button>
        </div>
      </section>

      <OtherOptions />
    </div>
  );
}

function OtherOptions() {
  const items = [
    { icon: TrainFront, title: "City bus (TSRTC)", detail: "Hanamkonda → KITS · every ~20 min · ₹25–30", action: "Show route", msg: "Demo: would open city bus route info." },
    { icon: Car, title: "Auto / ride share", detail: "≈ 25–30 min · ₹150–220 estimated", action: "Get estimate", msg: "Demo: estimate only — no booking or payment in this prototype." },
    { icon: Phone, title: "Contact transport office", detail: `${TRANSPORT_OFFICE.hours} · for special cases`, action: "Request help", msg: "Demo: help request sent to transport office." },
  ];
  return (
    <section className="panel p-5">
      <h2 className="mb-3 text-lg font-bold">Other travel options</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <li key={it.title} className="flex flex-col rounded-xl border bg-background p-3">
            <it.icon className="mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-semibold">{it.title}</p>
            <p className="mb-3 flex-1 text-xs text-muted-foreground">{it.detail}</p>
            <Button variant="outline" size="sm" onClick={() => toast(it.msg)}>{it.action}</Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Fares and times are illustrative demo values.</p>
    </section>
  );
}

function ConfirmStep({
  option,
  fromStopId,
  onBack,
  onConfirm,
}: {
  option: RecoveryOption;
  fromStopId: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { state, now } = useDemo();
  const bus = busById(option.busId);
  const live = state.buses[bus.id];
  const st = displayStatus(bus, live, now, state.speed);
  const boardIdx = bus.route.findIndex((r) => r.stopId === option.boardStopId);
  const ride = boardIdx >= 0 ? bus.route.slice(boardIdx) : [];
  const ok = option.available && option.etaMin != null && option.boardStopId;
  const boardStop = option.boardStopId ? stopById(option.boardStopId) : null;
  const boardTime = option.etaMin != null ? atSimMin(now, option.etaMin, state.speed) : now;
  const rideStart = ride[0]?.atMin ?? 0;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-primary/15 px-5 py-4">
        <BusBadge number={bus.number} color={bus.color} size="lg" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Route summary</p>
          <h2 className="text-xl font-bold">Bus {bus.number} · {bus.name}</h2>
        </div>
        <StatusPill tone={st.tone} label={st.label} />
      </div>

      {!ok ? (
        <div className="p-5">
          <p className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive">
            This bus is no longer available ({option.reason ?? "status changed"}). Please pick another option.
          </p>
          <Button className="mt-4" variant="outline" onClick={onBack}><ArrowLeft /> Back to options</Button>
        </div>
      ) : (
        <div className="p-5">
          <ol className="relative space-y-0">
            <TimelineItem icon={<MapPin className="size-4" />} title={`You're at ${stopById(fromStopId).name}`} meta={`Now · ${fmtClock(now)}`} />
            {option.walkMin > 0 && boardStop && (
              <TimelineItem
                icon={<Footprints className="size-4" />}
                title={`Walk ${option.walkMin} min (${option.walkM} m) to ${boardStop.name}`}
                meta={`Leave now · ${Math.floor(option.bufferMin!)} min spare before the bus`}
                dashed
              />
            )}
            <TimelineItem
              icon={<BusIcon className="size-4" />}
              title={`Board Bus ${bus.number} at ${boardStop?.name}`}
              meta={`In ${fmtMin(option.etaMin!)} · ≈ ${fmtClock(boardTime)}`}
              highlight
            />
            {ride.slice(1, -1).map((r) => (
              <TimelineItem
                key={r.stopId}
                small
                title={stopById(r.stopId).name}
                meta={`≈ ${fmtClock(boardTime + ((r.atMin - rideStart) * 60000) / state.speed)}`}
              />
            ))}
            <TimelineItem
              icon={<School className="size-4" />}
              title={stopById(bus.route[bus.route.length - 1].stopId).name}
              meta={`Arrive ≈ ${fmtClock(atSimMin(now, option.campusMin, state.speed))} · in ${fmtMin(option.campusMin)}`}
              last
            />
          </ol>

          <div className="mt-5 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Confirming notifies the driver ({bus.driver}) and the transport office that you'll board — simulated in this demo. Est. capacity: {capacityInfo(live.occupancy, bus.seats).label.toLowerCase()}.
          </div>

          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={onBack}><ArrowLeft /> Back</Button>
            <Button size="lg" onClick={onConfirm} className="font-bold shadow-[var(--shadow-signal)]">
              <Check /> Confirm Bus {bus.number}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function TimelineItem({
  icon,
  title,
  meta,
  dashed,
  highlight,
  small,
  last,
}: {
  icon?: React.ReactNode;
  title: string;
  meta: string;
  dashed?: boolean;
  highlight?: boolean;
  small?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-4">
      {!last && (
        <span className={cn("absolute left-[15px] top-8 bottom-0 w-0.5", dashed ? "border-l-2 border-dashed border-muted-foreground/50" : "bg-border")} />
      )}
      <span
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-center rounded-full border bg-card",
          small ? "ml-[10px] mr-[6px] mt-1 size-3" : "size-8",
          highlight && "border-ink bg-primary text-primary-foreground",
          last && "border-ink bg-ink text-primary",
        )}
      >
        {!small && icon}
      </span>
      <div className={cn(small && "-mt-0.5")}>
        <p className={cn("font-semibold", small && "text-sm font-medium text-muted-foreground")}>{title}</p>
        <p className="num text-xs text-muted-foreground">{meta}</p>
      </div>
    </li>
  );
}

function DoneStep({ onChange }: { onChange: () => void }) {
  const { state, now } = useDemo();
  const plan = state.plan;
  if (!plan) {
    return (
      <section className="panel p-5">
        <p className="text-sm">No active plan.</p>
        <Button className="mt-3" onClick={onChange}>Find a bus</Button>
      </section>
    );
  }
  const bus = busById(plan.busId);
  return (
    <section className="panel overflow-hidden text-center">
      <div className="bg-success/12 px-5 py-8">
        <CheckCircle2 className="mx-auto size-14 text-success animate-in zoom-in-50 duration-500" />
        <h2 className="mt-3 text-2xl font-extrabold">You're all set!</h2>
        <p className="text-muted-foreground">Bus {bus.number} is your ride to campus today.</p>
      </div>
      <dl className="grid grid-cols-1 gap-px bg-border text-left sm:grid-cols-3">
        <div className="bg-card p-4">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Board at</dt>
          <dd className="font-semibold">{stopById(plan.boardStopId).name}</dd>
          <dd className="text-xs text-muted-foreground">{plan.walkMin > 0 ? `${plan.walkMin} min walk` : "Your current stop"}</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Bus arrives</dt>
          <dd className="num font-semibold">≈ {fmtClock(plan.boardAt)}</dd>
          <dd className="num text-xs text-muted-foreground">in {fmtMin((plan.boardAt - now) / 60000 * state.speed)}</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Reach campus</dt>
          <dd className="num font-semibold">≈ {fmtClock(plan.arriveAt)}</dd>
          <dd className="text-xs text-muted-foreground">KITS Gate 1</dd>
        </div>
      </dl>
      <div className="flex flex-wrap justify-center gap-2 p-5">
        <Button asChild size="lg" className="font-bold"><Link to="/">Back to dashboard</Link></Button>
        <Button variant="outline" size="lg" onClick={onChange}>Change plan</Button>
      </div>
    </section>
  );
}
