import { AlertTriangle, BellRing, CheckCircle2, Info, X } from "lucide-react";
import { fmtAgo } from "@/lib/format";
import type { AlertKind } from "@/lib/sim";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";

const icon: Record<AlertKind, typeof Info> = {
  info: Info,
  warning: BellRing,
  danger: AlertTriangle,
  success: CheckCircle2,
};
const color: Record<AlertKind, string> = {
  info: "text-info bg-info/10",
  warning: "text-warning bg-warning/15",
  danger: "text-destructive bg-destructive/10",
  success: "text-success bg-success/10",
};

export function AlertsList({ limit = 8 }: { limit?: number }) {
  const { state, now, dismissAlert } = useDemo();
  const alerts = state.alerts.slice(0, limit);
  if (alerts.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">No alerts right now.</p>;
  return (
    <ul className="divide-y">
      {alerts.map((a) => {
        const Icon = icon[a.kind];
        return (
          <li key={a.id} className="group flex gap-3 py-3 animate-in fade-in slide-in-from-top-1">
            <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", color[a.kind])}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{a.title}</p>
                <span className="num shrink-0 text-[11px] text-muted-foreground">{fmtAgo(a.at, now)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{a.body}</p>
            </div>
            <button
              onClick={() => dismissAlert(a.id)}
              aria-label="Dismiss alert"
              className="self-start rounded p-1 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
