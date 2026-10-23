import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/sim";

const dot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};
const pill: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusPill({
  tone,
  label,
  className,
  onDark,
}: {
  tone: Tone;
  label: string;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        onDark ? "border-ink-foreground/20 bg-ink-foreground/10 text-ink-foreground" : pill[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[tone])} />
      {label}
    </span>
  );
}

const busBg = {
  "route-3": "bg-route-3",
  "route-5": "bg-route-5",
  "route-7": "bg-route-7",
  "route-9": "bg-route-9",
  "route-12": "bg-route-12",
} as const;

export function BusBadge({
  number,
  color,
  size = "md",
}: {
  number: number;
  color: keyof typeof busBg;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "num inline-flex shrink-0 items-center justify-center rounded-lg font-bold text-card",
        busBg[color],
        size === "sm" && "h-6 min-w-6 px-1 text-xs",
        size === "md" && "h-9 min-w-9 px-1.5 text-sm",
        size === "lg" && "h-14 min-w-14 px-2 text-2xl rounded-xl",
      )}
    >
      {number}
    </span>
  );
}

export function CapacityBar({ occupancy, tone }: { occupancy: number; tone: Tone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", dot[tone === "muted" ? "warning" : tone])}
        style={{ width: `${Math.min(100, occupancy)}%` }}
      />
    </div>
  );
}
