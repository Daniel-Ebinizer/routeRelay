import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Demo Guide · RouteRelay" },
      { name: "description", content: "Local setup steps and a 3-minute live demo script for the RouteRelay prototype." },
      { property: "og:title", content: "Demo Guide · RouteRelay" },
      { property: "og:description", content: "Local setup steps and a 3-minute live demo script for the RouteRelay prototype." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Guide,
});

const script = [
  ["Student dashboard", "Show Priya's assigned Bus 3, her stop (Kazipet Junction), status and alerts. The red banner says Bus 3 has just departed."],
  ["Tap “I missed my bus”", "Keep Kazipet Junction selected and tap Find buses."],
  ["Compare options", "Point out walking time, bus ETA, spare minutes, campus arrival and estimated capacity. Bus 3 can still be caught at its next stop; Bus 9 is nearly full."],
  ["Choose & confirm", "Pick the ‘Fastest to campus’ bus, review the route summary, tap Confirm. The dashboard now shows today's recovery plan."],
  ["Admin changes status", "Open Admin in a second tab. Mark the chosen bus as Breakdown — the student tab immediately shows an alert and a ‘Find another bus’ warning."],
  ["Recover again", "Back in the student tab, tap Find another bus — the broken-down bus is listed as unavailable."],
  ["Reset", "Admin → Reset demo puts all buses back to their starting positions."],
];

function Guide() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Demo guide</h1>
        <p className="text-muted-foreground">A 3-minute walkthrough of the missed-bus recovery flow.</p>
      </div>

      <section className="panel p-5">
        <h2 className="mb-3 text-xl font-bold">Live demo script</h2>
        <ol className="space-y-3">
          {script.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild><Link to="/">Start at dashboard</Link></Button>
          <Button asChild variant="outline"><Link to="/admin">Open admin</Link></Button>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 text-xl font-bold">Run it locally</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Install Node.js 20+ and download/clone the project.</li>
          <li>In the project folder run <code className="num rounded bg-muted px-1.5 py-0.5">npm install</code></li>
          <li>Start it with <code className="num rounded bg-muted px-1.5 py-0.5">npm run dev</code> and open the printed localhost address.</li>
          <li>Optional: <code className="num rounded bg-muted px-1.5 py-0.5">npm test</code> runs the recovery logic tests.</li>
        </ol>
      </section>

      <section className="panel p-5 text-sm">
        <h2 className="mb-2 text-xl font-bold">What's real and what's simulated</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>All students, buses, drivers, stops and fares are fictional demo data.</li>
          <li>Bus positions move along a timetable in the browser — this is not live GPS.</li>
          <li>The map is a schematic diagram, not to scale.</li>
          <li>Driver notifications, help requests and ride estimates are simulated.</li>
          <li>Out of scope: real GPS, payments, accounts/login, analytics, full fleet management.</li>
        </ul>
      </section>
    </div>
  );
}
