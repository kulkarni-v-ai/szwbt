"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  Bus,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Search,
  Plus,
  RefreshCw,
  X,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Phone,
  User,
  Radio,
  History,
  FileText,
  AlertOctagon,
  ChevronRight,
  Check,
  Eye,
  Trash2,
  Navigation,
  Compass,
  Zap,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

// Types
interface TransportKPIs {
  activeTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  totalTrips: number;
  vehiclesTotal: number;
  vehiclesAvailable: number;
  vehiclesInService: number;
  vehiclesMaintenance: number;
  driversTotal: number;
  driversAvailable: number;
  driversAssigned: number;
  passengersAssigned: number;
  passengersBoarded: number;
  passengersRemaining: number;
  noShows: number;
}

interface TripItem {
  id: string;
  tripCode: string;
  date: string;
  time: string;
  estimatedArrival?: string | null;
  routeId?: string | null;
  routeName: string;
  routeCode: string;
  vehicleId?: string | null;
  vehicleNo: string;
  vehicleType?: string;
  driverId?: string | null;
  driverName: string;
  driverPhone: string;
  pickupPoint: string;
  dropPoint: string;
  status: "SCHEDULED" | "BOARDING" | "DEPARTED" | "IN_TRANSIT" | "ARRIVED" | "DELAYED" | "CANCELLED";
  delayMinutes: number;
  capacity: number;
  expected: number;
  boarded: number;
  remaining: number;
  noShows: number;
}

interface ManifestPassenger {
  id: string;
  participantId: string | null;
  name: string;
  playerId: string;
  team: string;
  institution: string;
  pickupPoint: string;
  dropPoint: string;
  boardingStatus: "PENDING" | "BOARDED" | "NO_SHOW";
  boardedAt: string | null;
  boardedBy: string | null;
  isOverride: boolean;
  overrideReason: string | null;
  phone: string;
  email: string;
  hostel: string;
  room: string;
  qrCode: string;
}

interface RouteItem {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  estimatedMinutes: number;
  status: string;
  stops: { id: string; name: string; orderIndex: number; expectedMinutes: number }[];
  activeTripsCount: number;
  totalTripsCount: number;
}

interface VehicleItem {
  id: string;
  registrationNumber: string;
  type: string;
  capacity: number;
  status: "AVAILABLE" | "ASSIGNED" | "IN_SERVICE" | "MAINTENANCE" | "OUT_OF_SERVICE";
  makeModel: string | null;
  currentTrip?: { id: string; tripCode: string; routeName: string; status: string } | null;
}

interface DriverItem {
  id: string;
  driverCode: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: "AVAILABLE" | "ASSIGNED" | "OFF_DUTY" | "UNAVAILABLE";
  currentTrip?: { id: string; tripCode: string; routeName: string } | null;
}

interface ParticipantSearchResult {
  id: string;
  playerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  institution: string;
  category: string;
  gender: string | null;
  hostel: string | null;
  room: string | null;
  qrCode: string | null;
  team: { id: string; teamCode: string; name: string } | null;
  currentAssignment?: {
    bookingId: string;
    tripId: string;
    tripCode: string;
    scheduledDate: string;
    scheduledTime: string;
    route: string;
    vehicleNo: string;
    pickupPoint: string;
    boardingStatus: string;
    boardedAt: string | null;
  } | null;
}

interface AuditLogItem {
  id: string;
  action: string;
  actorEmail: string;
  timestamp: string;
  metadata: any;
}

export default function TransportAdminDashboard() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "transport_admin")!;
  const { user, hasPermission } = useAuth();

  // Navigation Tabs (Sections 5 & 7)
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "TRIPS" | "ROUTES" | "VEHICLES" | "DRIVERS" | "PASSENGERS" | "BOARDING" | "LIVE" | "HISTORY"
  >("OVERVIEW");

  // Loading & Core State
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<TransportKPIs | null>(null);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [historyTrips, setHistoryTrips] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Trip Filters
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterRoute, setFilterRoute] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Notifications / Alerts
  const [bannerAlert, setBannerAlert] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  const showAlert = (message: string, type: "success" | "error" | "warning" = "success") => {
    setBannerAlert({ message, type });
    setTimeout(() => setBannerAlert(null), 6000);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. DATA REFRESH FUNCTION
  // ─────────────────────────────────────────────────────────────
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, tripsRes, routesRes, vehiclesRes, driversRes, historyRes] = await Promise.all([
        fetch("/api/transport/overview"),
        fetch("/api/transport/trips"),
        fetch("/api/transport/routes"),
        fetch("/api/transport/vehicles"),
        fetch("/api/transport/drivers"),
        fetch("/api/transport/history?limit=15"),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setKpis(data.kpis);
      }
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        setTrips(data.trips || []);
      }
      if (routesRes.ok) {
        const data = await routesRes.json();
        setRoutes(data.routes || []);
      }
      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.vehicles || []);
      }
      if (driversRes.ok) {
        const data = await driversRes.json();
        setDrivers(data.drivers || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistoryTrips(data.trips || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err: any) {
      console.error("Failed to load transport operational data:", err);
      showAlert("Error loading live transport data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // ─────────────────────────────────────────────────────────────
  // 2. CREATE TRIP WORKFLOW (Section 11)
  // ─────────────────────────────────────────────────────────────
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [createTripStep, setCreateTripStep] = useState<"FORM" | "REVIEW">("FORM");
  const [newTripDate, setNewTripDate] = useState("2026-10-18");
  const [newTripTime, setNewTripTime] = useState("08:30 IST");
  const [newTripEstArrival, setNewTripEstArrival] = useState("09:05 IST");
  const [newTripRouteId, setNewTripRouteId] = useState("");
  const [newTripVehicleId, setNewTripVehicleId] = useState("");
  const [newTripDriverId, setNewTripDriverId] = useState("");
  const [newTripPickup, setNewTripPickup] = useState("");
  const [newTripDrop, setNewTripDrop] = useState("");
  const [submittingTrip, setSubmittingTrip] = useState(false);

  const selectedVehicleObj = vehicles.find((v) => v.id === newTripVehicleId);
  const selectedRouteObj = routes.find((r) => r.id === newTripRouteId);
  const selectedDriverObj = drivers.find((d) => d.id === newTripDriverId);

  const handleOpenCreateTrip = () => {
    setCreateTripStep("FORM");
    if (routes.length > 0 && !newTripRouteId) {
      setNewTripRouteId(routes[0].id);
      setNewTripPickup(routes[0].origin);
      setNewTripDrop(routes[0].destination);
    }
    const availVeh = vehicles.find((v) => v.status === "AVAILABLE");
    if (availVeh && !newTripVehicleId) setNewTripVehicleId(availVeh.id);
    const availDrv = drivers.find((d) => d.status === "AVAILABLE");
    if (availDrv && !newTripDriverId) setNewTripDriverId(availDrv.id);
    setIsCreateTripOpen(true);
  };

  const handleCreateTripSubmit = async () => {
    if (!newTripRouteId || !newTripVehicleId || !newTripDriverId || !newTripDate || !newTripTime) {
      showAlert("Please fill in all mandatory trip parameters.", "error");
      return;
    }

    setSubmittingTrip(true);
    try {
      const res = await fetch("/api/transport/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: newTripDate,
          scheduledTime: newTripTime,
          estimatedArrival: newTripEstArrival || null,
          routeId: newTripRouteId,
          vehicleId: newTripVehicleId,
          driverId: newTripDriverId,
          pickupPoint: newTripPickup || selectedRouteObj?.origin,
          dropPoint: newTripDrop || selectedRouteObj?.destination,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create trip.");
      }

      showAlert(`Trip ${data.trip.tripCode} scheduled successfully! Capacity: ${data.trip.capacity} seats.`, "success");
      setIsCreateTripOpen(false);
      refreshAllData();
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setSubmittingTrip(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. TRIP DETAIL & PASSENGER MANIFEST (Section 12)
  // ─────────────────────────────────────────────────────────────
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [manifestTrip, setManifestTrip] = useState<any | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const openTripManifest = async (tripId: string) => {
    setSelectedTripId(tripId);
    setLoadingManifest(true);
    try {
      const res = await fetch(`/api/transport/trips/${tripId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setManifestTrip(data.trip);
      } else {
        throw new Error(data.error || "Failed to load manifest.");
      }
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setLoadingManifest(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. TRIP STATUS TRANSITIONS (Section 30 & 31)
  // ─────────────────────────────────────────────────────────────
  const [delayModalTrip, setDelayModalTrip] = useState<TripItem | null>(null);
  const [delayMinutesInput, setDelayMinutesInput] = useState<number>(15);

  const handleStatusTransition = async (tripId: string, nextStatus: string, delayMins?: number) => {
    try {
      const res = await fetch(`/api/transport/trips/${tripId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          delayMinutes: delayMins,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid status transition.");
      }

      showAlert(`Trip status transitioned to ${nextStatus}`, "success");
      if (selectedTripId === tripId) {
        openTripManifest(tripId);
      }
      refreshAllData();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. QR SCANNER & BOARDING WORKFLOW (Sections 23 - 28)
  // ─────────────────────────────────────────────────────────────
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrTokenInput, setQrTokenInput] = useState("");
  const [qrTargetTripId, setQrTargetTripId] = useState<string>("");
  const [scanState, setScanState] = useState<
    "IDLE" | "SCANNING" | "RESOLVING" | "FOUND" | "WRONG_TRIP" | "ALREADY_BOARDED" | "NOT_FOUND" | "SUCCESS"
  >("IDLE");
  const [resolvedScanResult, setResolvedScanResult] = useState<any | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  const handleOpenQrScanner = (defaultTripId?: string) => {
    setQrTokenInput("");
    setScanState("IDLE");
    setResolvedScanResult(null);
    setShowOverrideInput(false);
    setOverrideReason("");
    if (defaultTripId) {
      setQrTargetTripId(defaultTripId);
    } else {
      const activeOrBoarding = trips.find((t) => ["BOARDING", "SCHEDULED", "IN_TRANSIT"].includes(t.status));
      setQrTargetTripId(activeOrBoarding?.id || (trips[0]?.id ?? ""));
    }
    setIsQrModalOpen(true);
  };

  const executeQrScan = async (tokenToResolve: string) => {
    if (!tokenToResolve.trim()) {
      showAlert("Please enter or scan a valid tournament QR pass token.", "error");
      return;
    }

    setScanState("RESOLVING");
    try {
      const res = await fetch("/api/transport/boarding/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: tokenToResolve.trim(),
          tripId: qrTargetTripId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setScanState("NOT_FOUND");
        showAlert(data.error || "QR token could not be resolved.", "error");
        return;
      }

      setResolvedScanResult(data);

      if (data.verification.alreadyBoarded) {
        setScanState("ALREADY_BOARDED");
      } else if (data.verification.isWrongTrip) {
        setScanState("WRONG_TRIP");
      } else {
        setScanState("FOUND");
      }
    } catch (err: any) {
      setScanState("NOT_FOUND");
      showAlert(err.message, "error");
    }
  };

  const handleMarkBoarded = async (isOverride: boolean = false) => {
    if (!resolvedScanResult || !qrTargetTripId) return;

    try {
      const res = await fetch("/api/transport/boarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: qrTargetTripId,
          participantId: resolvedScanResult.participant.id,
          isOverride,
          overrideReason: isOverride ? overrideReason || "Staff operational override" : undefined,
          pickupPoint: resolvedScanResult.assignment?.pickupPoint || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record boarding.");
      }

      setScanState("SUCCESS");
      showAlert(`BOARDED: ${resolvedScanResult.participant.name} verified and boarded!`, "success");
      if (selectedTripId) openTripManifest(selectedTripId);
      refreshAllData();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. NO-SHOW WORKFLOW (Section 28)
  // ─────────────────────────────────────────────────────────────
  const [noShowCandidate, setNoShowCandidate] = useState<{
    tripId: string;
    tripCode: string;
    participantId: string;
    participantName: string;
    pickupPoint: string;
  } | null>(null);

  const confirmMarkNoShow = async () => {
    if (!noShowCandidate) return;

    try {
      const res = await fetch("/api/transport/no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: noShowCandidate.tripId,
          participantId: noShowCandidate.participantId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to mark no-show.");
      }

      showAlert(`Marked ${noShowCandidate.participantName} as NO-SHOW.`, "warning");
      setNoShowCandidate(null);
      if (selectedTripId) openTripManifest(selectedTripId);
      refreshAllData();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. FIND PASSENGER & ASSIGNMENT WIZARD (Sections 19 - 22)
  // ─────────────────────────────────────────────────────────────
  const [isFindPassengerOpen, setIsFindPassengerOpen] = useState(false);
  const [passengerSearchQuery, setPassengerSearchQuery] = useState("");
  const [searchingPassengers, setSearchingPassengers] = useState(false);
  const [passengerSearchResults, setPassengerSearchResults] = useState<ParticipantSearchResult[]>([]);
  const [assignCandidate, setAssignCandidate] = useState<ParticipantSearchResult | null>(null);
  const [assignTargetTripId, setAssignTargetTripId] = useState("");
  const [assignPickupPoint, setAssignPickupPoint] = useState("");
  const [assignWizardStep, setAssignWizardStep] = useState<"SEARCH" | "SELECT_TRIP" | "REVIEW">("SEARCH");
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!passengerSearchQuery.trim() || passengerSearchQuery.trim().length < 2) {
      setPassengerSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPassengers(true);
      try {
        const res = await fetch(`/api/transport/passengers/search?q=${encodeURIComponent(passengerSearchQuery.trim())}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setPassengerSearchResults(data.participants || []);
        }
      } catch (err) {
        console.error("Passenger search failed:", err);
      } finally {
        setSearchingPassengers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [passengerSearchQuery]);

  const startAssignWizard = (athlete: ParticipantSearchResult) => {
    setAssignCandidate(athlete);
    const activeTrips = trips.filter((t) => !["ARRIVED", "CANCELLED"].includes(t.status));
    if (activeTrips.length > 0) {
      setAssignTargetTripId(activeTrips[0].id);
      setAssignPickupPoint(activeTrips[0].pickupPoint);
    }
    setAssignWizardStep("SELECT_TRIP");
  };

  const handleConfirmAssignment = async () => {
    if (!assignCandidate || !assignTargetTripId || !assignPickupPoint) {
      showAlert("Please select a trip and pickup point.", "error");
      return;
    }

    setSubmittingAssignment(true);
    try {
      const res = await fetch("/api/transport/passenger-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: assignTargetTripId,
          participantId: assignCandidate.id,
          pickupPoint: assignPickupPoint,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign passenger.");
      }

      showAlert(`SUCCESS: ${assignCandidate.name} assigned to ${data.assignment.trip.tripCode}!`, "success");
      setAssignWizardStep("SEARCH");
      setAssignCandidate(null);
      setIsFindPassengerOpen(false);
      if (selectedTripId) openTripManifest(selectedTripId);
      refreshAllData();
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. UNASSIGN PASSENGER
  // ─────────────────────────────────────────────────────────────
  const handleUnassignPassenger = async (bookingId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to unassign ${participantName} from this trip?`)) return;

    try {
      const res = await fetch(`/api/transport/passenger-assignments/${bookingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove passenger.");
      }

      showAlert(`Removed ${participantName} from manifest.`, "success");
      if (selectedTripId) openTripManifest(selectedTripId);
      refreshAllData();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 9. FILTERED TRIPS FOR TABLE & LIVE OPERATIONS
  // ─────────────────────────────────────────────────────────────
  const filteredTrips = trips.filter((t) => {
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    if (filterRoute !== "ALL" && t.routeId !== filterRoute) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.tripCode.toLowerCase().includes(q) ||
        t.routeName.toLowerCase().includes(q) ||
        t.vehicleNo.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeLiveTrips = trips.filter((t) => ["BOARDING", "DEPARTED", "IN_TRANSIT"].includes(t.status));

  // Quick helper to render status badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-[#0D243A] text-[#18D8D0] border border-[#18D8D0]/40">SCHEDULED</span>;
      case "BOARDING":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-[#3A2207] text-[#FFA826] border border-[#FFA826]/40 animate-pulse">BOARDING</span>;
      case "DEPARTED":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-[#2E1A05] text-[#FF5A16] border border-[#FF5A16]/40">DEPARTED</span>;
      case "IN_TRANSIT":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-[#072E24] text-emerald-400 border border-emerald-400/40">IN TRANSIT</span>;
      case "ARRIVED":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-[#051C14] text-emerald-500 border border-emerald-600/30">ARRIVED</span>;
      case "DELAYED":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-[#3A0707] text-rose-400 border border-rose-500/40 animate-pulse">DELAYED</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-neutral-900 text-neutral-400 border border-neutral-700">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-pixel bg-neutral-800 text-neutral-300">{status}</span>;
    }
  };

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-5 text-neutral-100">

        {/* ═══ GLOBAL ALERT BANNER ═══ */}
        {bannerAlert && (
          <div
            className={`flex items-center justify-between p-3.5 border-2 text-xs font-mono shadow-[2px_2px_0px_#000] ${
              bannerAlert.type === "success"
                ? "bg-[#07241A] border-emerald-400 text-emerald-300"
                : bannerAlert.type === "warning"
                ? "bg-[#2A1D05] border-[#FFA826] text-[#FFA826]"
                : "bg-[#2E0B0B] border-rose-500 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {bannerAlert.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {bannerAlert.type === "warning" && <AlertTriangle className="w-4 h-4 shrink-0 text-[#FFA826]" />}
              {bannerAlert.type === "error" && <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />}
              <span className="font-bold">{bannerAlert.message}</span>
            </div>
            <button
              onClick={() => setBannerAlert(null)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══ GLOBAL OPERATIONAL BANNER (UNIVERSITY-PROVIDED ZERO PAYMENT INVARIANT) ═══ */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="font-pixel text-[10px] text-[#FF5A16] uppercase tracking-wider font-bold">
                  SOUTH ZONE 2026 • UNIVERSITY TRANSPORT OPERATIONS
                </span>
                <span className="px-2 py-0.5 text-[8px] font-pixel bg-orange-50 text-[#FF5A16] border border-orange-200 rounded font-bold">
                  FREE SERVICE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 uppercase">
                TRANSPORT &amp; SHUTTLE FLEET LOGISTICS
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl font-mono">
                Official championship transport is <strong className="text-emerald-700">fully provided by the university</strong> at zero cost.
                Real-time operational dispatch: routes, pickup manifests, driver scheduling, and mobile QR boarding verification.
              </p>
            </div>

            {/* Operator Telemetry Capsule */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 shrink-0">
              <div className="w-8 h-8 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center text-[#FF5A16]">
                <Bus className="w-4 h-4" />
              </div>
              <div className="font-mono text-left">
                <div className="text-[9px] text-slate-400 uppercase font-bold">OPERATOR CLEARANCE</div>
                <div className="text-xs font-bold text-slate-900">
                  {user?.name || "Fleet Transport Manager"}
                </div>
                <div className="text-[9px] text-[#FF5A16] font-pixel font-bold">
                  {user?.email || "transport@szwbt2026.edu"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ PRIMARY ACTION BAR (ABOVE THE FOLD) ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={handleOpenCreateTrip}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FF5A16] hover:bg-[#e04808] text-white font-pixel text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ CREATE TRIP</span>
          </button>

          <button
            onClick={() => handleOpenQrScanner()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white font-pixel text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" />
            <span>SCAN QR / BOARD</span>
          </button>

          <button
            onClick={() => {
              setIsFindPassengerOpen(true);
              setAssignWizardStep("SEARCH");
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-pixel text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>FIND PASSENGER</span>
          </button>

          <button
            onClick={() => setActiveTab("LIVE")}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-pixel text-xs font-bold border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Radio className="w-4 h-4 animate-pulse text-[#FF5A16]" />
            <span>LIVE OPERATIONS</span>
          </button>
        </div>

        {/* ═══ DYNAMIC KPI STRIP ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">ACTIVE TRIPS</span>
            <span className="text-lg font-black font-mono text-orange-600 block">
              {kpis ? kpis.activeTrips : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Boarding / Transit</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">UPCOMING</span>
            <span className="text-lg font-black font-mono text-sky-600 block">
              {kpis ? kpis.upcomingTrips : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Scheduled</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">VEHICLES AVAIL</span>
            <span className="text-lg font-black font-mono text-emerald-600 block">
              {kpis ? kpis.vehiclesAvailable : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Ready in Depot</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">IN SERVICE</span>
            <span className="text-lg font-black font-mono text-[#FF5A16] block">
              {kpis ? kpis.vehiclesInService : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">On Active Route</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">ASSIGNED</span>
            <span className="text-lg font-black font-mono text-slate-900 block">
              {kpis ? kpis.passengersAssigned : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Athletes</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">BOARDED</span>
            <span className="text-lg font-black font-mono text-emerald-600 block">
              {kpis ? kpis.passengersBoarded : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Verified QR</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">REMAINING</span>
            <span className="text-lg font-black font-mono text-amber-600 block">
              {kpis ? kpis.passengersRemaining : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Pending</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
            <span className="text-[8px] font-pixel text-slate-500 block uppercase font-bold">NO-SHOWS</span>
            <span className="text-lg font-black font-mono text-rose-600 block">
              {kpis ? kpis.noShows : "—"}
            </span>
            <span className="text-[8px] font-mono text-slate-400">Marked Absent</span>
          </div>
        </div>

        {/* ═══ NAVIGATION TABS ═══ */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-0 scrollbar-none">
          {[
            { id: "OVERVIEW", label: "OVERVIEW", icon: <Bus className="w-3.5 h-3.5" /> },
            { id: "TRIPS", label: "TRIPS", icon: <Calendar className="w-3.5 h-3.5" />, badge: trips.length },
            { id: "ROUTES", label: "ROUTES", icon: <MapPin className="w-3.5 h-3.5" />, badge: routes.length },
            { id: "VEHICLES", label: "VEHICLES", icon: <Compass className="w-3.5 h-3.5" />, badge: vehicles.length },
            { id: "DRIVERS", label: "DRIVERS", icon: <User className="w-3.5 h-3.5" />, badge: drivers.length },
            { id: "PASSENGERS", label: "PASSENGERS", icon: <Users className="w-3.5 h-3.5" /> },
            { id: "BOARDING", label: "BOARDING", icon: <QrCode className="w-3.5 h-3.5" /> },
            { id: "LIVE", label: "LIVE OPERATIONS", icon: <Radio className="w-3.5 h-3.5" />, badge: activeLiveTrips.length },
            { id: "HISTORY", label: "HISTORY", icon: <History className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 font-pixel text-[10px] whitespace-nowrap transition-all border-b-2 -mb-[2px] rounded-t-lg cursor-pointer ${
                activeTab === tab.id
                  ? "bg-orange-50/50 text-[#FF5A16] font-bold border-[#FF5A16]"
                  : "bg-transparent text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold ${
                    activeTab === tab.id ? "bg-[#FF5A16] text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}

          <button
            onClick={refreshAllData}
            disabled={loading}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-pixel cursor-pointer shadow-xs transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#FF5A16]" : "text-slate-500"}`} />
            <span className="hidden sm:inline">SYNC</span>
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW (TODAY'S SCHEDULE — CARD 05 REFERENCE)    */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* Header matching Reference Card 05 */}
            <div className="flex items-center justify-between border-b border-[#18D8D0]/20 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="font-pixel text-xs text-[#FF5A16] uppercase font-bold tracking-wide">
                  TODAY&apos;S SCHEDULE &amp; RUNNING TRIPS
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-neutral-800 text-neutral-300">
                  {trips.length} SCHEDULED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenQrScanner()}
                  className="px-2.5 py-1 bg-[#18D8D0] hover:bg-[#34e2da] text-black font-pixel text-[10px] font-bold"
                >
                  QUICK QR SCAN
                </button>
                <button
                  onClick={handleOpenCreateTrip}
                  className="px-2.5 py-1 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[10px] font-bold"
                >
                  + NEW TRIP
                </button>
              </div>
            </div>

            {/* Today's Schedule Table (Card 05 Reference layout: Time | Route | Vehicle | Status) */}
            <div className="bg-[#050914] border-2 border-[#18D8D0]/40 overflow-hidden shadow-[3px_3px_0px_#000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#07101D] text-[#18D8D0] font-pixel text-[9px] uppercase border-b border-[#18D8D0]/30">
                    <tr>
                      <th className="py-2.5 px-3">TIME</th>
                      <th className="py-2.5 px-3">TRIP ID</th>
                      <th className="py-2.5 px-3">ROUTE</th>
                      <th className="py-2.5 px-3">VEHICLE</th>
                      <th className="py-2.5 px-3">DRIVER</th>
                      <th className="py-2.5 px-3 text-center">CAPACITY &amp; BOARDED</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-200">
                    {trips.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-500 font-mono text-xs">
                          NO TRIPS CURRENTLY SCHEDULED TODAY.
                        </td>
                      </tr>
                    ) : (
                      trips.map((trip) => {
                        const progressPercent =
                          trip.capacity > 0 ? Math.round((trip.boarded / trip.capacity) * 100) : 0;
                        return (
                          <tr key={trip.id} className="hover:bg-neutral-900/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[#F4E6CE] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#18D8D0]" />
                                <span>{trip.time}</span>
                              </div>
                              <span className="text-[9px] text-neutral-400 block">{trip.date}</span>
                            </td>

                            <td className="py-2.5 px-3 font-pixel text-[10px] text-[#FFA826] whitespace-nowrap">
                              {trip.tripCode}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#F4E6CE]">{trip.routeName}</div>
                              <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <span>{trip.pickupPoint}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-neutral-500 inline" />
                                <span>{trip.dropPoint}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-bold text-[#18D8D0]">{trip.vehicleNo}</span>
                              <span className="text-[9px] text-neutral-400 block">
                                {trip.capacity} Seats Physical
                              </span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-neutral-200">{trip.driverName}</span>
                              <span className="text-[9px] text-neutral-400 block">{trip.driverPhone}</span>
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="font-pixel text-[10px]">
                                <span className="text-emerald-400 font-bold">{trip.boarded}</span>
                                <span className="text-neutral-500"> / </span>
                                <span className="text-[#FFA826] font-bold">{trip.expected}</span>
                                <span className="text-neutral-500"> (Cap: {trip.capacity})</span>
                              </div>
                              {/* Progress bar */}
                              <div className="w-24 h-1.5 bg-neutral-800 border border-neutral-700 mx-auto mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400"
                                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                                />
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {renderStatusBadge(trip.status)}
                              {trip.delayMinutes > 0 && (
                                <span className="block text-[8px] font-pixel text-rose-400 mt-0.5">
                                  +{trip.delayMinutes} MIN DELAY
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openTripManifest(trip.id)}
                                  className="px-2 py-1 bg-[#0A1828] hover:bg-[#122A46] text-[#18D8D0] border border-[#18D8D0]/40 text-[9px] font-pixel"
                                  title="View passenger manifest"
                                >
                                  MANIFEST
                                </button>
                                <button
                                  onClick={() => handleOpenQrScanner(trip.id)}
                                  className="px-2 py-1 bg-[#07241A] hover:bg-[#0D382A] text-emerald-400 border border-emerald-400/40 text-[9px] font-pixel"
                                  title="Board passengers on this trip"
                                >
                                  BOARD
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Operational Dispatch Highlights (3 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Shuttle Routes */}
              <div className="bg-[#050914] border border-[#18D8D0]/30 p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#18D8D0]" />
                    <span className="font-pixel text-[10px] text-[#18D8D0] uppercase font-bold">
                      ACTIVE TRANSIT CORRIDORS
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{routes.length} Routes</span>
                </div>
                <div className="space-y-2.5">
                  {routes.slice(0, 3).map((r) => (
                    <div key={r.id} className="p-2 bg-neutral-900/60 border border-neutral-800 text-xs font-mono">
                      <div className="font-bold text-[#F4E6CE] flex items-center justify-between">
                        <span>{r.name}</span>
                        <span className="text-[#FFA826] font-pixel text-[9px]">{r.estimatedMinutes} MINS</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                        <span>{r.origin}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-neutral-600 inline" />
                        <span>{r.destination}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Fleet Status */}
              <div className="bg-[#050914] border border-[#18D8D0]/30 p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-[#FF5A16]" />
                    <span className="font-pixel text-[10px] text-[#FF5A16] uppercase font-bold">
                      FLEET DEPLOYMENT
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{vehicles.length} Units</span>
                </div>
                <div className="space-y-2">
                  {vehicles.slice(0, 3).map((v) => (
                    <div key={v.id} className="p-2 bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-[#18D8D0]">{v.registrationNumber}</div>
                        <div className="text-[9px] text-neutral-400">{v.type.replace("_", " ")} • Cap: {v.capacity}</div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 text-[8px] font-pixel ${
                          v.status === "AVAILABLE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : v.status === "IN_SERVICE"
                            ? "bg-[#2E1A05] text-[#FF5A16] border border-[#FF5A16]/30"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Free University Operational Service Guarantee */}
              <div className="bg-[#07101D] border-2 border-[#FFA826]/40 p-4 shadow-[2px_2px_0px_#000] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-[#FFA826]" />
                    <span className="font-pixel text-[10px] text-[#FFA826] uppercase font-bold">
                      OPERATIONAL PROTOCOL
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-mono text-[#F4E6CE] uppercase">
                    UNIVERSITY-PROVIDED TRANSIT
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-1 font-mono leading-relaxed">
                    Under tournament regulations, shuttle transport between Hubballi Airport, Hubballi Railway Junction,
                    Shalmala Hostel, Vindhya Hostel, and KLE Tech Indoor Arena is provided free of cost.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>DISPATCH CODE: DESK-04</span>
                  <span className="text-emerald-400 font-bold">ZERO FARE POLICY</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 2: TRIPS MANAGEMENT (SECTION 10 & 12)                 */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "TRIPS" && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="bg-[#050914] border border-[#18D8D0]/30 p-3 flex flex-wrap items-center justify-between gap-3 shadow-[2px_2px_0px_#000]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-pixel text-neutral-400 uppercase">STATUS:</span>
                {["ALL", "SCHEDULED", "BOARDING", "IN_TRANSIT", "ARRIVED", "DELAYED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2 py-1 text-[9px] font-pixel border ${
                      filterStatus === st
                        ? "bg-[#18D8D0] text-black border-[#18D8D0] font-bold"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search trips, vehicles, drivers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-neutral-900 border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 w-48 sm:w-60 focus:outline-none focus:border-[#18D8D0]"
                  />
                </div>
                <button
                  onClick={handleOpenCreateTrip}
                  className="px-3 py-1 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[10px] font-bold border border-black"
                >
                  + CREATE TRIP
                </button>
              </div>
            </div>

            {/* Trips List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-[#050914] border border-neutral-800 text-neutral-500 font-mono text-xs">
                  NO TRIPS MATCH THE SELECTED FILTERS.
                </div>
              ) : (
                filteredTrips.map((trip) => {
                  const progress = trip.capacity > 0 ? Math.round((trip.boarded / trip.capacity) * 100) : 0;
                  return (
                    <div
                      key={trip.id}
                      className="bg-[#050914] border-2 border-neutral-800 hover:border-[#18D8D0]/60 p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between transition-all"
                    >
                      <div>
                        {/* Header: Trip Code & Status */}
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-pixel text-xs text-[#FFA826] font-bold">{trip.tripCode}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">({trip.time})</span>
                          </div>
                          {renderStatusBadge(trip.status)}
                        </div>

                        {/* Route & Endpoints */}
                        <div className="mb-3">
                          <h4 className="font-mono text-sm font-bold text-[#F4E6CE]">{trip.routeName}</h4>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#18D8D0] shrink-0" />
                            <span className="truncate">{trip.pickupPoint}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-neutral-600 shrink-0 inline" />
                            <span className="truncate">{trip.dropPoint}</span>
                          </div>
                        </div>

                        {/* Fleet & Crew */}
                        <div className="grid grid-cols-2 gap-2 p-2 bg-neutral-900/60 border border-neutral-800 text-[11px] font-mono mb-3">
                          <div>
                            <span className="text-[8px] font-pixel text-[#91A0AE] block">VEHICLE</span>
                            <span className="font-bold text-[#18D8D0]">{trip.vehicleNo}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-pixel text-[#91A0AE] block">DRIVER</span>
                            <span className="text-neutral-200 truncate block">{trip.driverName}</span>
                          </div>
                        </div>

                        {/* Boarding stats */}
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-neutral-400">Boarding Progress</span>
                            <span className="font-bold text-emerald-400 font-pixel text-[9px]">
                              {trip.boarded} / {trip.capacity} BOARDED
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-900 border border-neutral-700 overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, progress)}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                            <span>{trip.remaining} Awaiting Boarding</span>
                            {trip.noShows > 0 && <span className="text-rose-400">{trip.noShows} No-Shows</span>}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openTripManifest(trip.id)}
                          className="flex-1 py-1.5 bg-[#0B1A2C] hover:bg-[#122A46] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-[9px] text-center"
                        >
                          OPEN MANIFEST
                        </button>

                        {/* Status Transition Button */}
                        {trip.status === "SCHEDULED" && (
                          <button
                            onClick={() => handleStatusTransition(trip.id, "BOARDING")}
                            className="px-2 py-1.5 bg-[#FFA826] hover:bg-[#ffb547] text-black font-pixel text-[9px] font-bold"
                          >
                            START BOARDING
                          </button>
                        )}
                        {trip.status === "BOARDING" && (
                          <button
                            onClick={() => handleStatusTransition(trip.id, "DEPARTED")}
                            className="px-2 py-1.5 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[9px] font-bold"
                          >
                            DEPART
                          </button>
                        )}
                        {trip.status === "DEPARTED" && (
                          <button
                            onClick={() => handleStatusTransition(trip.id, "IN_TRANSIT")}
                            className="px-2 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-pixel text-[9px] font-bold"
                          >
                            IN TRANSIT
                          </button>
                        )}
                        {trip.status === "IN_TRANSIT" && (
                          <button
                            onClick={() => handleStatusTransition(trip.id, "ARRIVED")}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-[9px] font-bold"
                          >
                            MARK ARRIVED
                          </button>
                        )}
                        {trip.status === "ARRIVED" && (
                          <span className="text-[9px] font-pixel text-emerald-500 py-1.5">COMPLETED</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 3: ROUTES & PICKUP POINTS (SECTIONS 13 & 14)          */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "ROUTES" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
              <div>
                <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                  TOURNAMENT TRANSIT CORRIDORS &amp; PICKUP STOPS
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Configured shuttle routes with sequential stops, timing offsets, and connected active trips.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="bg-[#050914] border-2 border-[#18D8D0]/40 p-4 shadow-[3px_3px_0px_#000]"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[#FF5A16] text-black font-pixel text-[9px] font-bold">
                        {route.code}
                      </span>
                      <h4 className="font-mono text-sm font-bold text-[#F4E6CE]">{route.name}</h4>
                    </div>
                    <span className="text-xs font-pixel text-[#FFA826]">{route.estimatedMinutes} MIN RUN</span>
                  </div>

                  {/* Route Visual Circuit (Section 13 layout: ORIGIN -> STOP 01 -> STOP 02 -> DESTINATION) */}
                  <div className="p-3 bg-neutral-950 border border-neutral-800 mb-4">
                    <div className="text-[9px] font-pixel text-[#91A0AE] uppercase mb-2">SEQUENTIAL STOP CIRCUIT:</div>
                    <div className="space-y-2">
                      {route.stops.map((stop, idx) => (
                        <div key={stop.id} className="flex items-center gap-2 text-xs font-mono">
                          <span className="w-5 h-5 bg-[#18D8D0]/10 border border-[#18D8D0]/40 text-[#18D8D0] font-pixel text-[9px] flex items-center justify-center shrink-0">
                            0{stop.orderIndex}
                          </span>
                          <span className="font-bold text-[#F4E6CE]">{stop.name}</span>
                          <span className="text-[10px] text-neutral-500 ml-auto">+{stop.expectedMinutes}m</span>
                          {idx < route.stops.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1 text-neutral-400">
                    <span>Active Trips: <strong className="text-emerald-400">{route.activeTripsCount}</strong></span>
                    <span>Total Scheduled: <strong className="text-white">{route.totalTripsCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 4: VEHICLES & FLEET (SECTION 15 & 16)                 */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "VEHICLES" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
              <div>
                <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                  OFFICIAL CHAMPIONSHIP FLEET REGISTRY
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Vehicle capacities are strictly derived from physical fleet specifications. ZERO arbitrary overbooking.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="bg-[#050914] border-2 border-neutral-800 hover:border-[#18D8D0]/60 p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                      <div>
                        <span className="font-mono text-base font-bold text-[#18D8D0]">{v.registrationNumber}</span>
                        <span className="text-[9px] text-neutral-400 font-pixel block">{v.type.replace("_", " ")}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-pixel ${
                          v.status === "AVAILABLE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : v.status === "IN_SERVICE"
                            ? "bg-[#2E1A05] text-[#FF5A16] border border-[#FF5A16]/40"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Physical Capacity:</span>
                        <span className="font-bold text-[#FFA826] font-pixel text-xs">{v.capacity} SEATS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Make &amp; Model:</span>
                        <span className="text-neutral-300 truncate max-w-[150px]">{v.makeModel || "Championship Fleet"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Current Trip:</span>
                        <span className="text-emerald-400 font-bold">{v.currentTrip ? v.currentTrip.tripCode : "None (In Depot)"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
                    <span>Registered Vehicle</span>
                    <span>University Fleet</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 5: DRIVERS (SECTION 17 & 18)                          */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "DRIVERS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
              <div>
                <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                  TOURNAMENT DRIVER ROSTER &amp; ROSTERING
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Duty status and current trip assignments with schedule conflict prevention.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((d) => (
                <div
                  key={d.id}
                  className="bg-[#050914] border-2 border-neutral-800 hover:border-[#18D8D0]/60 p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                      <div>
                        <h4 className="font-mono text-sm font-bold text-[#F4E6CE]">{d.name}</h4>
                        <span className="font-pixel text-[9px] text-[#FFA826]">{d.driverCode}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-pixel ${
                          d.status === "AVAILABLE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : d.status === "ASSIGNED"
                            ? "bg-[#2E1A05] text-[#FF5A16] border border-[#FF5A16]/40"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#18D8D0]" />
                          <span>Contact:</span>
                        </span>
                        <span className="text-neutral-200">{d.phone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">License:</span>
                        <span className="text-neutral-300 font-pixel text-[10px]">{d.licenseNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Active Assignment:</span>
                        <span className="text-emerald-400 font-bold">{d.currentTrip ? d.currentTrip.tripCode : "Standby"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
                    <span>Verified Chauffeur</span>
                    <span>Zero Overlap Safe</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 6: PASSENGERS & PARTICIPANT SEARCH (SECTIONS 19-22)   */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "PASSENGERS" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#18D8D0]/30 pb-3">
              <div>
                <h3 className="font-pixel text-xs text-[#FFA826] uppercase font-bold">
                  PARTICIPANT TRANSPORT DISPATCH &amp; LOOKUP
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Search registered tournament athletes and team managers to inspect or assign transport trips.
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, player ID, institution, team..."
                  value={passengerSearchQuery}
                  onChange={(e) => setPassengerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-900 border-2 border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-[#18D8D0]"
                />
              </div>
            </div>

            {/* Search results table */}
            <div className="bg-[#050914] border-2 border-neutral-800 overflow-hidden shadow-[3px_3px_0px_#000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#07101D] text-[#18D8D0] font-pixel text-[9px] uppercase border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3">PLAYER ID</th>
                      <th className="py-2.5 px-3">ATHLETE NAME</th>
                      <th className="py-2.5 px-3">INSTITUTION &amp; TEAM</th>
                      <th className="py-2.5 px-3">ACCOMMODATION</th>
                      <th className="py-2.5 px-3">CURRENT TRANSPORT</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-200">
                    {searchingPassengers ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400 font-mono text-xs">
                          SEARCHING PARTICIPANT REGISTRY...
                        </td>
                      </tr>
                    ) : passengerSearchResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-500 font-mono text-xs">
                          {passengerSearchQuery.trim()
                            ? "NO ATHLETES FOUND MATCHING QUERY."
                            : "TYPE AN ATHLETE NAME, INSTITUTION, OR PLAYER ID ABOVE TO SEARCH."}
                        </td>
                      </tr>
                    ) : (
                      passengerSearchResults.map((athlete) => (
                        <tr key={athlete.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="py-2.5 px-3 font-pixel text-[10px] text-[#FFA826] whitespace-nowrap">
                            {athlete.playerId}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                            {athlete.name}
                            <span className="block text-[10px] text-neutral-400 font-normal">{athlete.category}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-neutral-200">{athlete.institution}</div>
                            <div className="text-[10px] text-[#18D8D0]">{athlete.team?.name || "Independent"}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[10px] whitespace-nowrap">
                            {athlete.hostel ? (
                              <span className="text-emerald-400">{athlete.hostel} {athlete.room ? `(${athlete.room})` : ""}</span>
                            ) : (
                              <span className="text-neutral-500">Unallocated</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {athlete.currentAssignment ? (
                              <div>
                                <span className="font-pixel text-[9px] text-[#FF5A16]">
                                  {athlete.currentAssignment.tripCode}
                                </span>
                                <span className="text-[10px] text-neutral-400 block">
                                  {athlete.currentAssignment.pickupPoint}
                                </span>
                                <span
                                  className={`inline-block px-1.5 py-0.2 text-[8px] font-pixel ${
                                    athlete.currentAssignment.boardingStatus === "BOARDED"
                                      ? "bg-emerald-950 text-emerald-400"
                                      : "bg-amber-950 text-amber-400"
                                  }`}
                                >
                                  {athlete.currentAssignment.boardingStatus}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-500 text-[10px]">No trip assigned</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                startAssignWizard(athlete);
                                setIsFindPassengerOpen(true);
                              }}
                              className="px-2.5 py-1 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[9px] font-bold"
                            >
                              ASSIGN TRIP
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 7: BOARDING DESK (SECTIONS 23 - 28)                   */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "BOARDING" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: QR Station Controller */}
            <div className="bg-[#050914] border-2 border-[#18D8D0] p-5 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#18D8D0]" />
                  <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                    MOBILE QR BOARDING DISPATCH STATION
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-[8px] font-pixel bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  SCANNER ACTIVE
                </span>
              </div>

              {/* Trip Selector for Current Boarding Session */}
              <div className="mb-4">
                <label className="text-[9px] font-pixel text-neutral-400 block mb-1 uppercase">
                  SELECT TRIP CURRENTLY BOARDING:
                </label>
                <select
                  value={qrTargetTripId}
                  onChange={(e) => setQrTargetTripId(e.target.value)}
                  className="w-full p-2 bg-neutral-900 border border-neutral-700 text-xs font-mono text-[#F4E6CE] focus:outline-none focus:border-[#18D8D0]"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tripCode} • {t.time} • {t.routeName} ({t.boarded}/{t.capacity} Boarded) [{t.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Viewfinder simulation with pixel beam */}
              <div className="relative aspect-video bg-black border-2 border-neutral-800 flex flex-col items-center justify-center overflow-hidden mb-4 p-4 text-center">
                {/* Corner markers */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#18D8D0]" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#18D8D0]" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#18D8D0]" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#18D8D0]" />

                {/* Animated beam */}
                <div className="absolute inset-x-0 h-1 bg-[#18D8D0]/80 shadow-[0_0_12px_#18D8D0] animate-bounce" />

                <QrCode className="w-16 h-16 text-[#18D8D0]/40 animate-pulse mb-2" />
                <p className="font-pixel text-[10px] text-[#18D8D0] uppercase">
                  ALIGN PLAYER QR PASS WITH VIEWFINDER
                </p>
                <p className="text-[10px] font-mono text-neutral-500 mt-1">
                  Or enter token code below for manual dispatch verification
                </p>
              </div>

              {/* Manual token input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter QR token or Player ID (e.g. SZ-2026-102)..."
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeQrScan(qrTokenInput)}
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-[#18D8D0]"
                />
                <button
                  onClick={() => executeQrScan(qrTokenInput)}
                  className="px-4 py-2 bg-[#18D8D0] hover:bg-[#34e2da] text-black font-pixel text-xs font-bold border border-black"
                >
                  VERIFY
                </button>
              </div>
            </div>

            {/* Right: Verification & Boarding Resolution Box */}
            <div className="bg-[#050914] border-2 border-neutral-800 p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                  <h3 className="font-pixel text-xs text-neutral-300 uppercase font-bold">
                    PASSENGER RESOLUTION FEEDBACK
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">Status: {scanState}</span>
                </div>

                {scanState === "IDLE" && (
                  <div className="py-12 text-center text-neutral-500 font-mono text-xs">
                    WAITING FOR ATHLETE QR PASS SCAN...
                  </div>
                )}

                {scanState === "RESOLVING" && (
                  <div className="py-12 text-center text-[#18D8D0] font-pixel text-xs animate-pulse">
                    RESOLVING SECURE PARTICIPANT IDENTIFIER...
                  </div>
                )}

                {/* WRONG TRIP PROTECTION (Section 26) */}
                {scanState === "WRONG_TRIP" && resolvedScanResult && (
                  <div className="p-4 bg-[#2A1005] border-2 border-[#FF5A16] space-y-3">
                    <div className="flex items-center gap-2 text-[#FF5A16]">
                      <AlertOctagon className="w-5 h-5 shrink-0" />
                      <h4 className="font-pixel text-xs font-bold uppercase">
                        PASSENGER ASSIGNED TO ANOTHER TRIP
                      </h4>
                    </div>

                    <p className="text-xs font-mono text-neutral-200">
                      <strong>{resolvedScanResult.participant.name}</strong> ({resolvedScanResult.participant.playerId})
                      is booked on trip <strong className="text-[#FFA826]">{resolvedScanResult.verification.assignedTripCode}</strong>,
                      not current trip <strong className="text-[#18D8D0]">{resolvedScanResult.verification.targetTripCode}</strong>.
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-2 bg-black/60 text-[10px] font-mono border border-[#FF5A16]/30">
                      <div>
                        <span className="text-neutral-400 block">SCHEDULED TRIP:</span>
                        <span className="text-[#FFA826] font-bold">{resolvedScanResult.verification.assignedTripCode}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">CURRENT TRIP:</span>
                        <span className="text-[#18D8D0] font-bold">{resolvedScanResult.verification.targetTripCode}</span>
                      </div>
                    </div>

                    {showOverrideInput ? (
                      <div className="space-y-2 pt-2 border-t border-[#FF5A16]/30">
                        <label className="text-[9px] font-pixel text-neutral-300 block">
                          AUTHORIZED OVERRIDE REASON (AUDITED):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Early fixture reschedule / approved transfer"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-xs font-mono text-white"
                        />
                        <button
                          onClick={() => handleMarkBoarded(true)}
                          className="w-full py-2 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-xs font-bold"
                        >
                          CONFIRM OVERRIDE &amp; BOARD
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowOverrideInput(true)}
                        className="w-full py-2 bg-[#FFA826] hover:bg-[#ffb547] text-black font-pixel text-xs font-bold"
                      >
                        [ OVERRIDE ASSIGNMENT ]
                      </button>
                    )}
                  </div>
                )}

                {/* ALREADY BOARDED PROTECTION (Section 27) */}
                {scanState === "ALREADY_BOARDED" && resolvedScanResult && (
                  <div className="p-4 bg-[#1F2405] border-2 border-[#FFA826] space-y-2 text-xs font-mono">
                    <div className="flex items-center gap-2 text-[#FFA826]">
                      <AlertTriangle className="w-5 h-5" />
                      <h4 className="font-pixel text-xs font-bold uppercase">
                        PASSENGER ALREADY BOARDED
                      </h4>
                    </div>
                    <p className="text-neutral-200">
                      <strong>{resolvedScanResult.participant.name}</strong> was already scanned and boarded on this trip.
                    </p>
                    <div className="p-2 bg-black/60 border border-[#FFA826]/30 text-[10px] space-y-1">
                      <div>Boarded at: <strong>{resolvedScanResult.assignment?.boardedAt || "Earlier today"}</strong></div>
                      <div>Recorded by: <strong>{resolvedScanResult.assignment?.boardedBy || "Transport Staff"}</strong></div>
                    </div>
                  </div>
                )}

                {/* FOUND & READY TO BOARD (Section 25) */}
                {(scanState === "FOUND" || scanState === "SUCCESS") && resolvedScanResult && (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#07241A] border-2 border-emerald-400 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-pixel text-[10px] text-emerald-400">
                          {scanState === "SUCCESS" ? "BOARDING RECORDED" : "PASSENGER VERIFIED"}
                        </span>
                        <span className="text-[10px] font-pixel text-white bg-emerald-950 px-2 py-0.5">
                          {resolvedScanResult.participant.playerId}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-white">
                        {resolvedScanResult.participant.name}
                      </div>

                      <div className="text-xs font-mono text-neutral-300">
                        {resolvedScanResult.participant.institution} • {resolvedScanResult.participant.team?.name || "Independent"}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/30 text-[10px] font-mono">
                        <div>
                          <span className="text-neutral-400 block">PICKUP POINT:</span>
                          <span className="text-[#18D8D0] font-bold">
                            {resolvedScanResult.assignment?.pickupPoint || "Designated Stop"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block">TRIP:</span>
                          <span className="text-[#FFA826] font-bold">
                            {resolvedScanResult.assignment?.tripCode || "Current Trip"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {scanState === "FOUND" && (
                      <button
                        onClick={() => handleMarkBoarded(false)}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-pixel text-sm font-bold border-2 border-black shadow-[3px_3px_0px_#000]"
                      >
                        [ MARK BOARDED ]
                      </button>
                    )}

                    {scanState === "SUCCESS" && (
                      <button
                        onClick={() => {
                          setScanState("IDLE");
                          setQrTokenInput("");
                          setResolvedScanResult(null);
                        }}
                        className="w-full py-2.5 bg-[#18D8D0] text-black font-pixel text-xs font-bold"
                      >
                        SCAN NEXT PASSENGER
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
                <span>Cryptographic Opaque Verification</span>
                <span>Anti-Duplicate Protected</span>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 8: LIVE OPERATIONS (SECTION 29)                       */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "LIVE" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="font-pixel text-xs text-emerald-400 uppercase font-bold">
                  ACTIVE IN-TRANSIT &amp; BOARDING FLEET
                </h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {activeLiveTrips.length} Running Trips
              </span>
            </div>

            {activeLiveTrips.length === 0 ? (
              <div className="py-16 text-center bg-[#050914] border border-neutral-800 text-neutral-500 font-mono text-xs">
                NO TRIPS ARE CURRENTLY IN TRANSIT OR BOARDING.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLiveTrips.map((trip) => {
                  const progress = trip.capacity > 0 ? Math.round((trip.boarded / trip.capacity) * 100) : 0;
                  return (
                    <div
                      key={trip.id}
                      className="bg-[#050914] border-2 border-emerald-500/50 p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                          <div>
                            <span className="font-pixel text-xs text-[#FFA826] font-bold">{trip.tripCode}</span>
                            <span className="text-xs font-mono text-neutral-300 ml-2">Departed: {trip.time}</span>
                          </div>
                          {renderStatusBadge(trip.status)}
                        </div>

                        <h4 className="font-mono text-base font-bold text-white mb-1">{trip.routeName}</h4>

                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-3">
                          <MapPin className="w-3.5 h-3.5 text-[#18D8D0]" />
                          <span>{trip.pickupPoint}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-600 inline" />
                          <span>{trip.dropPoint}</span>
                        </div>

                        {/* Telemetry row */}
                        <div className="grid grid-cols-3 gap-2 p-2 bg-neutral-900/60 border border-neutral-800 text-center font-mono text-xs mb-3">
                          <div>
                            <span className="text-[8px] font-pixel text-neutral-400 block">VEHICLE</span>
                            <span className="font-bold text-[#18D8D0]">{trip.vehicleNo}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-pixel text-neutral-400 block">DRIVER</span>
                            <span className="text-neutral-200 truncate block">{trip.driverName}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-pixel text-neutral-400 block">BOARDED</span>
                            <span className="font-bold text-emerald-400">{trip.boarded} / {trip.capacity}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1 mb-4">
                          <div className="w-full h-2.5 bg-neutral-900 border border-neutral-700 overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, progress)}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                            <span>{progress}% Seated</span>
                            <span>{trip.capacity - trip.boarded} Seats Available</span>
                          </div>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                        <button
                          onClick={() => openTripManifest(trip.id)}
                          className="flex-1 py-1.5 bg-[#0B1A2C] text-[#18D8D0] font-pixel text-[9px] border border-[#18D8D0]/40"
                        >
                          MANIFEST
                        </button>
                        <button
                          onClick={() => handleOpenQrScanner(trip.id)}
                          className="flex-1 py-1.5 bg-[#18D8D0] text-black font-pixel text-[9px] font-bold"
                        >
                          BOARD
                        </button>
                        {trip.status !== "ARRIVED" && (
                          <button
                            onClick={() => handleStatusTransition(trip.id, "ARRIVED")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-[9px] font-bold"
                          >
                            MARK ARRIVED
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 9: TRANSPORT HISTORY & AUDIT TRAIL (SECTION 33 & 39)  */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === "HISTORY" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
              <div>
                <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                  TRANSPORT LOGS &amp; OPERATIONAL AUDIT TRAIL
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Immutable server-side logs for trip status changes, boarding scans, and passenger assignments.
                </p>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-[#050914] border-2 border-neutral-800 overflow-hidden shadow-[3px_3px_0px_#000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#07101D] text-[#18D8D0] font-pixel text-[9px] uppercase border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3">TIMESTAMP</th>
                      <th className="py-2.5 px-3">OPERATOR</th>
                      <th className="py-2.5 px-3">ACTION EVENT</th>
                      <th className="py-2.5 px-3">METADATA DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-neutral-500 font-mono text-xs">
                          NO RECENT TRANSPORT AUDIT LOGS RECORDED.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-900/40">
                          <td className="py-2 px-3 whitespace-nowrap text-neutral-400 text-[10px]">
                            {log.timestamp.replace("T", " ").slice(0, 19)}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-[#18D8D0]">
                            {log.actorEmail}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 text-[8px] font-pixel bg-neutral-900 border border-neutral-700 text-[#FFA826]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[10px] text-neutral-400 font-mono">
                            {log.metadata ? JSON.stringify(log.metadata) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 1: CREATE TRIP (SECTIONS 10 & 11)                   */}
        {/* ═════════════════════════════════════════════════════════ */}
        {isCreateTripOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050914] border-2 border-[#FF5A16] w-full max-w-xl shadow-[6px_6px_0px_#000] overflow-hidden">
              <div className="flex items-center justify-between p-3.5 bg-[#07101D] border-b border-[#FF5A16]/30">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-[#FF5A16]" />
                  <h3 className="font-pixel text-xs text-[#FF5A16] uppercase font-bold">
                    CREATE OPERATIONAL TRIP DISPATCH
                  </h3>
                </div>
                <button onClick={() => setIsCreateTripOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-mono">
                {createTripStep === "FORM" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-pixel text-neutral-400 block mb-1">DATE:</label>
                        <input
                          type="date"
                          value={newTripDate}
                          onChange={(e) => setNewTripDate(e.target.value)}
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-pixel text-neutral-400 block mb-1">DEPARTURE TIME:</label>
                        <input
                          type="text"
                          value={newTripTime}
                          onChange={(e) => setNewTripTime(e.target.value)}
                          placeholder="e.g. 08:30 IST"
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-pixel text-neutral-400 block mb-1">SELECT ROUTE:</label>
                      <select
                        value={newTripRouteId}
                        onChange={(e) => {
                          setNewTripRouteId(e.target.value);
                          const r = routes.find((rt) => rt.id === e.target.value);
                          if (r) {
                            setNewTripPickup(r.origin);
                            setNewTripDrop(r.destination);
                          }
                        }}
                        className="w-full p-2 bg-neutral-900 border border-neutral-700 text-[#F4E6CE]"
                      >
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code}: {r.name} ({r.estimatedMinutes} mins)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-pixel text-neutral-400 block mb-1">
                          SELECT VEHICLE (DERIVES CAPACITY):
                        </label>
                        <select
                          value={newTripVehicleId}
                          onChange={(e) => setNewTripVehicleId(e.target.value)}
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-[#18D8D0]"
                        >
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.registrationNumber} • {v.type} ({v.capacity} Seats) [{v.status}]
                            </option>
                          ))}
                        </select>
                        {selectedVehicleObj && (
                          <span className="text-[9px] font-mono text-emerald-400 mt-1 block">
                            Capacity: {selectedVehicleObj.capacity} seats (Derived from fleet)
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[9px] font-pixel text-neutral-400 block mb-1">SELECT DRIVER:</label>
                        <select
                          value={newTripDriverId}
                          onChange={(e) => setNewTripDriverId(e.target.value)}
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                        >
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.driverCode}) [{d.status}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-pixel text-neutral-400 block mb-1">PICKUP POINT:</label>
                        <input
                          type="text"
                          value={newTripPickup}
                          onChange={(e) => setNewTripPickup(e.target.value)}
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-pixel text-neutral-400 block mb-1">DROP POINT:</label>
                        <input
                          type="text"
                          value={newTripDrop}
                          onChange={(e) => setNewTripDrop(e.target.value)}
                          className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* REVIEW STEP (Section 11: TRIP REVIEW) */
                  <div className="space-y-3 p-4 bg-neutral-950 border border-neutral-800">
                    <h4 className="font-pixel text-[10px] text-[#FFA826] uppercase">CONFIRM TRIP SPECIFICATIONS</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-neutral-400">Date:</span> <strong>{newTripDate}</strong></div>
                      <div><span className="text-neutral-400">Departure:</span> <strong>{newTripTime}</strong></div>
                      <div><span className="text-neutral-400">Route:</span> <strong>{selectedRouteObj?.name}</strong></div>
                      <div><span className="text-neutral-400">Vehicle:</span> <strong>{selectedVehicleObj?.registrationNumber}</strong></div>
                      <div><span className="text-neutral-400">Driver:</span> <strong>{selectedDriverObj?.name}</strong></div>
                      <div><span className="text-neutral-400">Physical Capacity:</span> <strong className="text-emerald-400">{selectedVehicleObj?.capacity} seats</strong></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                  <button
                    onClick={() => setIsCreateTripOpen(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-pixel text-[10px]"
                  >
                    CANCEL
                  </button>

                  {createTripStep === "FORM" ? (
                    <button
                      onClick={() => setCreateTripStep("REVIEW")}
                      className="px-4 py-2 bg-[#18D8D0] hover:bg-[#34e2da] text-black font-pixel text-[10px] font-bold"
                    >
                      REVIEW TRIP ➔
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateTripSubmit}
                      disabled={submittingTrip}
                      className="px-5 py-2 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[10px] font-bold"
                    >
                      {submittingTrip ? "CREATING..." : "[ CONFIRM & CREATE TRIP ]"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 2: TRIP MANIFEST DRAWER (SECTION 12)                */}
        {/* ═════════════════════════════════════════════════════════ */}
        {selectedTripId && manifestTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050914] border-2 border-[#18D8D0] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[6px_6px_0px_#000] overflow-hidden">
              <div className="flex items-center justify-between p-3.5 bg-[#07101D] border-b border-[#18D8D0]/30 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#FF5A16] text-black font-pixel text-[9px] font-bold">
                    {manifestTrip.tripCode}
                  </span>
                  <h3 className="font-mono text-sm font-bold text-white uppercase">
                    PASSENGER MANIFEST &amp; CREW LOG
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedTripId(null);
                    setManifestTrip(null);
                  }}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trip header summary strip */}
              <div className="p-4 bg-neutral-950 border-b border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shrink-0">
                <div>
                  <span className="text-[8px] font-pixel text-neutral-400 block">ROUTE:</span>
                  <strong className="text-[#F4E6CE]">{manifestTrip.routeName}</strong>
                </div>
                <div>
                  <span className="text-[8px] font-pixel text-neutral-400 block">VEHICLE &amp; CREW:</span>
                  <strong className="text-[#18D8D0]">{manifestTrip.vehicleNo}</strong> • {manifestTrip.driverName}
                </div>
                <div>
                  <span className="text-[8px] font-pixel text-neutral-400 block">SEAT OCCUPANCY:</span>
                  <strong className="text-emerald-400 font-pixel text-xs">
                    {manifestTrip.boarded} / {manifestTrip.capacity}
                  </strong>{" "}
                  ({manifestTrip.remaining} pending)
                </div>
                <div className="flex items-center justify-end">
                  {renderStatusBadge(manifestTrip.status)}
                </div>
              </div>

              {/* Manifest table */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-pixel text-[10px] text-[#FFA826] uppercase">
                    PASSENGER LIST ({manifestTrip.manifest?.length || 0} ATHLETES ASSIGNED)
                  </h4>
                  <button
                    onClick={() => {
                      setIsFindPassengerOpen(true);
                      setAssignTargetTripId(manifestTrip.id);
                      setAssignPickupPoint(manifestTrip.pickupPoint);
                      setAssignWizardStep("SEARCH");
                    }}
                    className="px-2.5 py-1 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[9px] font-bold"
                  >
                    + ASSIGN ATHLETE
                  </button>
                </div>

                <div className="border border-neutral-800 overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-[#07101D] text-[#18D8D0] font-pixel text-[9px] uppercase border-b border-neutral-800">
                      <tr>
                        <th className="py-2 px-3">PLAYER ID</th>
                        <th className="py-2 px-3">NAME</th>
                        <th className="py-2 px-3">TEAM / INSTITUTION</th>
                        <th className="py-2 px-3">PICKUP POINT</th>
                        <th className="py-2 px-3 text-center">BOARDING STATUS</th>
                        <th className="py-2 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {manifestTrip.manifest?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-neutral-500 font-mono text-xs">
                            NO PASSENGERS CURRENTLY ASSIGNED TO THIS TRIP.
                          </td>
                        </tr>
                      ) : (
                        manifestTrip.manifest.map((p: ManifestPassenger) => (
                          <tr key={p.id} className="hover:bg-neutral-900/40">
                            <td className="py-2.5 px-3 font-pixel text-[10px] text-[#FFA826] whitespace-nowrap">
                              {p.playerId}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                              {p.name}
                              {p.isOverride && (
                                <span className="ml-1 text-[8px] font-pixel text-[#FFA826] bg-[#2E1A05] px-1 py-0.2">
                                  OVERRIDE
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div>{p.institution}</div>
                              <div className="text-[10px] text-neutral-400">{p.team}</div>
                            </td>
                            <td className="py-2.5 px-3 text-neutral-300 text-[11px] whitespace-nowrap">
                              {p.pickupPoint}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {p.boardingStatus === "BOARDED" ? (
                                <span className="px-2 py-0.5 text-[8px] font-pixel bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                  BOARDED
                                </span>
                              ) : p.boardingStatus === "NO_SHOW" ? (
                                <span className="px-2 py-0.5 text-[8px] font-pixel bg-rose-950 text-rose-400 border border-rose-500/30">
                                  NO-SHOW
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[8px] font-pixel bg-amber-950 text-amber-400 border border-amber-500/30">
                                  PENDING
                                </span>
                              )}
                              {p.boardedAt && (
                                <span className="block text-[8px] text-neutral-400">
                                  {p.boardedAt.slice(11, 16)} IST
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {p.boardingStatus === "PENDING" && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setQrTargetTripId(manifestTrip.id);
                                        executeQrScan(p.playerId || p.qrCode);
                                        setIsQrModalOpen(true);
                                      }}
                                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-black font-pixel text-[8px] font-bold"
                                    >
                                      BOARD
                                    </button>
                                    <button
                                      onClick={() =>
                                        setNoShowCandidate({
                                          tripId: manifestTrip.id,
                                          tripCode: manifestTrip.tripCode,
                                          participantId: p.participantId || p.id,
                                          participantName: p.name,
                                          pickupPoint: p.pickupPoint,
                                        })
                                      }
                                      className="px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800 text-rose-300 font-pixel text-[8px]"
                                    >
                                      NO-SHOW
                                    </button>
                                    <button
                                      onClick={() => handleUnassignPassenger(p.id, p.name)}
                                      className="p-1 text-neutral-500 hover:text-rose-400"
                                      title="Unassign passenger"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 3: NO-SHOW CONFIRMATION (SECTION 28)                 */}
        {/* ═════════════════════════════════════════════════════════ */}
        {noShowCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050914] border-2 border-rose-500 w-full max-w-md p-5 shadow-[6px_6px_0px_#000] text-xs font-mono space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-pixel text-xs font-bold uppercase">
                  CONFIRM PASSENGER NO-SHOW?
                </h4>
              </div>

              <p className="text-neutral-300">
                Are you sure you want to mark <strong>{noShowCandidate.participantName}</strong> as a NO-SHOW for trip{" "}
                <strong className="text-[#FFA826]">{noShowCandidate.tripCode}</strong> at pickup stop{" "}
                <strong className="text-[#18D8D0]">{noShowCandidate.pickupPoint}</strong>?
              </p>

              <div className="p-2.5 bg-black border border-neutral-800 text-[10px] text-neutral-400">
                This action is audited and will log your operator email timestamp.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  onClick={() => setNoShowCandidate(null)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-pixel text-[10px]"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmMarkNoShow}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-pixel text-[10px] font-bold"
                >
                  [ CONFIRM NO-SHOW ]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 4: QR BOARDING POPUP (FROM TOP BUTTON)              */}
        {/* ═════════════════════════════════════════════════════════ */}
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050914] border-2 border-[#18D8D0] w-full max-w-lg p-5 shadow-[6px_6px_0px_#000] space-y-4">
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#18D8D0]" />
                  <h4 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                    FIELD QR BOARDING SCANNER
                  </h4>
                </div>
                <button onClick={() => setIsQrModalOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[9px] font-pixel text-neutral-400 block mb-1">TARGET TRIP:</label>
                <select
                  value={qrTargetTripId}
                  onChange={(e) => setQrTargetTripId(e.target.value)}
                  className="w-full p-2 bg-neutral-900 border border-neutral-700 text-xs font-mono text-[#F4E6CE]"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tripCode} • {t.time} • {t.routeName} [{t.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Viewfinder simulation */}
              <div className="relative aspect-video bg-black border border-neutral-800 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                <div className="absolute inset-x-0 h-1 bg-[#18D8D0]/80 shadow-[0_0_12px_#18D8D0] animate-bounce" />
                <QrCode className="w-12 h-12 text-[#18D8D0]/40 animate-pulse mb-1" />
                <span className="font-pixel text-[10px] text-[#18D8D0]">ALIGN ATHLETE QR PASS</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter QR token or Player ID..."
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeQrScan(qrTokenInput)}
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 text-xs font-mono text-white"
                />
                <button
                  onClick={() => executeQrScan(qrTokenInput)}
                  className="px-4 py-2 bg-[#18D8D0] hover:bg-[#34e2da] text-black font-pixel text-xs font-bold"
                >
                  SCAN
                </button>
              </div>

              {scanState === "RESOLVING" && (
                <div className="p-3 bg-neutral-950 text-center text-[#18D8D0] font-pixel text-xs animate-pulse">
                  RESOLVING PARTICIPANT...
                </div>
              )}

              {/* Scan feedback results */}
              {scanState === "FOUND" && resolvedScanResult && (
                <div className="p-3 bg-[#07241A] border-2 border-emerald-400 space-y-2 text-xs font-mono">
                  <div className="font-bold text-white text-sm">{resolvedScanResult.participant.name}</div>
                  <div className="text-neutral-300">{resolvedScanResult.participant.institution}</div>
                  <button
                    onClick={() => handleMarkBoarded(false)}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-pixel text-xs font-bold"
                  >
                    [ MARK BOARDED ]
                  </button>
                </div>
              )}

              {scanState === "WRONG_TRIP" && resolvedScanResult && (
                <div className="p-3 bg-[#2A1005] border-2 border-[#FF5A16] text-xs font-mono space-y-2">
                  <div className="font-bold text-[#FF5A16]">WRONG TRIP WARNING</div>
                  <p className="text-neutral-300">
                    {resolvedScanResult.participant.name} is booked on {resolvedScanResult.verification.assignedTripCode}.
                  </p>
                  <button
                    onClick={() => handleMarkBoarded(true)}
                    className="w-full py-2 bg-[#FFA826] text-black font-pixel text-xs font-bold"
                  >
                    [ OVERRIDE &amp; BOARD ON THIS TRIP ]
                  </button>
                </div>
              )}

              {scanState === "ALREADY_BOARDED" && (
                <div className="p-3 bg-[#1F2405] border-2 border-[#FFA826] text-xs font-mono text-[#FFA826]">
                  PASSENGER ALREADY BOARDED ON THIS TRIP.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 5: ASSIGNMENT WIZARD (SECTION 21)                   */}
        {/* ═════════════════════════════════════════════════════════ */}
        {isFindPassengerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050914] border-2 border-[#FFA826] w-full max-w-xl p-5 shadow-[6px_6px_0px_#000] text-xs font-mono space-y-4">
              <div className="flex items-center justify-between border-b border-[#FFA826]/30 pb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#FFA826]" />
                  <h4 className="font-pixel text-xs text-[#FFA826] uppercase font-bold">
                    PASSENGER TRIP ASSIGNMENT WIZARD
                  </h4>
                </div>
                <button onClick={() => setIsFindPassengerOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {assignWizardStep === "SEARCH" && (
                <div className="space-y-3">
                  <label className="text-[9px] font-pixel text-neutral-400 block">SEARCH ATHLETE:</label>
                  <input
                    type="text"
                    placeholder="Search athlete by name, player ID, institution..."
                    value={passengerSearchQuery}
                    onChange={(e) => setPassengerSearchQuery(e.target.value)}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                  />

                  <div className="max-h-60 overflow-y-auto divide-y divide-neutral-800 border border-neutral-800">
                    {passengerSearchResults.map((ath) => (
                      <div
                        key={ath.id}
                        onClick={() => startAssignWizard(ath)}
                        className="p-2.5 hover:bg-neutral-900 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white">{ath.name}</div>
                          <div className="text-[10px] text-neutral-400">{ath.institution} • {ath.playerId}</div>
                        </div>
                        <button className="px-2 py-1 bg-[#FFA826] text-black font-pixel text-[9px] font-bold">
                          SELECT
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignWizardStep === "SELECT_TRIP" && assignCandidate && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-neutral-900 border border-neutral-800">
                    <span className="text-[8px] font-pixel text-[#91A0AE] block">ATHLETE SELECTED:</span>
                    <strong className="text-white text-sm">{assignCandidate.name}</strong>
                    <span className="text-[10px] text-neutral-400 block">{assignCandidate.institution}</span>
                  </div>

                  <div>
                    <label className="text-[9px] font-pixel text-neutral-400 block mb-1">SELECT TARGET TRIP:</label>
                    <select
                      value={assignTargetTripId}
                      onChange={(e) => {
                        setAssignTargetTripId(e.target.value);
                        const t = trips.find((tp) => tp.id === e.target.value);
                        if (t) setAssignPickupPoint(t.pickupPoint);
                      }}
                      className="w-full p-2 bg-neutral-900 border border-neutral-700 text-[#18D8D0]"
                    >
                      {trips.filter((t) => !["ARRIVED", "CANCELLED"].includes(t.status)).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.tripCode} • {t.time} • {t.routeName} ({t.expected}/{t.capacity} Seats Assigned)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-pixel text-neutral-400 block mb-1">PICKUP STOP:</label>
                    <input
                      type="text"
                      value={assignPickupPoint}
                      onChange={(e) => setAssignPickupPoint(e.target.value)}
                      className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => setAssignWizardStep("SEARCH")}
                      className="px-3 py-1.5 bg-neutral-800 text-neutral-300 font-pixel text-[10px]"
                    >
                      BACK
                    </button>
                    <button
                      onClick={() => setAssignWizardStep("REVIEW")}
                      className="px-4 py-1.5 bg-[#18D8D0] text-black font-pixel text-[10px] font-bold"
                    >
                      REVIEW ASSIGNMENT
                    </button>
                  </div>
                </div>
              )}

              {assignWizardStep === "REVIEW" && assignCandidate && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                    <h5 className="font-pixel text-[10px] text-[#FFA826]">CONFIRM ASSIGNMENT</h5>
                    <div>Athlete: <strong>{assignCandidate.name}</strong> ({assignCandidate.playerId})</div>
                    <div>Institution: <strong>{assignCandidate.institution}</strong></div>
                    <div>Target Trip: <strong>{trips.find((t) => t.id === assignTargetTripId)?.tripCode}</strong></div>
                    <div>Pickup Point: <strong className="text-[#18D8D0]">{assignPickupPoint}</strong></div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => setAssignWizardStep("SELECT_TRIP")}
                      className="px-3 py-1.5 bg-neutral-800 text-neutral-300 font-pixel text-[10px]"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleConfirmAssignment}
                      disabled={submittingAssignment}
                      className="px-4 py-1.5 bg-[#FF5A16] hover:bg-[#ff6f32] text-black font-pixel text-[10px] font-bold"
                    >
                      {submittingAssignment ? "CONFIRMING..." : "[ CONFIRM ASSIGNMENT ]"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
