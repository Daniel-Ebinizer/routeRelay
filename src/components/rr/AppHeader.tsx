import { Link } from "@tanstack/react-router";
import { Bus } from "lucide-react";

const links = [
  { to: "/", label: "Student" },
  { to: "/recover", label: "Missed bus" },
  { to: "/admin", label: "Admin" },
  { to: "/guide", label: "Demo guide" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="signage-stripes h-1.5" />
      <div className="bg-ink py-1.5 text-center text-[11px] font-medium tracking-wide text-ink-foreground sm:text-xs">
        DEMO PROTOTYPE · fictional sample data · bus positions are simulated, not live GPS
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-signal)]">
            <Bus className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Route<span className="text-route-3">Relay</span>
          </span>
        </Link>
        <nav className="ml-auto flex gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-ink text-ink-foreground hover:bg-ink hover:text-ink-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
