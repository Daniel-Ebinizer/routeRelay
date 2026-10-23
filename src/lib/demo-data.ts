/**
 * DEMO DATA — every stop, bus, driver and student below is fictional sample
 * data for the RouteRelay college prototype. Bus positions are SIMULATED from a
 * timetable; nothing here comes from real GPS.
 */

export type Stop = {
  id: string;
  name: string;
  /** Position on the schematic map (viewBox 0..100 x 0..72). */
  x: number;
  y: number;
  /** Label placement relative to the dot. */
  label?: "left" | "right" | "top" | "bottom";
  isCampus?: boolean;
};

export type RouteStop = { stopId: string; atMin: number };

export type Bus = {
  id: string;
  number: number;
  name: string;
  driver: string;
  /** Tailwind colour token suffix, e.g. "route-3". */
  color: "route-3" | "route-5" | "route-7" | "route-9" | "route-12";
  seats: number;
  /** Ordered stops with scheduled minutes from trip start. Last stop is campus. */
  route: RouteStop[];
};

export const CAMPUS_ID = "campus";

export const STOPS: Stop[] = [
  { id: "hnk", name: "Hanamkonda Chowrasta", x: 18, y: 48, label: "left" },
  { id: "kzp", name: "Kazipet Junction", x: 34, y: 62, label: "bottom" },
  { id: "fnr", name: "Fathima Nagar", x: 44, y: 53, label: "right" },
  { id: "sub", name: "Subedari", x: 28, y: 34, label: "left" },
  { id: "hun", name: "Hunter Road", x: 58, y: 40, label: "right" },
  { id: "mul", name: "Mulugu Cross Rd", x: 12, y: 18, label: "top" },
  { id: "nkg", name: "Nakkalagutta", x: 42, y: 22, label: "top" },
  { id: "wgl", name: "Warangal Bus Stand", x: 74, y: 60, label: "bottom" },
  { id: "hpx", name: "Hasanparthy X Rd", x: 70, y: 28, label: "right" },
  { id: CAMPUS_ID, name: "KITS Campus · Gate 1", x: 86, y: 10, label: "left", isCampus: true },
];

export const BUSES: Bus[] = [
  {
    id: "bus-3",
    number: 3,
    name: "Kazipet Line",
    driver: "R. Venkatesh",
    color: "route-3",
    seats: 52,
    route: [
      { stopId: "hnk", atMin: 0 },
      { stopId: "kzp", atMin: 8 },
      { stopId: "fnr", atMin: 21 },
      { stopId: "hun", atMin: 29 },
      { stopId: "hpx", atMin: 36 },
      { stopId: CAMPUS_ID, atMin: 45 },
    ],
  },
  {
    id: "bus-7",
    number: 7,
    name: "Subedari Express",
    driver: "S. Anil Kumar",
    color: "route-7",
    seats: 48,
    route: [
      { stopId: "mul", atMin: 0 },
      { stopId: "sub", atMin: 8 },
      { stopId: "fnr", atMin: 18 },
      { stopId: "hun", atMin: 26 },
      { stopId: CAMPUS_ID, atMin: 38 },
    ],
  },
  {
    id: "bus-9",
    number: 9,
    name: "Hanamkonda Shuttle",
    driver: "M. Ramesh",
    color: "route-9",
    seats: 40,
    route: [
      { stopId: "hnk", atMin: 0 },
      { stopId: "kzp", atMin: 9 },
      { stopId: "sub", atMin: 17 },
      { stopId: "nkg", atMin: 24 },
      { stopId: CAMPUS_ID, atMin: 34 },
    ],
  },
  {
    id: "bus-12",
    number: 12,
    name: "Warangal Loop",
    driver: "K. Srinivas",
    color: "route-12",
    seats: 52,
    route: [
      { stopId: "wgl", atMin: 0 },
      { stopId: "kzp", atMin: 14 },
      { stopId: "fnr", atMin: 20 },
      { stopId: "nkg", atMin: 29 },
      { stopId: CAMPUS_ID, atMin: 40 },
    ],
  },
  {
    id: "bus-5",
    number: 5,
    name: "Mulugu Line",
    driver: "P. Naresh",
    color: "route-5",
    seats: 48,
    route: [
      { stopId: "mul", atMin: 0 },
      { stopId: "nkg", atMin: 10 },
      { stopId: "hpx", atMin: 19 },
      { stopId: CAMPUS_ID, atMin: 28 },
    ],
  },
];

export const STUDENT = {
  name: "Priya Sharma",
  firstName: "Priya",
  rollNo: "B22CS047",
  dept: "CSE · 3rd Year",
  college: "KITS Warangal",
  assignedBusId: "bus-3",
  stopId: "kzp",
};

export type BusStatus = "on_time" | "delayed" | "breakdown";

/** Where each bus is when the demo starts / is reset. */
export const INITIAL_BUSES: Record<
  string,
  { offsetMin: number; status: BusStatus; delayMin: number; occupancy: number }
> = {
  // Bus 3 left Priya's stop 1 minute ago — she has just missed it.
  "bus-3": { offsetMin: 9, status: "on_time", delayMin: 0, occupancy: 68 },
  "bus-7": { offsetMin: 6, status: "on_time", delayMin: 0, occupancy: 41 },
  "bus-9": { offsetMin: 2, status: "delayed", delayMin: 6, occupancy: 92 },
  "bus-12": { offsetMin: 1, status: "on_time", delayMin: 0, occupancy: 55 },
  "bus-5": { offsetMin: 5, status: "on_time", delayMin: 0, occupancy: 73 },
};

/** Schematic scale: metres represented by one map unit. */
export const METERS_PER_UNIT = 45;
export const WALK_M_PER_MIN = 80;
/** Stops within this walking distance count as "nearby" for recovery. */
export const NEARBY_M = 1000;

export const TRANSPORT_OFFICE = {
  name: "KITS Transport Office (demo)",
  phone: "+91 00000 00000",
  hours: "7:00 AM – 6:00 PM",
};

export const stopById = (id: string) => STOPS.find((s) => s.id === id)!;
export const busById = (id: string) => BUSES.find((b) => b.id === id)!;
