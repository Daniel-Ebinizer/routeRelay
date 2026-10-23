import { BUSES, STOPS, stopById } from "@/lib/demo-data";
import { busLocation, displayStatus } from "@/lib/sim";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";

const ROUTE_OFFSET: Record<string, number> = {
  "bus-3": 0,
  "bus-7": 0.7,
  "bus-9": -0.7,
  "bus-12": 1.3,
  "bus-5": -1.3,
};

type Props = {
  focusBusIds?: string[];
  youStopId?: string;
  walk?: { from: string; to: string } | null;
  className?: string;
};

/**
 * Schematic campus route map (SVG). Deliberately not a GPS map:
 * bus markers are placed from the simulated timetable.
 */
export function CampusMap({ focusBusIds, youStopId, walk, className }: Props) {
  const { state, now } = useDemo();
  const hasFocus = !!focusBusIds && focusBusIds.length > 0;
  const isFocus = (id: string) => !hasFocus || focusBusIds!.includes(id);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-map-bg", className)}>
      <svg viewBox="0 0 100 72" className="block h-auto w-full" role="img" aria-label="Schematic route map with simulated bus positions">
        {/* decorative city blocks + lake */}
        <g className="fill-map-block">
          <rect x="4" y="4" width="18" height="9" rx="1.5" />
          <rect x="50" y="4" width="16" height="12" rx="1.5" />
          <rect x="78" y="34" width="18" height="14" rx="1.5" />
          <rect x="4" y="58" width="16" height="11" rx="1.5" />
          <rect x="52" y="62" width="14" height="8" rx="1.5" />
          <rect x="30" y="42" width="8" height="8" rx="1.2" />
        </g>
        <ellipse cx="60" cy="52" rx="6" ry="3.4" className="fill-info/15" />
        <text x="60" y="52.8" textAnchor="middle" className="fill-info/60" fontSize="1.8" fontStyle="italic">
          lake
        </text>
        {/* campus zone */}
        <rect x="78" y="3" width="19" height="15" rx="2" className="fill-primary/25 stroke-primary" strokeWidth="0.3" strokeDasharray="1 0.8" />

        {/* roads underlay */}
        {BUSES.map((bus) => (
          <polyline
            key={`road-${bus.id}`}
            points={bus.route.map((r) => `${stopById(r.stopId).x},${stopById(r.stopId).y}`).join(" ")}
            className="stroke-map-road"
            fill="none"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* coloured routes */}
        {BUSES.map((bus) => {
          const o = ROUTE_OFFSET[bus.id] ?? 0;
          const focus = isFocus(bus.id);
          return (
            <polyline
              key={`route-${bus.id}`}
              transform={`translate(${o * 0.5} ${o * 0.5})`}
              points={bus.route.map((r) => `${stopById(r.stopId).x},${stopById(r.stopId).y}`).join(" ")}
              className="transition-opacity"
              style={{ stroke: `var(--${bus.color})` }}
              fill="none"
              strokeWidth={focus && hasFocus ? 1.3 : 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={focus ? 1 : 0.18}
            />
          );
        })}

        {/* walking path */}
        {walk && walk.from !== walk.to && (
          <line
            x1={stopById(walk.from).x}
            y1={stopById(walk.from).y}
            x2={stopById(walk.to).x}
            y2={stopById(walk.to).y}
            className="stroke-foreground"
            strokeWidth="0.6"
            strokeDasharray="0.6 1"
            strokeLinecap="round"
          />
        )}

        {/* stops */}
        {STOPS.map((s) => {
          const lp = labelPos(s.x, s.y, s.label);
          return (
            <g key={s.id}>
              {s.isCampus ? (
                <g>
                  <rect x={s.x - 2.4} y={s.y - 2.4} width="4.8" height="4.8" rx="1" className="fill-ink" />
                  <text x={s.x} y={s.y + 1} textAnchor="middle" fontSize="2.6" fontWeight="700" className="fill-primary">
                    K
                  </text>
                </g>
              ) : (
                <circle cx={s.x} cy={s.y} r="1.3" className="fill-card stroke-ink" strokeWidth="0.55" />
              )}
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={lp.anchor}
                fontSize={s.isCampus ? 2.4 : 2.2}
                fontWeight={s.isCampus || s.id === youStopId ? 700 : 500}
                className="fill-foreground"
                style={{ paintOrder: "stroke", stroke: "var(--map-bg)", strokeWidth: 0.9 }}
              >
                {s.name}
              </text>
            </g>
          );
        })}

        {/* "you are here" */}
        {youStopId && (
          <g transform={`translate(${stopById(youStopId).x} ${stopById(youStopId).y})`}>
            <circle r="2" className="fill-info/30 origin-center animate-pulse-ring" style={{ transformBox: "fill-box" }} />
            <circle r="1.5" className="fill-info stroke-card" strokeWidth="0.5" />
          </g>
        )}

        {/* buses */}
        {BUSES.map((bus) => {
          const live = state.buses[bus.id];
          const loc = busLocation(bus, live, now, state.speed);
          const st = displayStatus(bus, live, now, state.speed);
          const o = (ROUTE_OFFSET[bus.id] ?? 0) * 0.5;
          const focus = isFocus(bus.id);
          const broken = live.status === "breakdown";
          return (
            <g
              key={`bus-${bus.id}`}
              transform={`translate(${loc.x + o} ${loc.y + o})`}
              opacity={focus ? 1 : 0.35}
              style={{ transition: "transform 1s linear" }}
            >
              <title>{`Bus ${bus.number} · ${st.label} (simulated position)`}</title>
              <rect
                x="-3"
                y="-2.1"
                width="6"
                height="4.2"
                rx="1.1"
                style={{ fill: broken ? "var(--destructive)" : `var(--${bus.color})` }}
                className="stroke-card"
                strokeWidth="0.5"
              />
              <text y="1" textAnchor="middle" fontSize="2.6" fontWeight="700" className="fill-card" style={{ fontFamily: "var(--font-mono)" }}>
                {broken ? "!" : bus.number}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-card/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm sm:text-xs">
        Schematic map · simulated positions, not live GPS
      </div>
    </div>
  );
}

function labelPos(x: number, y: number, side: "left" | "right" | "top" | "bottom" = "right") {
  switch (side) {
    case "left":
      return { x: x - 2.4, y: y + 0.8, anchor: "end" as const };
    case "top":
      return { x, y: y - 2.4, anchor: "middle" as const };
    case "bottom":
      return { x, y: y + 4.2, anchor: "middle" as const };
    default:
      return { x: x + 2.4, y: y + 0.8, anchor: "start" as const };
  }
}
