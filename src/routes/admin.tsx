import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Megaphone, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { CampusMap } from "@/components/rr/CampusMap";
import { BusBadge, StatusPill } from "@/components/rr/StatusPill";
import { BUSES, stopById, type BusStatus } from "@/lib/demo-data";
import { fmtMin } from "@/lib/format";
import { busLocation, capacityInfo, displayStatus, minutesToCampus } from "@/lib/sim";
import { useDemo } from "@/lib/store";
import type { AlertKind } from "@/lib/sim";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Transport Admin · RouteRelay Demo" },
      { name: "description", content: "Update college bus status, delays and capacity; changes appear instantly for students." },
      { property: "og:title", content: "Transport Admin · RouteRelay Demo" },
      { property: "og:description", content: "Update college bus status, delays and capacity; changes appear instantly for students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

const DELAYS = [5, 10, 15, 20];

function Admin() {
  const { state, now, setSpeed, reset } = useDemo();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><ShieldCheck className="size-4" /> Transport office (demo — no login)</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Fleet status</h1>
          <p className="text-sm text-muted-foreground">Changes show up instantly on the Student view — open it in another tab to see both.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5 text-sm" role="group" aria-label="Simulation speed">
            {[1, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn("num rounded-md px-3 py-1.5 font-semibold", state.speed === s ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {s}× time
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              toast("Demo reset — buses back to starting positions.");
            }}
          >
            <RotateCcw /> Reset demo
          </Button>
          <Button asChild variant="secondary">
            <a href="/" target="_blank" rel="noreferrer"><ExternalLink /> Student view</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          {BUSES.map((bus) => (
            <BusRow key={bus.id} busId={bus.id} />
          ))}
        </section>
        <aside className="space-y-6">
          <section className="panel p-4">
            <h2 className="mb-3 text-lg font-bold">Live overview</h2>
            <CampusMap />
            <ul className="mt-3 space-y-1 text-sm">
              {BUSES.map((b) => {
                const st = displayStatus(b, state.buses[b.id], now, state.speed);
                return (
                  <li key={b.id} className="flex items-center gap-2">
                    <BusBadge number={b.number} color={b.color} size="sm" />
                    <span className="flex-1 truncate">{b.name}</span>
                    <StatusPill tone={st.tone} label={st.label} />
                  </li>
                );
              })}
            </ul>
          </section>
          <Broadcast />
        </aside>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Need the student side? <Link to="/" className="underline">Open dashboard</Link> · <Link to="/guide" className="underline">Demo script</Link>
      </p>
    </div>
  );
}

function BusRow({ busId }: { busId: string }) {
  const { state, now, setStatus, setOccupancy } = useDemo();
  const bus = BUSES.find((b) => b.id === busId)!;
  const live = state.buses[busId];
  const [delay, setDelay] = useState(10);
  const [occ, setOcc] = useState<number | null>(null);
  const st = displayStatus(bus, live, now, state.speed);
  const loc = busLocation(bus, live, now, state.speed);
  const cap = capacityInfo(occ ?? live.occupancy, bus.seats);

  const apply = (status: BusStatus) => {
    setStatus(busId, status, delay);
    toast.success(
      status === "delayed" ? `Bus ${bus.number} marked delayed +${delay} min` : status === "breakdown" ? `Bus ${bus.number} marked out of service` : `Bus ${bus.number} marked on time`,
      { description: "Students have been alerted." },
    );
  };

  return (
    <article className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <BusBadge number={bus.number} color={bus.color} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Bus {bus.number} · {bus.name}</p>
          <p className="text-xs text-muted-foreground">
            Driver {bus.driver} · next: {stopById(loc.nextStopId).name} · campus in{" "}
            <span className="num">{fmtMin(minutesToCampus(bus, live, now, state.speed))}</span>
          </p>
        </div>
        <StatusPill tone={st.tone} label={st.label} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Set status</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={live.status === "on_time" ? "default" : "outline"} onClick={() => apply("on_time")}>
              On time
            </Button>
            <div className="flex items-center overflow-hidden rounded-md border">
              <select
                aria-label={`Delay minutes for bus ${bus.number}`}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="num h-8 bg-card px-2 text-xs outline-none"
              >
                {DELAYS.map((d) => <option key={d} value={d}>+{d} min</option>)}
              </select>
              <button
                onClick={() => apply("delayed")}
                className={cn("h-8 border-l px-3 text-xs font-semibold", live.status === "delayed" ? "bg-warning text-warning-foreground" : "bg-card hover:bg-muted")}
              >
                Delay
              </button>
            </div>
            <Button size="sm" variant={live.status === "breakdown" ? "destructive" : "outline"} onClick={() => apply("breakdown")}>
              Breakdown
            </Button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Occupancy</span>
            <span className="num normal-case">{occ ?? live.occupancy}% · {cap.label}</span>
          </div>
          <Slider
            value={[occ ?? live.occupancy]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setOcc(v)}
            onValueCommit={([v]) => {
              setOccupancy(busId, v);
              setOcc(null);
            }}
            aria-label={`Occupancy for bus ${bus.number}`}
          />
        </div>
      </div>
    </article>
  );
}

function Broadcast() {
  const { broadcast } = useDemo();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<AlertKind>("info");
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    broadcast(title.trim(), body.trim() || "Message from transport office.", kind);
    toast.success("Alert sent to students");
    setTitle("");
    setBody("");
  };
  return (
    <section className="panel p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Megaphone className="size-4" /> Broadcast alert</h2>
      <form onSubmit={send} className="space-y-2">
        <Input placeholder="e.g. Route change: Bus 5 via Hunter Road" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        <Input placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={140} />
        <div className="flex gap-1.5">
          {(["info", "warning", "danger"] as AlertKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={cn("flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold capitalize", kind === k ? "border-ink bg-ink text-ink-foreground" : "bg-card text-muted-foreground")}
            >
              {k === "danger" ? "urgent" : k}
            </button>
          ))}
        </div>
        <Button type="submit" className="w-full font-bold" disabled={!title.trim()}>Send to students</Button>
      </form>
    </section>
  );
}
