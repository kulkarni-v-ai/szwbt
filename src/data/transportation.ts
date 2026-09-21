export interface VehicleRoute {
  id: string;
  routeName: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  pickupPoints: string[];
  timing: string;
  status: "ACTIVE" | "EN ROUTE" | "STANDBY" | "MAINTENANCE";
  capacity: string;
}

export const TRANSPORT_ROUTES_DATA: VehicleRoute[] = [
  {
    id: "tr-1",
    routeName: "ROUTE 01 — AIRPORT / RAILWAY SHUTTLE",
    vehicleNo: "KA-01-SZ-2026",
    driverName: "Driver Alpha",
    driverPhone: "+91 98765 00000",
    pickupPoints: ["CENTRAL STATION", "AIRPORT T1", "ATHLETE VILLAGE"],
    timing: "EVERY 30 MINS",
    status: "ACTIVE",
    capacity: "35 / 45 SEATS",
  },
  {
    id: "tr-2",
    routeName: "ROUTE 02 — ARENA EXPRESS",
    vehicleNo: "KA-02-SZ-2026",
    driverName: "Driver Beta",
    driverPhone: "+91 98765 00001",
    pickupPoints: ["SHALMALA HOSTEL", "VINDHYA BOYS HOSTEL", "MAIN ARENA"],
    timing: "EVERY 15 MINS",
    status: "EN ROUTE",
    capacity: "42 / 45 SEATS",
  },
  {
    id: "tr-3",
    routeName: "ROUTE 03 — OFFICIALS SHUTTLE",
    vehicleNo: "KA-03-SZ-2026",
    driverName: "Driver Gamma",
    driverPhone: "+91 98765 00002",
    pickupPoints: ["VINDHYA HOSTEL", "MAIN ARENA"],
    timing: "ON DEMAND",
    status: "STANDBY",
    capacity: "4 / 12 SEATS",
  },
];
